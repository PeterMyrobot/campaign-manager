import { collection, getDocs, getDoc, doc, updateDoc, Timestamp, getCountFromServer, query, where, orderBy, limit, startAfter, type DocumentData, type QueryDocumentSnapshot, type QueryConstraint, writeBatch, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Invoice, InvoiceFilters } from "@/types/invoice";

const COLLECTION_NAME = 'invoices';

export interface PaginatedResponse<T> {
  data: T[];
  lastDoc?: unknown;
  totalCount?: number;
}

export const invoiceService = {
  // Get a single invoice by ID
  async getById(id: string): Promise<Invoice | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();

    return {
      id: docSnap.id,
      campaignId: data.campaignId,
      invoiceNumber: data.invoiceNumber,
      lineItemIds: data.lineItemIds || [],
      adjustmentIds: data.adjustmentIds || [],
      bookedAmount: data.bookedAmount || 0,
      actualAmount: data.actualAmount || 0,
      totalAdjustments: data.totalAdjustments || 0,
      totalAmount: data.totalAmount,
      currency: data.currency,
      issueDate: data.issueDate?.toDate(),
      dueDate: data.dueDate?.toDate(),
      paidDate: data.paidDate?.toDate() || null,
      status: data.status,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  },

  // Get total count of invoices matching filters
  async getTotalCount(filters?: Omit<InvoiceFilters, 'page' | 'pageSize' | 'cursor'>): Promise<number> {
    const constraints: QueryConstraint[] = [];

    if (filters?.campaignId) {
      constraints.push(where('campaignId', '==', filters.campaignId));
    }

    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }

    if (filters?.statuses && filters.statuses.length > 0) {
      constraints.push(where('status', 'in', filters.statuses));
    }

    // Date range filters - only ONE can be applied due to Firebase limitations
    // Priority: issueDateRange > dueDateRange > paidDateRange > createdDateRange
    if (filters?.issueDateRange?.from || filters?.issueDateRange?.to) {
      if (filters.issueDateRange.from) {
        constraints.push(where('issueDate', '>=', Timestamp.fromDate(filters.issueDateRange.from)));
      }
      if (filters.issueDateRange.to) {
        const endOfDay = new Date(filters.issueDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('issueDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters?.dueDateRange?.from || filters?.dueDateRange?.to) {
      if (filters.dueDateRange.from) {
        constraints.push(where('dueDate', '>=', Timestamp.fromDate(filters.dueDateRange.from)));
      }
      if (filters.dueDateRange.to) {
        const endOfDay = new Date(filters.dueDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('dueDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters?.paidDateRange?.from || filters?.paidDateRange?.to) {
      if (filters.paidDateRange.from) {
        constraints.push(where('paidDate', '>=', Timestamp.fromDate(filters.paidDateRange.from)));
      }
      if (filters.paidDateRange.to) {
        const endOfDay = new Date(filters.paidDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('paidDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters?.createdDateRange?.from || filters?.createdDateRange?.to) {
      if (filters.createdDateRange.from) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.createdDateRange.from)));
      }
      if (filters.createdDateRange.to) {
        const endOfDay = new Date(filters.createdDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      }
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getCountFromServer(q);

    return snapshot.data().count;
  },

  // Get invoices via filter with server-side pagination
  async getByFilter(filters: InvoiceFilters): Promise<PaginatedResponse<Invoice>> {
    const constraints: QueryConstraint[] = [];

    if (filters.campaignId) {
      constraints.push(where('campaignId', '==', filters.campaignId));
    }

    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }

    if (filters.statuses && filters.statuses.length > 0) {
      constraints.push(where('status', 'in', filters.statuses));
    }

    // Date range filters - only ONE can be applied due to Firebase limitations
    // Track which field is used for ordering
    let rangeFieldUsed: 'issueDate' | 'dueDate' | 'paidDate' | 'createdAt' | null = null;

    if (filters.issueDateRange?.from || filters.issueDateRange?.to) {
      rangeFieldUsed = 'issueDate';
      if (filters.issueDateRange.from) {
        constraints.push(where('issueDate', '>=', Timestamp.fromDate(filters.issueDateRange.from)));
      }
      if (filters.issueDateRange.to) {
        const endOfDay = new Date(filters.issueDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('issueDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters.dueDateRange?.from || filters.dueDateRange?.to) {
      rangeFieldUsed = 'dueDate';
      if (filters.dueDateRange.from) {
        constraints.push(where('dueDate', '>=', Timestamp.fromDate(filters.dueDateRange.from)));
      }
      if (filters.dueDateRange.to) {
        const endOfDay = new Date(filters.dueDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('dueDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters.paidDateRange?.from || filters.paidDateRange?.to) {
      rangeFieldUsed = 'paidDate';
      if (filters.paidDateRange.from) {
        constraints.push(where('paidDate', '>=', Timestamp.fromDate(filters.paidDateRange.from)));
      }
      if (filters.paidDateRange.to) {
        const endOfDay = new Date(filters.paidDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('paidDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters.createdDateRange?.from || filters.createdDateRange?.to) {
      rangeFieldUsed = 'createdAt';
      if (filters.createdDateRange.from) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.createdDateRange.from)));
      }
      if (filters.createdDateRange.to) {
        const endOfDay = new Date(filters.createdDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      }
    }

    // Must order by the range field when using date range filters
    if (rangeFieldUsed) {
      constraints.push(orderBy(rangeFieldUsed, 'desc'));
    }

    // Pagination
    const pageSize = filters.pageSize || 10;
    constraints.push(limit(pageSize));

    // Cursor-based pagination
    if (filters.cursor) {
      constraints.push(startAfter(filters.cursor as QueryDocumentSnapshot<DocumentData>));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    // Convert Firestore documents to Invoice objects
    const invoices: Invoice[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        campaignId: data.campaignId,
        invoiceNumber: data.invoiceNumber,
        lineItemIds: data.lineItemIds || [],
        adjustmentIds: data.adjustmentIds || [],
        bookedAmount: data.bookedAmount || 0,
        actualAmount: data.actualAmount || 0,
        totalAdjustments: data.totalAdjustments || 0,
        totalAmount: data.totalAmount,
        currency: data.currency,
        issueDate: data.issueDate?.toDate(),
        dueDate: data.dueDate?.toDate(),
        paidDate: data.paidDate?.toDate() || null,
        status: data.status,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
    });

    // Get last document for cursor-based pagination
    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : undefined;

    return {
      data: invoices,
      lastDoc,
    };
  },

  // Update invoice amounts (booked, actual, adjustments, total)
  async updateAmounts(id: string, amounts: { bookedAmount: number; actualAmount: number; totalAdjustments: number; totalAmount: number }): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      bookedAmount: amounts.bookedAmount,
      actualAmount: amounts.actualAmount,
      totalAdjustments: amounts.totalAdjustments,
      totalAmount: amounts.totalAmount,
      updatedAt: Timestamp.now(),
    });
  },

  // Update invoice status
  async updateStatus(id: string, status: Invoice['status'], paidDate?: Date | null): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updates: Record<string, unknown> = {
      status,
      updatedAt: Timestamp.now(),
    };

    // Update paidDate if status is 'paid'
    if (status === 'paid' && paidDate) {
      updates.paidDate = Timestamp.fromDate(paidDate);
    } else if (status !== 'paid') {
      updates.paidDate = null;
    }

    await updateDoc(docRef, updates);
  },

  // Create new invoice from line items
  async createFromLineItems(params: {
    campaignId: string;
    lineItemIds: string[];
    clientName: string;
    clientEmail: string;
    issueDate: Date;
    dueDate: Date;
    currency: string;
    bookedAmount: number;
    actualAmount: number;
    totalAdjustments: number;
    totalAmount: number;
  }): Promise<string> {
    const batch = writeBatch(db);

    // Generate invoice number (simple incremental for now, can be enhanced)
    const invoiceNumber = `INV-${Date.now()}`;

    // Create invoice document
    const invoiceRef = doc(collection(db, COLLECTION_NAME));
    batch.set(invoiceRef, {
      campaignId: params.campaignId,
      invoiceNumber,
      lineItemIds: params.lineItemIds,
      adjustmentIds: [],
      bookedAmount: params.bookedAmount,
      actualAmount: params.actualAmount,
      totalAdjustments: params.totalAdjustments,
      totalAmount: params.totalAmount,
      currency: params.currency,
      issueDate: Timestamp.fromDate(params.issueDate),
      dueDate: Timestamp.fromDate(params.dueDate),
      paidDate: null,
      status: 'draft',
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Update each line item with the invoiceId
    params.lineItemIds.forEach(lineItemId => {
      const lineItemRef = doc(db, 'lineItems', lineItemId);
      batch.update(lineItemRef, {
        invoiceId: invoiceRef.id,
        updatedAt: Timestamp.now(),
      });
    });

    // Update campaign with the new invoiceId
    const campaignRef = doc(db, 'campaigns', params.campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (campaignSnap.exists()) {
      const currentInvoiceIds = campaignSnap.data().invoiceIds || [];
      batch.update(campaignRef, {
        invoiceIds: [...currentInvoiceIds, invoiceRef.id],
        updatedAt: Timestamp.now(),
      });
    }

    await batch.commit();
    return invoiceRef.id;
  },

  // Add line items to an existing invoice
  async addLineItems(params: {
    invoiceId: string;
    lineItemIds: string[];
  }): Promise<void> {
    const batch = writeBatch(db);

    // Get the invoice to verify it exists and get current lineItemIds
    const invoiceRef = doc(db, COLLECTION_NAME, params.invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }

    const invoiceData = invoiceSnap.data();
    const currentLineItemIds = invoiceData.lineItemIds || [];

    // Filter out line items that are already in the invoice
    const newLineItemIds = params.lineItemIds.filter(id => !currentLineItemIds.includes(id));

    if (newLineItemIds.length === 0) {
      throw new Error('All selected line items are already in this invoice');
    }

    // Update invoice with new line item IDs
    batch.update(invoiceRef, {
      lineItemIds: [...currentLineItemIds, ...newLineItemIds],
      updatedAt: Timestamp.now(),
    });

    // Update each new line item with the invoiceId
    newLineItemIds.forEach(lineItemId => {
      const lineItemRef = doc(db, 'lineItems', lineItemId);
      batch.update(lineItemRef, {
        invoiceId: params.invoiceId,
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();
  },

  // Move line items from one invoice to another
  async moveLineItems(params: {
    fromInvoiceId: string;
    toInvoiceId: string;
    lineItemIds: string[];
  }): Promise<void> {
    const batch = writeBatch(db);

    // Get both invoices to verify they exist
    const fromInvoiceRef = doc(db, COLLECTION_NAME, params.fromInvoiceId);
    const toInvoiceRef = doc(db, COLLECTION_NAME, params.toInvoiceId);

    const [fromInvoiceSnap, toInvoiceSnap] = await Promise.all([
      getDoc(fromInvoiceRef),
      getDoc(toInvoiceRef),
    ]);

    if (!fromInvoiceSnap.exists()) {
      throw new Error('Source invoice not found');
    }

    if (!toInvoiceSnap.exists()) {
      throw new Error('Destination invoice not found');
    }

    const fromInvoiceData = fromInvoiceSnap.data();
    const toInvoiceData = toInvoiceSnap.data();

    const fromLineItemIds = fromInvoiceData.lineItemIds || [];
    const toLineItemIds = toInvoiceData.lineItemIds || [];

    // Verify all line items are in the source invoice
    const invalidItems = params.lineItemIds.filter(id => !fromLineItemIds.includes(id));
    if (invalidItems.length > 0) {
      throw new Error('Some line items are not in the source invoice');
    }

    // Check if any items are already in destination
    const duplicates = params.lineItemIds.filter(id => toLineItemIds.includes(id));
    if (duplicates.length > 0) {
      throw new Error('Some line items are already in the destination invoice');
    }

    // Fetch line item details for change log
    const lineItemDocs = await Promise.all(
      params.lineItemIds.map((id: string) => getDoc(doc(db, 'lineItems', id)))
    );

    // Remove line items from source invoice
    const newFromLineItemIds = fromLineItemIds.filter(id => !params.lineItemIds.includes(id));
    batch.update(fromInvoiceRef, {
      lineItemIds: newFromLineItemIds,
      updatedAt: Timestamp.now(),
    });

    // Add line items to destination invoice
    batch.update(toInvoiceRef, {
      lineItemIds: [...toLineItemIds, ...params.lineItemIds],
      updatedAt: Timestamp.now(),
    });

    // Update each line item's invoiceId
    params.lineItemIds.forEach(lineItemId => {
      const lineItemRef = doc(db, 'lineItems', lineItemId);
      batch.update(lineItemRef, {
        invoiceId: params.toInvoiceId,
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();

    // Create change log entries for each moved line item
    // These are created AFTER the batch commit to ensure the move operation succeeds first
    const changeLogPromises = lineItemDocs.map(async (lineItemSnap) => {
      if (!lineItemSnap.exists()) return;

      const lineItemData = lineItemSnap.data();

      await addDoc(collection(db, 'changeLogs'), {
        entityType: 'line_item',
        entityId: lineItemSnap.id,
        changeType: 'line_item_moved',

        // Amount tracking (unchanged by move, using current values)
        previousAmount: lineItemData.adjustments || 0,
        newAmount: lineItemData.adjustments || 0,
        difference: 0,

        // Reference amounts at time of move
        bookedAmountAtTime: lineItemData.bookedAmount || 0,
        actualAmountAtTime: lineItemData.actualAmount || 0,

        // Metadata
        comment: `Line item moved from invoice ${fromInvoiceData.invoiceNumber} to ${toInvoiceData.invoiceNumber}`,
        userName: 'System',
        timestamp: Timestamp.now(),

        // Related entities (destination invoice)
        invoiceId: params.toInvoiceId,
        invoiceNumber: toInvoiceData.invoiceNumber,
        campaignId: lineItemData.campaignId || fromInvoiceData.campaignId,
        lineItemName: lineItemData.name,

        // Line item move specific fields
        previousInvoiceId: params.fromInvoiceId,
        previousInvoiceNumber: fromInvoiceData.invoiceNumber,
      });
    });

    await Promise.all(changeLogPromises);
  },
}
