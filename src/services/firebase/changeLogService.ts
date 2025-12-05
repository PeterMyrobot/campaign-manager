import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ChangeLogEntry } from '@/types/changeLog';

const COLLECTION_NAME = 'changeLogs';

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
};
