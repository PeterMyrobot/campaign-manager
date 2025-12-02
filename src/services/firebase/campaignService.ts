import { collection, getDocs, getDoc, doc, getCountFromServer, orderBy, query, where, Timestamp, limit, startAfter, type DocumentData, type QueryDocumentSnapshot, type QueryConstraint } from "firebase/firestore";
import { db } from "./firebase";
import type { Campaign, CampaignFilters } from "@/types/campaign";

const COLLECTION_NAME = 'campaigns';

export interface PaginatedResponse<T> {
  data: T[];
  lastDoc?: unknown;
  totalCount?: number;
}


export const campaignService = {

  // Get a single campaign by ID
  async getById(id: string): Promise<Campaign | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      status: data.status,
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      invoiceIds: data.invoiceIds || [],
      lineItemIds: data.lineItemIds || [],
    };
  },

  // Get total count of campaigns matching filters
  // Note: name filter is applied client-side, so count may be approximate
  async getTotalCount(filters?: Omit<CampaignFilters, 'page' | 'pageSize' | 'cursor'>): Promise<number> {
    const constraints: QueryConstraint[] = [];

    // Status filter (Firebase 'in' query limited to 10 values)
    if (filters?.statuses && filters.statuses.length > 0) {
      const statusesToQuery = filters.statuses.slice(0, 10);
      constraints.push(where('status', 'in', statusesToQuery));
    }

    // Date range filter - only ONE can be applied due to Firebase limitations
    // Priority: createdDateRange > startDateRange > endDateRange
    if (filters?.createdDateRange?.from || filters?.createdDateRange?.to) {
      if (filters.createdDateRange.from) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.createdDateRange.from)));
      }
      if (filters.createdDateRange.to) {
        const endOfDay = new Date(filters.createdDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters?.startDateRange?.from || filters?.startDateRange?.to) {
      if (filters.startDateRange.from) {
        constraints.push(where('startDate', '>=', Timestamp.fromDate(filters.startDateRange.from)));
      }
      if (filters.startDateRange.to) {
        const endOfDay = new Date(filters.startDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('startDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters?.endDateRange?.from || filters?.endDateRange?.to) {
      if (filters.endDateRange.from) {
        constraints.push(where('endDate', '>=', Timestamp.fromDate(filters.endDateRange.from)));
      }
      if (filters.endDateRange.to) {
        const endOfDay = new Date(filters.endDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('endDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getCountFromServer(q);

    return snapshot.data().count;
  },

  // Get campaigns via filter with server-side pagination
  async getByFilter(filters: CampaignFilters): Promise<PaginatedResponse<Campaign>> {
    const constraints: QueryConstraint[] = [];

    // Status filter (Firebase 'in' query limited to 10 values)
    if (filters.statuses && filters.statuses.length > 0) {
      const statusesToQuery = filters.statuses.slice(0, 10);
      constraints.push(where('status', 'in', statusesToQuery));
    }

    // Date range filter - only ONE can be applied due to Firebase limitations
    // Track which field is used for ordering
    let rangeFieldUsed: 'createdAt' | 'startDate' | 'endDate' | null = null;

    if (filters.createdDateRange?.from || filters.createdDateRange?.to) {
      rangeFieldUsed = 'createdAt';
      if (filters.createdDateRange.from) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.createdDateRange.from)));
      }
      if (filters.createdDateRange.to) {
        const endOfDay = new Date(filters.createdDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters.startDateRange?.from || filters.startDateRange?.to) {
      rangeFieldUsed = 'startDate';
      if (filters.startDateRange.from) {
        constraints.push(where('startDate', '>=', Timestamp.fromDate(filters.startDateRange.from)));
      }
      if (filters.startDateRange.to) {
        const endOfDay = new Date(filters.startDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('startDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    } else if (filters.endDateRange?.from || filters.endDateRange?.to) {
      rangeFieldUsed = 'endDate';
      if (filters.endDateRange.from) {
        constraints.push(where('endDate', '>=', Timestamp.fromDate(filters.endDateRange.from)));
      }
      if (filters.endDateRange.to) {
        const endOfDay = new Date(filters.endDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('endDate', '<=', Timestamp.fromDate(endOfDay)));
      }
    }

    // Sorting: When using range filters, must order by that field
    // Otherwise can use any field (but may require composite index with status filter)
    const sortDirection = filters.sortOrder || 'desc';
    if (rangeFieldUsed) {
      // Must order by the range field when using date range filters
      constraints.push(orderBy(rangeFieldUsed, sortDirection));
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

    // Convert Firestore documents to Campaign objects
    const campaigns: Campaign[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        status: data.status,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        invoiceIds: data.invoiceIds || [],
        lineItemIds: data.lineItemIds || [],
      };
    });

    // Get last document for cursor-based pagination
    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : undefined;

    return {
      data: campaigns,
      lastDoc,
    };
  },

}