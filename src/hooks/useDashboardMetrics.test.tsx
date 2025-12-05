import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDashboardMetrics } from './useDashboardMetrics';
import * as useInvoicesHook from './useInvoices';
import * as useCampaignsHook from './useCampaigns';
import * as useLineItemsHook from './useLineItems';
import type { Invoice } from '@/types/invoice';
import type { Campaign } from '@/types/campaign';
import type { LineItem } from '@/types/lineItem';

// Mock the hooks
vi.mock('./useInvoices');
vi.mock('./useCampaigns');
vi.mock('./useLineItems');

describe('useDashboardMetrics', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockInvoices: Invoice[] = [
    {
      id: 'inv-1',
      campaignId: 'camp-1',
      invoiceNumber: 'INV-001',
      lineItemIds: ['li-1'],
      adjustmentIds: [],
      bookedAmount: 10000,
      actualAmount: 11000,
      totalAdjustments: 500,
      totalAmount: 11500,
      currency: 'USD',
      issueDate: new Date('2024-01-01'),
      dueDate: new Date('2024-02-01'),
      paidDate: new Date('2024-01-15'),
      status: 'paid',
      clientName: 'Client A',
      clientEmail: 'client-a@example.com',
    },
    {
      id: 'inv-2',
      campaignId: 'camp-2',
      invoiceNumber: 'INV-002',
      lineItemIds: ['li-2'],
      adjustmentIds: [],
      bookedAmount: 5000,
      actualAmount: 4800,
      totalAdjustments: -200,
      totalAmount: 4600,
      currency: 'USD',
      issueDate: new Date('2024-01-10'),
      dueDate: new Date('2023-12-31'), // Overdue
      status: 'overdue',
      clientName: 'Client B',
      clientEmail: 'client-b@example.com',
    },
    {
      id: 'inv-3',
      campaignId: 'camp-1',
      invoiceNumber: 'INV-003',
      lineItemIds: ['li-3'],
      adjustmentIds: [],
      bookedAmount: 8000,
      actualAmount: 8000,
      totalAdjustments: 0,
      totalAmount: 8000,
      currency: 'USD',
      issueDate: new Date('2024-02-01'),
      dueDate: new Date('2024-03-01'),
      status: 'sent',
      clientName: 'Client A',
      clientEmail: 'client-a@example.com',
    },
  ];

  const mockCampaigns: Campaign[] = [
    {
      id: 'camp-1',
      name: 'Summer Campaign',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      createdAt: new Date('2023-12-01'),
      updatedAt: new Date('2024-01-01'),
      invoiceIds: ['inv-1', 'inv-3'],
      lineItemIds: ['li-1', 'li-3'],
    },
    {
      id: 'camp-2',
      name: 'Winter Campaign',
      status: 'completed',
      startDate: new Date('2023-11-01'),
      endDate: new Date('2023-12-31'),
      createdAt: new Date('2023-10-01'),
      updatedAt: new Date('2024-01-01'),
      invoiceIds: ['inv-2'],
      lineItemIds: ['li-2'],
    },
  ];

  const mockLineItems: LineItem[] = [
    {
      id: 'li-1',
      campaignId: 'camp-1',
      name: 'Line Item 1',
      bookedAmount: 10000,
      actualAmount: 11000,
      adjustments: 500,
      invoiceId: 'inv-1',
    },
    {
      id: 'li-2',
      campaignId: 'camp-2',
      name: 'Line Item 2',
      bookedAmount: 5000,
      actualAmount: 4800,
      adjustments: -200,
      invoiceId: 'inv-2',
    },
    {
      id: 'li-3',
      campaignId: 'camp-1',
      name: 'Line Item 3',
      bookedAmount: 8000,
      actualAmount: 8000,
      adjustments: 0,
      invoiceId: 'inv-3',
    },
    {
      id: 'li-4',
      campaignId: 'camp-1',
      name: 'Line Item 4',
      bookedAmount: 2000,
      actualAmount: 2100,
      adjustments: 100,
      // No invoiceId - uninvoiced
    },
  ];

  it('should return loading state initially', () => {
    vi.spyOn(useInvoicesHook, 'useInvoices').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);
    vi.spyOn(useCampaignsHook, 'useCampaigns').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);
    vi.spyOn(useLineItemsHook, 'useLineItems').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('should calculate total revenue correctly', async () => {
    vi.spyOn(useInvoicesHook, 'useInvoices').mockReturnValue({
      data: { data: mockInvoices, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useCampaignsHook, 'useCampaigns').mockReturnValue({
      data: { data: mockCampaigns, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useLineItemsHook, 'useLineItems').mockReturnValue({
      data: { data: mockLineItems, lastDoc: null },
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Only paid invoices count towards revenue
    expect(result.current.totalRevenue).toBe(11500);
  });

  it('should calculate outstanding revenue correctly', async () => {
    vi.spyOn(useInvoicesHook, 'useInvoices').mockReturnValue({
      data: { data: mockInvoices, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useCampaignsHook, 'useCampaigns').mockReturnValue({
      data: { data: mockCampaigns, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useLineItemsHook, 'useLineItems').mockReturnValue({
      data: { data: mockLineItems, lastDoc: null },
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // sent + overdue invoices
    expect(result.current.outstandingRevenue).toBe(12600); // 8000 + 4600
  });

  it('should identify overdue invoices', async () => {
    vi.spyOn(useInvoicesHook, 'useInvoices').mockReturnValue({
      data: { data: mockInvoices, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useCampaignsHook, 'useCampaigns').mockReturnValue({
      data: { data: mockCampaigns, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useLineItemsHook, 'useLineItems').mockReturnValue({
      data: { data: mockLineItems, lastDoc: null },
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // inv-2 has status 'overdue', inv-3 has status 'sent' with past due date
    expect(result.current.overdueCount).toBe(2);
    expect(result.current.overdueRevenue).toBe(12600); // 4600 + 8000
  });

  it('should calculate collection rate correctly', async () => {
    vi.spyOn(useInvoicesHook, 'useInvoices').mockReturnValue({
      data: { data: mockInvoices, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useCampaignsHook, 'useCampaigns').mockReturnValue({
      data: { data: mockCampaigns, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useLineItemsHook, 'useLineItems').mockReturnValue({
      data: { data: mockLineItems, lastDoc: null },
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Collection rate = (paid / total invoiced) * 100
    // Paid = 11500, Total = 11500 + 8000 + 4600 = 24100
    const expectedRate = (11500 / 24100) * 100;
    expect(result.current.collectionRate).toBeCloseTo(expectedRate, 1);
  });

  it('should count uninvoiced line items', async () => {
    vi.spyOn(useInvoicesHook, 'useInvoices').mockReturnValue({
      data: { data: mockInvoices, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useCampaignsHook, 'useCampaigns').mockReturnValue({
      data: { data: mockCampaigns, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useLineItemsHook, 'useLineItems').mockReturnValue({
      data: { data: mockLineItems, lastDoc: null },
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.uninvoicedLineItems).toBe(1); // li-4 has no invoiceId
  });

  it('should calculate variance correctly', async () => {
    vi.spyOn(useInvoicesHook, 'useInvoices').mockReturnValue({
      data: { data: mockInvoices, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useCampaignsHook, 'useCampaigns').mockReturnValue({
      data: { data: mockCampaigns, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useLineItemsHook, 'useLineItems').mockReturnValue({
      data: { data: mockLineItems, lastDoc: null },
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Total booked: 10000 + 5000 + 8000 = 23000
    expect(result.current.totalBooked).toBe(23000);

    // Total actual: 11000 + 4800 + 8000 = 23800
    expect(result.current.totalActual).toBe(23800);

    // Variance: 23800 - 23000 = 800
    expect(result.current.totalVariance).toBe(800);
  });

  it('should group campaigns by status', async () => {
    vi.spyOn(useInvoicesHook, 'useInvoices').mockReturnValue({
      data: { data: mockInvoices, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useCampaignsHook, 'useCampaigns').mockReturnValue({
      data: { data: mockCampaigns, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useLineItemsHook, 'useLineItems').mockReturnValue({
      data: { data: mockLineItems, lastDoc: null },
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.campaignsByStatus).toEqual({
      active: 1,
      completed: 1,
    });
    expect(result.current.activeCampaigns).toBe(1);
  });

  it('should return top campaigns by revenue', async () => {
    vi.spyOn(useInvoicesHook, 'useInvoices').mockReturnValue({
      data: { data: mockInvoices, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useCampaignsHook, 'useCampaigns').mockReturnValue({
      data: { data: mockCampaigns, lastDoc: null },
      isLoading: false,
    } as any);
    vi.spyOn(useLineItemsHook, 'useLineItems').mockReturnValue({
      data: { data: mockLineItems, lastDoc: null },
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // camp-1 has one paid invoice (inv-1) = 11500
    // camp-2 has no paid invoices (inv-2 is overdue)
    expect(result.current.topCampaigns).toHaveLength(1);
    expect(result.current.topCampaigns[0]).toEqual({
      id: 'camp-1',
      name: 'Summer Campaign',
      revenue: 11500,
    });
  });
});
