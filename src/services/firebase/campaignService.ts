import { collection, getDocs, getCountFromServer, orderBy, query, where, Timestamp, limit, startAfter, type DocumentData, type QueryDocumentSnapshot, type QueryConstraint } from "firebase/firestore";
import { db } from "./firebase";
import type { Campaign, CampaignFilters } from "@/types/campaign";

const COLLECTION_NAME = 'campaigns';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
  firstDoc?: QueryDocumentSnapshot<DocumentData>;
}

// Helper function to build server-side Firestore query constraints
function buildServerSideConstraints(filters: CampaignFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  // Status filter (match any of the selected statuses)
  if (filters.status && filters.status.length > 0) {
    constraints.push(where('status', 'in', filters.status));
  }

  // Start date range filter
  if (filters.startDateRange) {
    if (filters.startDateRange.from) {
      constraints.push(where('startDate', '>=', Timestamp.fromDate(filters.startDateRange.from)));
    }
    if (filters.startDateRange.to) {
      const endOfDay = new Date(filters.startDateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      constraints.push(where('startDate', '<=', Timestamp.fromDate(endOfDay)));
    }
  }

  // End date range filter
  if (filters.endDateRange) {
    if (filters.endDateRange.from) {
      constraints.push(where('endDate', '>=', Timestamp.fromDate(filters.endDateRange.from)));
    }
    if (filters.endDateRange.to) {
      const endOfDay = new Date(filters.endDateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      constraints.push(where('endDate', '<=', Timestamp.fromDate(endOfDay)));
    }
  }

  // Created date range filter
  if (filters.createdDateRange) {
    if (filters.createdDateRange.from) {
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.createdDateRange.from)));
    }
    if (filters.createdDateRange.to) {
      const endOfDay = new Date(filters.createdDateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
    }
  }

  return constraints;
}

// Helper function to apply client-side filters
// Note: These filters cannot be done efficiently in Firestore queries
function applyClientSideFilters(campaigns: Campaign[], filters: CampaignFilters): Campaign[] {
  let results = [...campaigns];

  // Name filter (case-insensitive partial match)
  // Firestore doesn't support case-insensitive LIKE queries
  if (filters.name) {
    const searchTerm = filters.name.toLowerCase();
    results = results.filter(campaign =>
      campaign.name.toLowerCase().includes(searchTerm)
    );
  }

  return results;
}


export const campaignService = {
  
  // Get all campaigns
  async getAll(): Promise<Campaign[]> {
    const querySnapshot = await getDocs(
      query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Campaign[];
  },

  // Get total count of campaigns with optional filters
  // Note: Only server-side filters are applied (excludes name filter)
  async getTotalCount(filters?: CampaignFilters): Promise<number> {
    const constraints = filters ? buildServerSideConstraints(filters) : [];
    const countQuery = query(collection(db, COLLECTION_NAME), ...constraints);
    const countSnapshot = await getCountFromServer(countQuery);
    return countSnapshot.data().count;
  },

  // Get campaigns via filter with server-side pagination
  async getByFilter(filters: CampaignFilters): Promise<PaginatedResponse<Campaign>> {
    console.log('get campaigns by filter', filters)

    const pageSize = filters.pageSize ?? 10;
    const page = filters.page ?? 0;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    // ===== SERVER-SIDE FILTERING =====
    // Build Firestore query constraints
    const constraints = buildServerSideConstraints(filters);

    // Add sorting - required for pagination
    constraints.push(orderBy(sortBy, sortOrder));

    // Get total count for the filtered query
    const countQuery = query(collection(db, COLLECTION_NAME), ...constraints);
    const countSnapshot = await getCountFromServer(countQuery);
    const total = countSnapshot.data().count;

    // ===== SERVER-SIDE PAGINATION =====
    // Build paginated query with cursor and limit
    const paginatedConstraints: QueryConstraint[] = [...constraints];

    // Add cursor if provided (for navigation)
    if (filters.cursor) {
      paginatedConstraints.push(startAfter(filters.cursor));
    }

    // Fetch one extra to determine if there's a next page
    paginatedConstraints.push(limit(pageSize + 1));

    const paginatedQuery = query(collection(db, COLLECTION_NAME), ...paginatedConstraints);
    const querySnapshot = await getDocs(paginatedQuery);

    // Check if there's a next page
    const hasNextPage = querySnapshot.docs.length > pageSize;

    // Get only the requested page size
    const docs = hasNextPage ? querySnapshot.docs.slice(0, pageSize) : querySnapshot.docs;

    // Map Firestore documents to Campaign objects
    let results = docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Campaign[];

    // ===== CLIENT-SIDE FILTERING =====
    // Apply filters that cannot be done efficiently in Firestore
    results = applyClientSideFilters(results, filters);

    const totalPages = Math.ceil(total / pageSize);
    const hasPreviousPage = page > 0;

    // Store first and last document for cursor-based pagination
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : undefined;
    const firstDoc = docs.length > 0 ? docs[0] : undefined;

    return {
      data: results,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      lastDoc,
      firstDoc,
    };
  },

}