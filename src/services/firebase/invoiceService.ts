import { collection, getDocs, getDoc, doc, updateDoc, Timestamp, getCountFromServer, query, where, limit, startAfter, type DocumentData, type QueryDocumentSnapshot, type QueryConstraint } from "firebase/firestore";
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

  // Update invoice total amount
  async updateTotalAmount(id: string, totalAmount: number): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      totalAmount,
      updatedAt: Timestamp.now(),
    });
  },
}
