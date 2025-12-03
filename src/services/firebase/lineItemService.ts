import { collection, getDocs, getDoc, doc, getCountFromServer, query, where, limit, startAfter, type DocumentData, type QueryDocumentSnapshot, type QueryConstraint } from "firebase/firestore";
import { db } from "./firebase";
import type { LineItem, LineItemFilters } from "@/types/lineItem";

const COLLECTION_NAME = 'lineItems';

export interface PaginatedResponse<T> {
  data: T[];
  lastDoc?: unknown;
  totalCount?: number;
}

export const lineItemService = {
  // Get a single line item by ID
  async getById(id: string): Promise<LineItem | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();


    return {
      id: docSnap.id,
      campaignId: data.campaignId,
      name: data.name,
      bookedAmount: data.bookedAmount,
      actualAmount: data.actualAmount,
      adjustments: data.adjustments,
      invoiceId: data.invoiceId,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  },

  // Get total count of line items matching filters
  async getTotalCount(filters?: Omit<LineItemFilters, 'page' | 'pageSize' | 'cursor'>): Promise<number> {
    const constraints: QueryConstraint[] = [];

    if (filters?.campaignId) {
      constraints.push(where('campaignId', '==', filters.campaignId));
    }

    if (filters?.invoiceId) {
      constraints.push(where('invoiceId', '==', filters.invoiceId));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getCountFromServer(q);

    return snapshot.data().count;
  },

  // Get line items via filter with server-side pagination
  async getByFilter(filters: LineItemFilters): Promise<PaginatedResponse<LineItem>> {
    const constraints: QueryConstraint[] = [];

    if (filters.campaignId) {
      constraints.push(where('campaignId', '==', filters.campaignId));
    }

    if (filters.invoiceId) {
      constraints.push(where('invoiceId', '==', filters.invoiceId));
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

    // Convert Firestore documents to LineItem objects
    const lineItems: LineItem[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        campaignId: data.campaignId,
        name: data.name,
        bookedAmount: data.bookedAmount,
        actualAmount: data.actualAmount,
        adjustments: data.adjustments,
        invoiceId: data.invoiceId,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
    });

    // Get last document for cursor-based pagination
    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : undefined;

    return {
      data: lineItems,
      lastDoc,
    };
  },
}
