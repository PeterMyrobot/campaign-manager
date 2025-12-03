// Load environment variables FIRST before any Firebase imports
import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { Timestamp } from 'firebase/firestore';
import { db } from './firebase.node';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import placementsData from './placements_teaser_data.json';

interface PlacementData {
  id: number;
  campaign_id: number;
  campaign_name: string;
  line_item_name: string;
  booked_amount: number;
  actual_amount: number;
  adjustments: number;
}

interface CampaignData {
  campaign_id: number;
  campaign_name: string;
  total_booked: number;
  total_actual: number;
  total_adjustments: number;
  line_items: PlacementData[];
}

// Group placements by campaign
function groupByCampaign(placements: PlacementData[]): Map<number, CampaignData> {
  const campaigns = new Map<number, CampaignData>();

  placements.forEach((placement) => {
    if (!campaigns.has(placement.campaign_id)) {
      campaigns.set(placement.campaign_id, {
        campaign_id: placement.campaign_id,
        campaign_name: placement.campaign_name,
        total_booked: 0,
        total_actual: 0,
        total_adjustments: 0,
        line_items: [],
      });
    }

    const campaign = campaigns.get(placement.campaign_id)!;
    campaign.total_booked += placement.booked_amount;
    campaign.total_actual += placement.actual_amount;
    campaign.total_adjustments += placement.adjustments;
    campaign.line_items.push(placement);
  });

  return campaigns;
}

// Generate random date within a range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Clear all existing data
async function clearCollection(collectionName: string): Promise<void> {
  const snapshot = await getDocs(collection(db, collectionName));
  const deletePromises = snapshot.docs.map((document) =>
    deleteDoc(doc(db, collectionName, document.id))
  );
  await Promise.all(deletePromises);
}

// Clear all data from the database
async function clearAllData(): Promise<void> {
  console.log('Clearing existing data...');
  await clearCollection('campaigns');
  await clearCollection('invoices');
  await clearCollection('lineItems');
  console.log('All existing data cleared.');
}

// Seed campaigns, line items, and invoices from placements data
async function seedFromPlacements(): Promise<void> {
  console.log('Seeding data from placements file...');

  // Limit to first 30 records for testing
  const limitedData = (placementsData as PlacementData[]).slice(0, 200);
  console.log(`Using first ${limitedData.length} records for testing`);

  const groupedCampaigns = groupByCampaign(limitedData);
  console.log(`Found ${groupedCampaigns.size} unique campaigns`);

  const campaignStatuses = ['draft', 'active', 'completed', 'cancelled'] as const;
  const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;

  const clients = [
    { name: 'Acme Corporation', email: 'billing@acme.com' },
    { name: 'Tech Solutions Inc', email: 'accounts@techsolutions.com' },
    { name: 'Global Brands Ltd', email: 'finance@globalbrands.com' },
    { name: 'Digital Media Co', email: 'invoices@digitalmedia.com' },
    { name: 'Creative Agency', email: 'billing@creativeagency.com' },
    { name: 'Marketing Pro', email: 'accounts@marketingpro.com' },
  ];

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const threeMonthsAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  let campaignCount = 0;
  let lineItemCount = 0;
  let invoiceCount = 0;

  for (const [, campaignData] of groupedCampaigns) {
    // Create campaign
    const startDate = randomDate(sixMonthsAgo, now);
    const endDate = randomDate(startDate, threeMonthsAhead);
    const status = campaignStatuses[Math.floor(Math.random() * campaignStatuses.length)];

    const campaignDocRef = await addDoc(collection(db, 'campaigns'), {
      name: campaignData.campaign_name,
      lineItemIds: [],
      invoiceIds: [],
      status,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    campaignCount++;

    // Create line items for this campaign
    const lineItemIds: string[] = [];

    for (const lineItemData of campaignData.line_items) {
      const lineItemDocRef = await addDoc(collection(db, 'lineItems'), {
        campaignId: campaignDocRef.id,
        name: lineItemData.line_item_name,
        bookedAmount: lineItemData.booked_amount,
        actualAmount: lineItemData.actual_amount,
        adjustments: lineItemData.adjustments,
        invoiceId: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      lineItemIds.push(lineItemDocRef.id);
      lineItemCount++;
    }

    // Create 1-3 invoices per campaign
    const numInvoices = Math.min(Math.floor(Math.random() * 3) + 1, lineItemIds.length);
    const invoiceIds: string[] = [];

    // Shuffle line items and only assign 70-80% to invoices (leaving some unassigned)
    const shuffledLineItems = [...lineItemIds].sort(() => Math.random() - 0.5);
    const assignmentPercentage = 0.7 + Math.random() * 0.1; // 70-80%
    const lineItemsToAssign = shuffledLineItems.slice(
      0,
      Math.floor(shuffledLineItems.length * assignmentPercentage)
    );
    const itemsPerInvoice = Math.ceil(lineItemsToAssign.length / numInvoices);

    for (let i = 0; i < numInvoices; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const issueDate = randomDate(startDate, endDate);
      const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const invoiceStatus = invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];

      // Assign line items to this invoice (only from the subset we're assigning)
      const invoiceLineItemIds = lineItemsToAssign.slice(
        i * itemsPerInvoice,
        (i + 1) * itemsPerInvoice
      );

      // Calculate total amount from assigned line items
      let totalAmount = 0;
      for (const lineItemId of invoiceLineItemIds) {
        const lineItemIndex = lineItemIds.indexOf(lineItemId);
        if (lineItemIndex !== -1) {
          const lineItem = campaignData.line_items[lineItemIndex];
          totalAmount += lineItem.actual_amount + lineItem.adjustments;
        }
      }

      // Make overdue invoices have a past due date
      if (invoiceStatus === 'overdue') {
        dueDate.setTime(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      }

      const invoiceDocRef = await addDoc(collection(db, 'invoices'), {
        campaignId: campaignDocRef.id,
        invoiceNumber: `INV-${now.getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`,
        lineItemIds: invoiceLineItemIds,
        adjustmentIds: [],
        totalAmount: Math.round(totalAmount * 100) / 100,
        currency: 'USD',
        issueDate: Timestamp.fromDate(issueDate),
        dueDate: Timestamp.fromDate(dueDate),
        paidDate:
          invoiceStatus === 'paid'
            ? Timestamp.fromDate(
                new Date(dueDate.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000)
              )
            : null,
        status: invoiceStatus,
        clientName: client.name,
        clientEmail: client.email,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      invoiceIds.push(invoiceDocRef.id);
      invoiceCount++;

      // Update line items with invoice ID
      for (const lineItemId of invoiceLineItemIds) {
        const lineItemRef = doc(db, 'lineItems', lineItemId);
        await updateDoc(lineItemRef, {
          invoiceId: invoiceDocRef.id,
          updatedAt: Timestamp.now(),
        });
      }
    }

    // Update campaign with line item and invoice IDs
    const campaignRef = doc(db, 'campaigns', campaignDocRef.id);
    await updateDoc(campaignRef, {
      lineItemIds,
      invoiceIds,
      updatedAt: Timestamp.now(),
    });

    // Log progress every 10 campaigns
    if (campaignCount % 10 === 0) {
      console.log(
        `Progress: ${campaignCount} campaigns, ${lineItemCount} line items, ${invoiceCount} invoices created...`
      );
    }
  }

  console.log(`\n✅ Seeding completed!`);
  console.log(
    `📊 Created ${campaignCount} campaigns, ${lineItemCount} line items, and ${invoiceCount} invoices`
  );
}

// Main seed function
async function seed(): Promise<void> {
  try {
    console.log('🌱 Starting seed process...\n');

    // Clear existing data
    await clearAllData();

    // Seed from placements data
    await seedFromPlacements();

    console.log('\n✨ Seed process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seed process:', error);
    process.exit(1);
  }
}

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export { seed, clearAllData, seedFromPlacements };
