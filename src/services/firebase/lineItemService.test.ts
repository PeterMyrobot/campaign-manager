import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lineItemService } from './lineItemService';

// Mock Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    doc: vi.fn(),
    updateDoc: vi.fn(),
    getCountFromServer: vi.fn(),
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

describe('lineItemService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should call doc and getDoc with correct parameters', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'li-1',
        data: () => ({
          campaignId: 'camp-1',
          name: 'Test Line Item',
          bookedAmount: 10000,
          actualAmount: 11000,
          adjustments: 500,
          invoiceId: 'inv-1',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      vi.mocked(doc).mockReturnValue('mock-doc-ref' as any);
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      await lineItemService.getById('li-1');

      expect(doc).toHaveBeenCalledWith(db, 'lineItems', 'li-1');
      expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should return null when document does not exist', async () => {
      const mockDocSnap = { exists: () => false };
      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await lineItemService.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getTotalCount', () => {
    it('should call query and getCountFromServer without filters', async () => {
      const { collection, getCountFromServer, query } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const mockSnapshot = { data: () => ({ count: 42 }) };
      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(getCountFromServer).mockResolvedValue(mockSnapshot as any);

      const result = await lineItemService.getTotalCount();

      expect(collection).toHaveBeenCalledWith(db, 'lineItems');
      expect(query).toHaveBeenCalled();
      expect(getCountFromServer).toHaveBeenCalledWith('mock-query');
      expect(result).toBe(42);
    });

    it('should call where with campaignId filter', async () => {
      const { getCountFromServer, query, where } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 5 }) } as any);

      await lineItemService.getTotalCount({ campaignId: 'camp-1' });

      expect(where).toHaveBeenCalledWith('campaignId', '==', 'camp-1');
    });

    it('should call where with date range filter', async () => {
      const { getCountFromServer, query, where, Timestamp } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 3 }) } as any);

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      await lineItemService.getTotalCount({
        createdDateRange: { from: fromDate, to: toDate },
      });

      expect(Timestamp.fromDate).toHaveBeenCalledWith(fromDate);
      expect(where).toHaveBeenCalledWith('createdAt', '>=', expect.anything());
      expect(where).toHaveBeenCalledWith('createdAt', '<=', expect.anything());
    });
  });

  describe('getByFilter', () => {
    it('should call getDocs with correct query', async () => {
      const mockSnapshot = { docs: [] };
      const { getDocs, query, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      await lineItemService.getByFilter({ pageSize: 10 });

      expect(getDocs).toHaveBeenCalledWith('mock-query');
      expect(limit).toHaveBeenCalledWith(10);
    });

    it('should call where with campaignId filter', async () => {
      const { getDocs, query, where, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await lineItemService.getByFilter({ campaignId: 'camp-1', pageSize: 10 });

      expect(where).toHaveBeenCalledWith('campaignId', '==', 'camp-1');
    });

    it('should call where with invoiceId filter', async () => {
      const { getDocs, query, where, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await lineItemService.getByFilter({ invoiceId: 'inv-1', pageSize: 10 });

      expect(where).toHaveBeenCalledWith('invoiceId', '==', 'inv-1');
    });

    it('should call startAfter with cursor', async () => {
      const mockCursor = { id: 'last-doc' };
      const { getDocs, query, startAfter, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(startAfter).mockReturnValue('mock-startAfter' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await lineItemService.getByFilter({ cursor: mockCursor, pageSize: 10 });

      expect(startAfter).toHaveBeenCalledWith(mockCursor);
    });
  });

  describe('updateAdjustments', () => {
    it('should call updateDoc with correct parameters', async () => {
      const { updateDoc, doc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const mockDocRef = { id: 'li-1' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await lineItemService.updateAdjustments('li-1', 750);

      expect(doc).toHaveBeenCalledWith(db, 'lineItems', 'li-1');
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          adjustments: 750,
        })
      );
      expect(Timestamp.now).toHaveBeenCalled();
    });
  });

  describe('getByIds', () => {
    it('should return empty array for empty input', async () => {
      const result = await lineItemService.getByIds([]);

      expect(result).toEqual([]);
    });

    it('should call getDoc for each ID', async () => {
      const mockDocSnap1 = {
        exists: () => true,
        id: 'li-1',
        data: () => ({
          campaignId: 'camp-1',
          name: 'Line Item 1',
          bookedAmount: 10000,
          actualAmount: 11000,
          adjustments: 500,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      const mockDocSnap2 = {
        exists: () => true,
        id: 'li-2',
        data: () => ({
          campaignId: 'camp-1',
          name: 'Line Item 2',
          bookedAmount: 5000,
          actualAmount: 4800,
          adjustments: -200,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockDocSnap1 as any)
        .mockResolvedValueOnce(mockDocSnap2 as any);

      const result = await lineItemService.getByIds(['li-1', 'li-2']);

      expect(getDoc).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should filter out non-existent documents', async () => {
      const mockDocSnap1 = {
        exists: () => true,
        id: 'li-1',
        data: () => ({
          campaignId: 'camp-1',
          name: 'Line Item 1',
          bookedAmount: 10000,
          actualAmount: 11000,
          adjustments: 500,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      const mockDocSnap2 = {
        exists: () => false,
      };

      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockDocSnap1 as any)
        .mockResolvedValueOnce(mockDocSnap2 as any);

      const result = await lineItemService.getByIds(['li-1', 'non-existent']);

      expect(result).toHaveLength(1);
    });
  });
});
