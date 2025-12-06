import {
  collection,
  addDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  limit,
  startAfter,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ChangeLogEntry, ChangeLogFilters } from '@/types/changeLog';

const COLLECTION_NAME = 'changeLogs';

export interface PaginatedResponse<T> {
  data: T[];
  lastDoc?: unknown;
  totalCount?: number;
}

// Helper to convert Firestore document to ChangeLogEntry
function documentToChangeLogEntry(doc: QueryDocumentSnapshot<DocumentData>): ChangeLogEntry {
  const data = doc.data();

  return {
    id: doc.id,
    entityType: data.entityType,
    entityId: data.entityId,
    changeType: data.changeType,
    previousAmount: data.previousAmount || 0,
    newAmount: data.newAmount || 0,
    difference: data.difference || 0,
    bookedAmountAtTime: data.bookedAmountAtTime || 0,
    actualAmountAtTime: data.actualAmountAtTime || 0,
    comment: data.comment || '',
    userId: data.userId,
    userName: data.userName || 'System',
    timestamp: data.timestamp?.toDate() || new Date(),
    invoiceId: data.invoiceId,
    invoiceNumber: data.invoiceNumber,
    campaignId: data.campaignId,
    lineItemName: data.lineItemName,
    previousInvoiceId: data.previousInvoiceId,
    previousInvoiceNumber: data.previousInvoiceNumber,
  };
}

export const changeLogService = {
  /**
   * Create a new change log entry
   */
  async create(
    entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...entry,
      timestamp: Timestamp.now(),
    });

    return docRef.id;
  },

  /**
   * Get change logs by invoice ID
   * Returns results sorted by timestamp (client-side) to avoid Firebase composite index requirements
   */
  async getByInvoice(invoiceId: string): Promise<ChangeLogEntry[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('invoiceId', '==', invoiceId)
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(documentToChangeLogEntry);

    // Sort client-side by timestamp descending
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },

  /**
   * Get all change logs
   * Returns results sorted by timestamp (client-side) to avoid Firebase composite index requirements
   */
  async getAll(): Promise<ChangeLogEntry[]> {
    const q = query(collection(db, COLLECTION_NAME));

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(documentToChangeLogEntry);

    // Sort client-side by timestamp descending
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },

  /**
   * Get total count of change logs matching filters
   */
  async getTotalCount(filters?: Omit<ChangeLogFilters, 'page' | 'pageSize' | 'cursor'>): Promise<number> {
    const constraints: QueryConstraint[] = [];

    // Entity type filter
    if (filters?.entityType) {
      constraints.push(where('entityType', '==', filters.entityType));
    }

    // Entity ID filter
    if (filters?.entityId) {
      constraints.push(where('entityId', '==', filters.entityId));
    }

    // Invoice ID filter
    if (filters?.invoiceId) {
      constraints.push(where('invoiceId', '==', filters.invoiceId));
    }

    // Campaign ID filter
    if (filters?.campaignId) {
      constraints.push(where('campaignId', '==', filters.campaignId));
    }

    // Change type filter
    if (filters?.changeType) {
      constraints.push(where('changeType', '==', filters.changeType));
    }

    // Date range filter
    if (filters?.startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters?.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endOfDay)));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getCountFromServer(q);

    return snapshot.data().count;
  },

  /**
   * Get change logs via filter with server-side pagination
   */
  async getByFilter(filters: ChangeLogFilters): Promise<PaginatedResponse<ChangeLogEntry>> {
    const constraints: QueryConstraint[] = [];

    // Entity type filter
    if (filters.entityType) {
      constraints.push(where('entityType', '==', filters.entityType));
    }

    // Entity ID filter
    if (filters.entityId) {
      constraints.push(where('entityId', '==', filters.entityId));
    }

    // Invoice ID filter
    if (filters.invoiceId) {
      constraints.push(where('invoiceId', '==', filters.invoiceId));
    }

    // Campaign ID filter
    if (filters.campaignId) {
      constraints.push(where('campaignId', '==', filters.campaignId));
    }

    // Change type filter
    if (filters.changeType) {
      constraints.push(where('changeType', '==', filters.changeType));
    }

    // Date range filter
    if (filters.startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endOfDay)));
    }

    // Order by timestamp descending
    // constraints.push(orderBy('timestamp', 'desc'));

    // Pagination
    const pageSize = filters.pageSize || 50;
    constraints.push(limit(pageSize));

    // Cursor-based pagination
    if (filters.cursor) {
      constraints.push(startAfter(filters.cursor as QueryDocumentSnapshot<DocumentData>));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    // Convert Firestore documents to ChangeLogEntry objects
    const changeLogs = snapshot.docs.map(documentToChangeLogEntry);

    // Get last document for cursor-based pagination
    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : undefined;

    return {
      data: changeLogs,
      lastDoc,
    };
  },
};
