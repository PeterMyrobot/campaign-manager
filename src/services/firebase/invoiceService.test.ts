import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoiceService } from './invoiceService';

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
    writeBatch: vi.fn(),
    Timestamp: {
      fromDate: vi.fn((date: Date) => `Timestamp(${date.toISOString()})`),
      now: vi.fn(() => 'Timestamp(now)'),
    },
  };
});

vi.mock('./firebase', () => ({
  db: 'mock-db',
}));

describe('invoiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should call doc and getDoc with correct parameters', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'inv-1',
        data: () => ({
          campaignId: 'camp-1',
          invoiceNumber: 'INV-001',
          totalAmount: 10000,
          currency: 'USD',
          issueDate: { toDate: () => new Date() },
          dueDate: { toDate: () => new Date() },
          paidDate: null,
          status: 'draft',
          clientName: 'Client A',
          clientEmail: 'client@example.com',
        }),
      };

      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      vi.mocked(doc).mockReturnValue('mock-doc-ref' as any);
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      await invoiceService.getById('inv-1');

      expect(doc).toHaveBeenCalledWith(db, 'invoices', 'inv-1');
      expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should return null when document does not exist', async () => {
      const mockDocSnap = { exists: () => false };
      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await invoiceService.getById('non-existent');

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

      const result = await invoiceService.getTotalCount();

      expect(collection).toHaveBeenCalledWith(db, 'invoices');
      expect(query).toHaveBeenCalled();
      expect(getCountFromServer).toHaveBeenCalledWith('mock-query');
      expect(result).toBe(42);
    });

    it('should call where with campaignId filter', async () => {
      const { getCountFromServer, query, where } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 5 }) } as any);

      await invoiceService.getTotalCount({ campaignId: 'camp-1' });

      expect(where).toHaveBeenCalledWith('campaignId', '==', 'camp-1');
    });

    it('should call where with status filter', async () => {
      const { getCountFromServer, query, where } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 3 }) } as any);

      await invoiceService.getTotalCount({ status: 'paid' });

      expect(where).toHaveBeenCalledWith('status', '==', 'paid');
    });

    it('should call where with statuses array filter', async () => {
      const { getCountFromServer, query, where } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 8 }) } as any);

      await invoiceService.getTotalCount({ statuses: ['paid', 'sent'] });

      expect(where).toHaveBeenCalledWith('status', 'in', ['paid', 'sent']);
    });

    it('should call where with issueDate range', async () => {
      const { getCountFromServer, query, where, Timestamp } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 3 }) } as any);

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      await invoiceService.getTotalCount({
        issueDateRange: { from: fromDate, to: toDate },
      });

      expect(Timestamp.fromDate).toHaveBeenCalledWith(fromDate);
      expect(where).toHaveBeenCalledWith('issueDate', '>=', expect.anything());
      expect(where).toHaveBeenCalledWith('issueDate', '<=', expect.anything());
    });

    it('should prioritize issueDate over other date filters', async () => {
      const { getCountFromServer, query, where } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 1 }) } as any);

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      await invoiceService.getTotalCount({
        issueDateRange: { from: fromDate, to: toDate },
        dueDateRange: { from: fromDate, to: toDate },
        paidDateRange: { from: fromDate, to: toDate },
      });

      expect(where).toHaveBeenCalledWith('issueDate', '>=', expect.anything());
      expect(where).toHaveBeenCalledWith('issueDate', '<=', expect.anything());
      expect(where).not.toHaveBeenCalledWith('dueDate', expect.anything(), expect.anything());
    });
  });

  describe('getByFilter', () => {
    it('should call getDocs with correct query', async () => {
      const mockSnapshot = { docs: [] };
      const { getDocs, query, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      await invoiceService.getByFilter({ pageSize: 10 });

      expect(getDocs).toHaveBeenCalledWith('mock-query');
      expect(limit).toHaveBeenCalledWith(10);
    });

    it('should call where with campaignId filter', async () => {
      const { getDocs, query, where, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await invoiceService.getByFilter({ campaignId: 'camp-1', pageSize: 10 });

      expect(where).toHaveBeenCalledWith('campaignId', '==', 'camp-1');
    });

    it('should call where with status filter', async () => {
      const { getDocs, query, where, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await invoiceService.getByFilter({ status: 'paid', pageSize: 10 });

      expect(where).toHaveBeenCalledWith('status', '==', 'paid');
    });

    it('should call where with statuses array filter', async () => {
      const { getDocs, query, where, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await invoiceService.getByFilter({ statuses: ['paid', 'sent'], pageSize: 10 });

      expect(where).toHaveBeenCalledWith('status', 'in', ['paid', 'sent']);
    });

    it('should call orderBy with issueDate when issueDate range is used', async () => {
      const { getDocs, query, where, orderBy, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await invoiceService.getByFilter({
        issueDateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        pageSize: 10,
      });

      expect(orderBy).toHaveBeenCalledWith('issueDate', 'desc');
    });

    it('should call orderBy with dueDate when dueDate range is used', async () => {
      const { getDocs, query, where, orderBy, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(where).mockReturnValue('mock-constraint' as any);
      vi.mocked(orderBy).mockReturnValue('mock-orderBy' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await invoiceService.getByFilter({
        dueDateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        pageSize: 10,
      });

      expect(orderBy).toHaveBeenCalledWith('dueDate', 'desc');
    });

    it('should call startAfter with cursor', async () => {
      const mockCursor = { id: 'last-doc' };
      const { getDocs, query, startAfter, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(startAfter).mockReturnValue('mock-startAfter' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await invoiceService.getByFilter({ cursor: mockCursor, pageSize: 10 });

      expect(startAfter).toHaveBeenCalledWith(mockCursor);
    });

    it('should use default pageSize of 10', async () => {
      const { getDocs, query, limit } = await import('firebase/firestore');

      vi.mocked(query).mockReturnValue('mock-query' as any);
      vi.mocked(limit).mockReturnValue('mock-limit' as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      await invoiceService.getByFilter({});

      expect(limit).toHaveBeenCalledWith(10);
    });
  });

  describe('updateAmounts', () => {
    it('should call updateDoc with correct parameters', async () => {
      const { updateDoc, doc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const mockDocRef = { id: 'inv-1' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await invoiceService.updateAmounts('inv-1', {
        bookedAmount: 10000,
        actualAmount: 11000,
        totalAdjustments: 500,
        totalAmount: 11500,
      });

      expect(doc).toHaveBeenCalledWith(db, 'invoices', 'inv-1');
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          bookedAmount: 10000,
          actualAmount: 11000,
          totalAdjustments: 500,
          totalAmount: 11500,
        })
      );
      expect(Timestamp.now).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should call updateDoc with status', async () => {
      const { updateDoc, doc, Timestamp } = await import('firebase/firestore');

      const mockDocRef = { id: 'inv-1' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await invoiceService.updateStatus('inv-1', 'sent');

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          status: 'sent',
          paidDate: null,
        })
      );
      expect(Timestamp.now).toHaveBeenCalled();
    });

    it('should call updateDoc with paidDate when status is paid', async () => {
      const { updateDoc, doc, Timestamp } = await import('firebase/firestore');

      const mockDocRef = { id: 'inv-1' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const paidDate = new Date('2024-01-15');
      await invoiceService.updateStatus('inv-1', 'paid', paidDate);

      expect(Timestamp.fromDate).toHaveBeenCalledWith(paidDate);
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          status: 'paid',
        })
      );
    });
  });

  describe('createFromLineItems', () => {
    it('should call writeBatch operations', async () => {
      const { writeBatch, collection, doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };

      const mockInvoiceRef = { id: 'new-invoice-id' };
      const mockCampaignSnap = {
        exists: () => true,
        data: () => ({ invoiceIds: ['existing-inv'] }),
      };

      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(doc).mockReturnValue(mockInvoiceRef as any);
      vi.mocked(getDoc).mockResolvedValue(mockCampaignSnap as any);

      const result = await invoiceService.createFromLineItems({
        campaignId: 'camp-1',
        lineItemIds: ['li-1', 'li-2'],
        clientName: 'Client A',
        clientEmail: 'client-a@example.com',
        issueDate: new Date('2024-01-01'),
        dueDate: new Date('2024-02-01'),
        currency: 'USD',
        bookedAmount: 10000,
        actualAmount: 11000,
        totalAdjustments: 500,
        totalAmount: 11500,
      });

      expect(writeBatch).toHaveBeenCalledWith(db);
      expect(result).toBe('new-invoice-id');
      expect(mockBatch.set).toHaveBeenCalled();
      expect(mockBatch.update).toHaveBeenCalledTimes(3); // 2 line items + 1 campaign
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should update line items with invoiceId', async () => {
      const { writeBatch, collection, doc, getDoc } = await import('firebase/firestore');

      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };

      const mockInvoiceRef = { id: 'new-invoice-id' };
      const mockCampaignSnap = {
        exists: () => true,
        data: () => ({ invoiceIds: [] }),
      };

      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(doc).mockReturnValue(mockInvoiceRef as any);
      vi.mocked(getDoc).mockResolvedValue(mockCampaignSnap as any);

      await invoiceService.createFromLineItems({
        campaignId: 'camp-1',
        lineItemIds: ['li-1', 'li-2'],
        clientName: 'Client A',
        clientEmail: 'client-a@example.com',
        issueDate: new Date('2024-01-01'),
        dueDate: new Date('2024-02-01'),
        currency: 'USD',
        bookedAmount: 10000,
        actualAmount: 11000,
        totalAdjustments: 500,
        totalAmount: 11500,
      });

      expect(mockBatch.update).toHaveBeenCalledTimes(3); // 2 line items + 1 campaign
    });
  });
});
