import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changeLogService } from './changeLogService';
import type { ChangeLogEntry } from '@/types/changeLog';

// Mock Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(),
    addDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    Timestamp: {
      fromDate: vi.fn((date: Date) => `Timestamp(${date.toISOString()})`),
      now: vi.fn(() => 'Timestamp(now)'),
    },
  };
});

vi.mock('./firebase', () => ({
  db: 'mock-db',
}));

describe('changeLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new change log entry', async () => {
      const { addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const mockCollectionRef = 'mock-collection-ref';
      vi.mocked(collection).mockReturnValue(mockCollectionRef as any);
      vi.mocked(addDoc).mockResolvedValue({ id: 'log-1' } as any);

      const entry: Omit<ChangeLogEntry, 'id' | 'timestamp'> = {
        entityType: 'line_item',
        entityId: 'item-1',
        changeType: 'adjustment_created',
        previousAmount: 0,
        newAmount: -200,
        difference: -200,
        bookedAmountAtTime: 10000,
        actualAmountAtTime: 9500,
        comment: 'Initial adjustment',
        userName: 'System',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-001',
        campaignId: 'camp-1',
        lineItemName: 'Premium Placement',
      };

      const result = await changeLogService.create(entry);

      expect(collection).toHaveBeenCalledWith(db, 'changeLogs');
      expect(addDoc).toHaveBeenCalledWith(
        mockCollectionRef,
        expect.objectContaining({
          ...entry,
          timestamp: 'Timestamp(now)',
        })
      );
      expect(result).toBe('log-1');
    });
  });

  describe('getByInvoice', () => {
    it('should fetch change logs by invoice ID and sort by timestamp descending', async () => {
      const mockDocs = [
        {
          id: 'log-1',
          data: () => ({
            entityType: 'line_item',
            entityId: 'item-1',
            changeType: 'adjustment_created',
            previousAmount: 0,
            newAmount: -200,
            difference: -200,
            bookedAmountAtTime: 10000,
            actualAmountAtTime: 9500,
            comment: 'Initial adjustment',
            userName: 'System',
            timestamp: { toDate: () => new Date('2025-10-15') },
            invoiceId: 'inv-1',
            invoiceNumber: 'INV-001',
            campaignId: 'camp-1',
            lineItemName: 'Premium Placement',
          }),
        },
        {
          id: 'log-2',
          data: () => ({
            entityType: 'line_item',
            entityId: 'item-2',
            changeType: 'adjustment_updated',
            previousAmount: -200,
            newAmount: -300,
            difference: -100,
            bookedAmountAtTime: 10000,
            actualAmountAtTime: 9400,
            comment: 'Update',
            userName: 'System',
            timestamp: { toDate: () => new Date('2025-11-20') },
            invoiceId: 'inv-1',
            invoiceNumber: 'INV-001',
            campaignId: 'camp-1',
            lineItemName: 'Premium Placement',
          }),
        },
      ];

      const { getDocs, query, where, collection } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);
      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-where' as any);

      const result = await changeLogService.getByInvoice('inv-1');

      expect(collection).toHaveBeenCalledWith(db, 'changeLogs');
      expect(where).toHaveBeenCalledWith('invoiceId', '==', 'inv-1');
      expect(result).toHaveLength(2);
      // Should be sorted by timestamp descending (log-2 before log-1)
      expect(result[0].id).toBe('log-2');
      expect(result[1].id).toBe('log-1');
    });
  });

  describe('getAll', () => {
    it('should fetch all change logs and sort by timestamp descending', async () => {
      const mockDocs = [
        {
          id: 'log-1',
          data: () => ({
            entityType: 'line_item',
            entityId: 'item-1',
            changeType: 'adjustment_created',
            previousAmount: 0,
            newAmount: -200,
            difference: -200,
            bookedAmountAtTime: 10000,
            actualAmountAtTime: 9500,
            comment: 'Test 1',
            userName: 'System',
            timestamp: { toDate: () => new Date('2025-10-15') },
            invoiceId: 'inv-1',
            invoiceNumber: 'INV-001',
            campaignId: 'camp-1',
            lineItemName: 'Item 1',
          }),
        },
        {
          id: 'log-2',
          data: () => ({
            entityType: 'invoice',
            entityId: 'inv-2',
            changeType: 'status_change',
            previousAmount: 0,
            newAmount: 0,
            difference: 0,
            bookedAmountAtTime: 5000,
            actualAmountAtTime: 5000,
            comment: 'Test 2',
            userName: 'User',
            timestamp: { toDate: () => new Date('2025-11-20') },
            invoiceId: 'inv-2',
            invoiceNumber: 'INV-002',
            campaignId: 'camp-2',
          }),
        },
      ];

      const { getDocs, query, collection } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);
      vi.mocked(query).mockReturnValue('mock-query' as any);

      const result = await changeLogService.getAll();

      expect(collection).toHaveBeenCalledWith(db, 'changeLogs');
      expect(result).toHaveLength(2);
      // Should be sorted by timestamp descending (log-2 before log-1)
      expect(result[0].id).toBe('log-2');
      expect(result[1].id).toBe('log-1');
    });
  });
});
