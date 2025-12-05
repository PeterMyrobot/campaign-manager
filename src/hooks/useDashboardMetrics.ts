import { useMemo } from 'react';
import { useInvoices } from './useInvoices';
import { useCampaigns } from './useCampaigns';
import { useLineItems } from './useLineItems';


interface DashboardMetrics {
  // Financial metrics
  totalRevenue: number;
  outstandingRevenue: number;
  overdueRevenue: number;
  overdueCount: number;
  collectionRate: number;

  // Variance metrics
  totalBooked: number;
  totalActual: number;
  totalVariance: number;
  totalAdjustments: number;

  // Campaign metrics
  activeCampaigns: number;
  campaignsByStatus: Record<string, number>;

  // Invoice metrics
  invoicesByStatus: Record<string, number>;
  uninvoicedLineItems: number;

  // Time series data
  revenueByMonth: Array<{ month: string; revenue: number; count: number }>;

  // Top lists
  topCampaigns: Array<{ id: string; name: string; revenue: number }>;
  recentPayments: Array<{ id: string; invoiceNumber: string; clientName: string; amount: number; paidDate: Date }>;

  // Urgent actions
  invoicesDueThisWeek: number;
  invoicesDueThisWeekAmount: number;
  campaignsEndingThisWeek: number;

  // Loading states
  isLoading: boolean;
}

interface UseDashboardMetricsOptions {
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export function useDashboardMetrics(options?: UseDashboardMetricsOptions): DashboardMetrics {
  const { dateRange } = options || {};

  // Fetch data with large page size (limited by date range for performance)
  const { data: invoicesResponse, isLoading: invoicesLoading } = useInvoices({
    pageSize: 1000,
    ...(dateRange?.from && { createdDateRange: dateRange }),
  });

  const { data: campaignsResponse, isLoading: campaignsLoading } = useCampaigns({
    pageSize: 1000,
    ...(dateRange?.from && { createdDateRange: dateRange }),
  });

  const { data: lineItemsResponse, isLoading: lineItemsLoading } = useLineItems({
    pageSize: 1000,
    ...(dateRange?.from && { createdDateRange: dateRange }),
  });

  const invoices = invoicesResponse?.data || [];
  const campaigns = campaignsResponse?.data || [];
  const lineItems = lineItemsResponse?.data || [];

  const isLoading = invoicesLoading || campaignsLoading || lineItemsLoading;

  const metrics = useMemo(() => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Financial metrics
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    const outstandingInvoices = invoices.filter(inv => ['sent', 'overdue'].includes(inv.status));
    const outstandingRevenue = outstandingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    const overdueInvoices = invoices.filter(inv =>
      inv.status === 'overdue'
    );
    const overdueRevenue = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const overdueCount = overdueInvoices.length;

    const totalInvoiced = invoices
      .filter(inv => inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const collectionRate = totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

    // Variance metrics
    const totalBooked = invoices.reduce((sum, inv) => sum + inv.bookedAmount, 0);
    const totalActual = invoices.reduce((sum, inv) => sum + inv.actualAmount, 0);
    const totalVariance = totalActual - totalBooked;
    const totalAdjustments = invoices.reduce((sum, inv) => sum + inv.totalAdjustments, 0);

    // Campaign metrics
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

    const campaignsByStatus = campaigns.reduce((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Invoice metrics
    const invoicesByStatus = invoices.reduce((acc, invoice) => {
      acc[invoice.status] = (acc[invoice.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uninvoicedLineItems = lineItems.filter(li => !li.invoiceId).length;

    // Revenue by month (last 12 months)
    const revenueByMonthMap = new Map<string, { revenue: number; count: number }>();

    paidInvoices.forEach(inv => {
      if (inv.paidDate) {
        const monthKey = `${inv.paidDate.getFullYear()}-${String(inv.paidDate.getMonth() + 1).padStart(2, '0')}`;
        const existing = revenueByMonthMap.get(monthKey) || { revenue: 0, count: 0 };
        revenueByMonthMap.set(monthKey, {
          revenue: existing.revenue + inv.totalAmount,
          count: existing.count + 1,
        });
      }
    });

    // Sort by month and format
    const revenueByMonth = Array.from(revenueByMonthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12) // Last 12 months
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: data.revenue,
          count: data.count,
        };
      });

    // Top campaigns by revenue
    const campaignRevenueMap = new Map<string, number>();
    const campaignNameMap = new Map<string, string>();

    invoices.forEach(inv => {
      if (inv.status === 'paid') {
        const current = campaignRevenueMap.get(inv.campaignId) || 0;
        campaignRevenueMap.set(inv.campaignId, current + inv.totalAmount);
      }
    });

    campaigns.forEach(c => {
      campaignNameMap.set(c.id, c.name);
    });

    const topCampaigns = Array.from(campaignRevenueMap.entries())
      .map(([id, revenue]) => ({
        id,
        name: campaignNameMap.get(id) || id,
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent payments
    const recentPayments = paidInvoices
      .filter(inv => inv.paidDate)
      .sort((a, b) => (b.paidDate?.getTime() || 0) - (a.paidDate?.getTime() || 0))
      .slice(0, 5)
      .map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        amount: inv.totalAmount,
        paidDate: inv.paidDate!,
      }));

    // Urgent actions
    const invoicesDueThisWeek = invoices.filter(inv =>
      inv.status === 'sent' &&
      inv.dueDate &&
      inv.dueDate >= now &&
      inv.dueDate <= oneWeekFromNow
    );
    const invoicesDueThisWeekAmount = invoicesDueThisWeek.reduce((sum, inv) => sum + inv.totalAmount, 0);

    const campaignsEndingThisWeek = campaigns.filter(c =>
      c.status === 'active' &&
      c.endDate &&
      c.endDate >= now &&
      c.endDate <= oneWeekFromNow
    ).length;

    return {
      totalRevenue,
      outstandingRevenue,
      overdueRevenue,
      overdueCount,
      collectionRate,
      totalBooked,
      totalActual,
      totalVariance,
      totalAdjustments,
      activeCampaigns,
      campaignsByStatus,
      invoicesByStatus,
      uninvoicedLineItems,
      revenueByMonth,
      topCampaigns,
      recentPayments,
      invoicesDueThisWeek: invoicesDueThisWeek.length,
      invoicesDueThisWeekAmount,
      campaignsEndingThisWeek,
      isLoading,
    };
  }, [invoices, campaigns, lineItems, isLoading]);

  return metrics;
}
