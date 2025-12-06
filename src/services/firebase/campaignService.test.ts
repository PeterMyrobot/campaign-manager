import { describe, it, expect, vi, beforeEach } from 'vitest';
import { campaignService } from './campaignService';

// Mock Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    doc: vi.fn(),
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

describe('campaignService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should call doc and getDoc with correct parameters', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'camp-1',
        data: () => ({
          name: 'Test Campaign',
          status: 'active',
          startDate: { toDate: () => new Date() },
          endDate: { toDate: () => new Date() },
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      vi.mocked(doc).mockReturnValue('mock-doc-ref' as any);
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      await campaignService.getById('camp-1');

      expect(doc).toHaveBeenCalledWith(db, 'campaigns', 'camp-1');
      expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should return null when document does not exist', async () => {
      const mockDocSnap = { exists: () => false };
      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await campaignService.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getTotalCount', () => {
    it('should call query and getCountFromServer without filters', async () => {
      const { collection, getCountFromServer, query } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const mockSnapshot = { data: () => ({ count: 25 }) };
      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(getCountFromServer).mockResolvedValue(mockSnapshot as any);

      const result = await campaignService.getTotalCount();

      expect(collection).toHaveBeenCalledWith(db, 'campaigns');
      expect(query).toHaveBeenCalled();
      expect(getCountFromServer).toHaveBeenCalledWith('mock-query');
      expect(result).toBe(25);
    });

    it('should call where with status filter', async () => {
      const { getCountFromServer, query, where } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 10 }) } as any);

      await campaignService.getTotalCount({ statuses: ['active', 'completed'] });

      expect(where).toHaveBeenCalledWith('status', 'in', ['active', 'completed']);
    });

    it('should limit statuses to 10 items', async () => {
      const { getCountFromServer, query, where } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 5 }) } as any);

      const manyStatuses = Array.from({ length: 15 }, (_, i) => `status-${i}`);
      await campaignService.getTotalCount({ statuses: manyStatuses as any });

      const callArgs = vi.mocked(where).mock.calls[0];
      expect(callArgs[2]).toHaveLength(10);
    });

    it('should call where with createdAt date range', async () => {
      const { getCountFromServer, query, where, Timestamp } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 5 }) } as any);

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      await campaignService.getTotalCount({
        createdDateRange: { from: fromDate, to: toDate },
      });

      expect(Timestamp.fromDate).toHaveBeenCalledWith(fromDate);
      expect(Timestamp.fromDate).toHaveBeenCalledWith(expect.any(Date)); // toDate with end of day
      expect(where).toHaveBeenCalledWith('createdAt', '>=', expect.anything());
      expect(where).toHaveBeenCalledWith('createdAt', '<=', expect.anything());
    });

    it('should call where with startDate when no createdDate', async () => {
      const { getCountFromServer, query, where } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 3 }) } as any);

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-06-30');

      await campaignService.getTotalCount({
        startDateRange: { from: fromDate, to: toDate },
      });

      expect(where).toHaveBeenCalledWith('startDate', '>=', expect.anything());
      expect(where).toHaveBeenCalledWith('startDate', '<=', expect.anything());
    });

    it('should prioritize createdDate over other date filters', async () => {
      const { getCountFromServer, query, where } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 1 }) } as any);

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      await campaignService.getTotalCount({
        createdDateRange: { from: fromDate, to: toDate },
        startDateRange: { from: fromDate, to: toDate },
        endDateRange: { from: fromDate, to: toDate },
      });

      expect(where).toHaveBeenCalledWith('createdAt', '>=', expect.anything());
      expect(where).toHaveBeenCalledWith('createdAt', '<=', expect.anything());
      expect(where).not.toHaveBeenCalledWith('startDate', expect.anything(), expect.anything());
    });
  });

  describe('getByFilter', () => {
    it('should call getDocs with correct query', async () => {
      const mockSnapshot = { docs: [] };
      const { getDocs, query, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      await campaignService.getByFilter({ pageSize: 10 });

      expect(getDocs).toHaveBeenCalledWith('mock-query');
      expect(limit).toHaveBeenCalledWith(10);
    });

    it('should call where with status filter', async () => {
      const { getDocs, query, where, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await campaignService.getByFilter({
        statuses: ['active', 'completed'],
        pageSize: 10,
      });

      expect(where).toHaveBeenCalledWith('status', 'in', ['active', 'completed']);
    });

    it('should limit statuses to 10 items', async () => {
      const { getDocs, query, where, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      const manyStatuses = Array.from({ length: 15 }, (_, i) => `status-${i}`);
      await campaignService.getByFilter({ statuses: manyStatuses as any, pageSize: 10 });

      const callArgs = vi.mocked(where).mock.calls[0];
      expect(callArgs[2]).toHaveLength(10);
    });

    it('should call orderBy with createdAt when createdDate range is used', async () => {
      const { getDocs, query, where, orderBy, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await campaignService.getByFilter({
        createdDateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        pageSize: 10,
      });

      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should call orderBy with startDate when startDate range is used', async () => {
      const { getDocs, query, where, orderBy, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await campaignService.getByFilter({
        startDateRange: { from: new Date('2024-01-01'), to: new Date('2024-06-30') },
        pageSize: 10,
      });

      expect(orderBy).toHaveBeenCalledWith('startDate', 'desc');
    });

    it('should call orderBy with endDate when endDate range is used', async () => {
      const { getDocs, query, where, orderBy, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await campaignService.getByFilter({
        endDateRange: { from: new Date('2024-06-01'), to: new Date('2024-12-31') },
        pageSize: 10,
      });

      expect(orderBy).toHaveBeenCalledWith('endDate', 'desc');
    });

    it('should not call orderBy when no date range is used', async () => {
      const { getDocs, query, orderBy, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await campaignService.getByFilter({ statuses: ['active'], pageSize: 10 });

      expect(orderBy).not.toHaveBeenCalled();
    });

    it('should call startAfter with cursor', async () => {
      const mockCursor = { id: 'last-doc' };
      const { getDocs, query, startAfter, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(startAfter).mockReturnValue('mock-startAfter' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await campaignService.getByFilter({ cursor: mockCursor, pageSize: 10 });

      expect(startAfter).toHaveBeenCalledWith(mockCursor);
    });

    it('should use default pageSize of 10', async () => {
      const { getDocs, query, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await campaignService.getByFilter({});

      expect(limit).toHaveBeenCalledWith(10);
    });
  });
});
