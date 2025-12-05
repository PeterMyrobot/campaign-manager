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
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
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
      const { addDoc, collection, Timestamp } = await import('firebase/firestore');
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
    it('should fetch change logs by invoice ID', async () => {
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
      ];

      const { getDocs, query, where, orderBy, collection } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);
      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-where' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);

      const result = await changeLogService.getByInvoice('inv-1');

      expect(collection).toHaveBeenCalledWith(db, 'changeLogs');
      expect(where).toHaveBeenCalledWith('invoiceId', '==', 'inv-1');
      expect(orderBy).toHaveBeenCalledWith('timestamp', 'desc');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('log-1');
      expect(result[0].entityType).toBe('line_item');
    });

    it('should apply optional filters', async () => {
      const { getDocs, query, where, limit: limitFn } = await import('firebase/firestore');

      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);
      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-where' as any);
      vi.mocked(limitFn).mockReturnValue('mock-limit' as any);

      await changeLogService.getByInvoice('inv-1', {
        entityType: 'line_item',
        pageSize: 10,
      });

      expect(where).toHaveBeenCalledWith('invoiceId', '==', 'inv-1');
      expect(where).toHaveBeenCalledWith('entityType', '==', 'line_item');
      expect(limitFn).toHaveBeenCalledWith(10);
    });
  });

  describe('getByLineItem', () => {
    it('should fetch change logs by line item ID', async () => {
      const mockDocs = [
        {
          id: 'log-1',
          data: () => ({
            entityType: 'line_item',
            entityId: 'item-1',
            changeType: 'adjustment_updated',
            previousAmount: -200,
            newAmount: -350,
            difference: -150,
            bookedAmountAtTime: 10000,
            actualAmountAtTime: 9500,
            comment: 'Client requested discount',
            userName: 'System',
            timestamp: { toDate: () => new Date('2025-11-10') },
            invoiceId: 'inv-1',
            invoiceNumber: 'INV-001',
            campaignId: 'camp-1',
            lineItemName: 'Premium Placement',
          }),
        },
      ];

      const { getDocs, query, where, orderBy } = await import('firebase/firestore');

      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);
      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-where' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);

      const result = await changeLogService.getByLineItem('item-1');

      expect(where).toHaveBeenCalledWith('entityType', '==', 'line_item');
      expect(where).toHaveBeenCalledWith('entityId', '==', 'item-1');
      expect(orderBy).toHaveBeenCalledWith('timestamp', 'desc');
      expect(result).toHaveLength(1);
      expect(result[0].difference).toBe(-150);
    });

    it('should apply limit when provided', async () => {
      const { getDocs, limit: limitFn } = await import('firebase/firestore');

      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);
      vi.mocked(limitFn).mockReturnValue('mock-limit' as any);

      await changeLogService.getByLineItem('item-1', 5);

      expect(limitFn).toHaveBeenCalledWith(5);
    });
  });

  describe('getByCampaign', () => {
    it('should fetch change logs by campaign ID', async () => {
      const { getDocs, query, where, orderBy } = await import('firebase/firestore');

      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);
      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-where' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);

      await changeLogService.getByCampaign('camp-1');

      expect(where).toHaveBeenCalledWith('campaignId', '==', 'camp-1');
      expect(orderBy).toHaveBeenCalledWith('timestamp', 'desc');
    });
  });

  describe('getWithCursor', () => {
    it('should support cursor-based pagination', async () => {
      const mockCursor = 'mock-cursor-doc';
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
            comment: 'Test',
            userName: 'System',
            timestamp: { toDate: () => new Date() },
            invoiceId: 'inv-1',
            invoiceNumber: 'INV-001',
            campaignId: 'camp-1',
            lineItemName: 'Test Item',
          }),
        },
      ];

      const { getDocs, query, startAfter, limit: limitFn, orderBy } = await import('firebase/firestore');

      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);
      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(startAfter).mockReturnValue('mock-startAfter' as any);
      vi.mocked(limitFn).mockReturnValue('mock-limit' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);

      const result = await changeLogService.getWithCursor({
        cursor: mockCursor,
        pageSize: 20,
      });

      expect(startAfter).toHaveBeenCalledWith(mockCursor);
      expect(limitFn).toHaveBeenCalledWith(20);
      expect(result.data).toHaveLength(1);
      expect(result.lastDoc).toBeDefined();
    });

    it('should use default page size when not specified', async () => {
      const { getDocs, limit: limitFn } = await import('firebase/firestore');

      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);
      vi.mocked(limitFn).mockReturnValue('mock-limit' as any);

      await changeLogService.getWithCursor({});

      expect(limitFn).toHaveBeenCalledWith(20);
    });
  });

  describe('getRecent', () => {
    it('should fetch recent change logs', async () => {
      const { getDocs, query, orderBy, limit: limitFn } = await import('firebase/firestore');

      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);
      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);
      vi.mocked(limitFn).mockReturnValue('mock-limit' as any);

      await changeLogService.getRecent(10);

      expect(orderBy).toHaveBeenCalledWith('timestamp', 'desc');
      expect(limitFn).toHaveBeenCalledWith(10);
    });

    it('should use default limit when not specified', async () => {
      const { getDocs, limit: limitFn } = await import('firebase/firestore');

      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);
      vi.mocked(limitFn).mockReturnValue('mock-limit' as any);

      await changeLogService.getRecent();

      expect(limitFn).toHaveBeenCalledWith(10);
    });
  });
});
