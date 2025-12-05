import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
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
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
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
   * Get change logs by invoice ID with optional filters
   */
  async getByInvoice(
    invoiceId: string,
    filters?: ChangeLogFilters
  ): Promise<ChangeLogEntry[]> {
    const constraints: QueryConstraint[] = [
      where('invoiceId', '==', invoiceId),
      orderBy('timestamp', 'desc'),
    ];

    // Add optional filters
    if (filters?.entityType) {
      constraints.push(where('entityType', '==', filters.entityType));
    }

    if (filters?.changeType) {
      constraints.push(where('changeType', '==', filters.changeType));
    }

    if (filters?.entityId) {
      constraints.push(where('entityId', '==', filters.entityId));
    }

    // Add limit if specified
    if (filters?.pageSize) {
      constraints.push(limit(filters.pageSize));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(documentToChangeLogEntry);
  },

  /**
   * Get change logs by line item ID
   */
  async getByLineItem(
    lineItemId: string,
    limitCount?: number
  ): Promise<ChangeLogEntry[]> {
    const constraints: QueryConstraint[] = [
      where('entityType', '==', 'line_item'),
      where('entityId', '==', lineItemId),
      orderBy('timestamp', 'desc'),
    ];

    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(documentToChangeLogEntry);
  },

  /**
   * Get change logs by campaign ID
   */
  async getByCampaign(
    campaignId: string,
    filters?: ChangeLogFilters
  ): Promise<ChangeLogEntry[]> {
    const constraints: QueryConstraint[] = [
      where('campaignId', '==', campaignId),
      orderBy('timestamp', 'desc'),
    ];

    // Add optional filters
    if (filters?.entityType) {
      constraints.push(where('entityType', '==', filters.entityType));
    }

    if (filters?.changeType) {
      constraints.push(where('changeType', '==', filters.changeType));
    }

    // Add limit if specified
    if (filters?.pageSize) {
      constraints.push(limit(filters.pageSize));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(documentToChangeLogEntry);
  },

  /**
   * Get change logs with cursor-based pagination
   */
  async getWithCursor(
    filters: ChangeLogFilters
  ): Promise<PaginatedResponse<ChangeLogEntry>> {
    const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')];

    // Add filters
    if (filters.invoiceId) {
      constraints.unshift(where('invoiceId', '==', filters.invoiceId));
    }

    if (filters.campaignId) {
      constraints.unshift(where('campaignId', '==', filters.campaignId));
    }

    if (filters.entityType) {
      constraints.unshift(where('entityType', '==', filters.entityType));
    }

    if (filters.entityId) {
      constraints.unshift(where('entityId', '==', filters.entityId));
    }

    if (filters.changeType) {
      constraints.unshift(where('changeType', '==', filters.changeType));
    }

    // Add cursor pagination
    if (filters.cursor) {
      constraints.push(startAfter(filters.cursor));
    }

    // Add limit
    const pageSize = filters.pageSize || 20;
    constraints.push(limit(pageSize));

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map(documentToChangeLogEntry);
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return {
      data,
      lastDoc,
    };
  },

  /**
   * Get recent change logs across all entities
   */
  async getRecent(limitCount: number = 10): Promise<ChangeLogEntry[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(documentToChangeLogEntry);
  },
};
