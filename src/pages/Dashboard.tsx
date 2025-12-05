import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Target,
  ChevronRight,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';

// Chart configurations
const revenueChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

const CAMPAIGN_STATUS_COLORS = {
  active: 'var(--chart-1)',
  draft: 'var(--chart-2)',
  completed: 'var(--chart-3)',
  cancelled: 'var(--chart-4)',
};

const INVOICE_STATUS_COLORS = {
  paid: 'var(--chart-3)',
  sent: 'var(--chart-1)',
  draft: 'var(--chart-2)',
  overdue: 'var(--chart-5)',
  cancelled: 'var(--chart-4)',
};

function Dashboard() {
  const metrics = useDashboardMetrics();

  if (metrics.isLoading) {
    return (
      <div className="container h-full overflow-y-auto py-8">
        <div className="mb-6">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Prepare chart data
  const campaignStatusData = Object.entries(metrics.campaignsByStatus).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
    fill: CAMPAIGN_STATUS_COLORS[status as keyof typeof CAMPAIGN_STATUS_COLORS] || 'hsl(var(--chart-5))',
  }));

  const invoiceStatusData = Object.entries(metrics.invoicesByStatus).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
    fill: INVOICE_STATUS_COLORS[status as keyof typeof INVOICE_STATUS_COLORS] || 'hsl(var(--chart-5))',
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="container h-full overflow-y-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of campaigns, invoices, and financial performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From paid invoices
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(metrics.outstandingRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(metrics.overdueRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.overdueCount} {metrics.overdueCount === 1 ? 'invoice' : 'invoices'}
            </p>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(metrics.collectionRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Payment efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Variance Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance Variance</CardTitle>
          <CardDescription>Actual vs Booked amounts and adjustments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Booked Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(metrics.totalBooked)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Actual Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(metrics.totalActual)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Variance</p>
              <div className="flex items-center gap-1">
                <p className={`text-lg font-bold ${metrics.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.totalVariance >= 0 ? '+' : ''}{formatCurrency(metrics.totalVariance)}
                </p>
                {metrics.totalVariance >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Adjustments</p>
              <p className={`text-lg font-semibold ${metrics.totalAdjustments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.totalAdjustments >= 0 ? '+' : ''}{formatCurrency(metrics.totalAdjustments)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue from paid invoices</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {metrics.revenueByMonth.length > 0 ? (
              <ChartContainer config={revenueChartConfig} className="h-full w-full">
                <BarChart data={metrics.revenueByMonth}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.substring(0, 3)}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Status</CardTitle>
            <CardDescription>Distribution of campaigns by status</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {campaignStatusData.length > 0 ? (
              <ChartContainer config={{}} className="h-full w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={campaignStatusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {campaignStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No campaign data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status Bar Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Status Distribution</CardTitle>
          <CardDescription>Number of invoices by status</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px]">
          {invoiceStatusData.length > 0 ? (
            <ChartContainer config={{}} className="h-full w-full">
              <BarChart data={invoiceStatusData} layout="vertical">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="status"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {invoiceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No invoice data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: Top Campaigns and Urgent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Top Campaigns by Revenue</CardTitle>
            <CardDescription>Highest earning campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.topCampaigns.length > 0 ? (
              <div className="space-y-3">
                {metrics.topCampaigns.map((campaign, index) => (
                  <Link
                    key={campaign.id}
                    to={`/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-green-600">{formatCurrency(campaign.revenue)}</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No campaign data available</p>
            )}
          </CardContent>
        </Card>

        {/* Urgent Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Urgent Actions</CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Overdue Invoices */}
              {metrics.overdueCount > 0 && (
                <Link
                  to="/invoices?status=overdue"
                  className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-100">
                        {metrics.overdueCount} Overdue {metrics.overdueCount === 1 ? 'Invoice' : 'Invoices'}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {formatCurrency(metrics.overdueRevenue)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-600" />
                </Link>
              )}

              {/* Invoices Due This Week */}
              {metrics.invoicesDueThisWeek > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        {metrics.invoicesDueThisWeek} {metrics.invoicesDueThisWeek === 1 ? 'Invoice' : 'Invoices'} Due This Week
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        {formatCurrency(metrics.invoicesDueThisWeekAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Campaigns Ending This Week */}
              {metrics.campaignsEndingThisWeek > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        {metrics.campaignsEndingThisWeek} {metrics.campaignsEndingThisWeek === 1 ? 'Campaign' : 'Campaigns'} Ending This Week
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Prepare invoices
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Uninvoiced Line Items */}
              {metrics.uninvoicedLineItems > 0 && (
                <Link
                  to="/line-items?invoiceId=not-invoiced"
                  className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">
                        {metrics.uninvoicedLineItems} Uninvoiced Line {metrics.uninvoicedLineItems === 1 ? 'Item' : 'Items'}
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Billing backlog
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-yellow-600" />
                </Link>
              )}

              {/* No urgent actions */}
              {metrics.overdueCount === 0 &&
                metrics.invoicesDueThisWeek === 0 &&
                metrics.campaignsEndingThisWeek === 0 &&
                metrics.uninvoicedLineItems === 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-medium text-green-900 dark:text-green-100">
                      No urgent actions required
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
