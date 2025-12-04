import { collection, getDocs, getDoc, doc, updateDoc, Timestamp, getCountFromServer, query, where, orderBy, limit, startAfter, type DocumentData, type QueryDocumentSnapshot, type QueryConstraint } from "firebase/firestore";
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
}
