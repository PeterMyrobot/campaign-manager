import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCampaign } from '@/hooks/useCampaigns'
import { useInvoices } from '@/hooks/useInvoices'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FileText, ListChecks, ChevronRight, DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { useMemo } from 'react'

function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: campaign, isLoading, isError } = useCampaign(id)

  // Fetch all invoices for this campaign
  const { data: invoicesResponse, isLoading: invoicesLoading } = useInvoices({
    campaignId: id,
    pageSize: 1000, // Get all invoices for financial calculations
  })

  // Calculate financial metrics
  const financials = useMemo(() => {
    const invoices = invoicesResponse?.data || []

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const totalBooked = invoices.reduce((sum, inv) => sum + inv.bookedAmount, 0)
    const totalActual = invoices.reduce((sum, inv) => sum + inv.actualAmount, 0)
    const totalPaid = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
    const totalOutstanding = invoices
      .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
    const totalAdjustments = invoices.reduce((sum, inv) => sum + inv.totalAdjustments, 0)
    const variance = totalActual - totalBooked
    const variancePercentage = totalBooked > 0 ? (variance / totalBooked) * 100 : 0

    // Get currency from first invoice, or default to USD
    const currency = invoices[0]?.currency || 'USD'

    // Count overdue invoices
    const overdueCount = invoices.filter(inv => inv.status === 'overdue').length

    return {
      totalRevenue,
      totalBooked,
      totalActual,
      totalPaid,
      totalOutstanding,
      totalAdjustments,
      variance,
      variancePercentage,
      currency,
      overdueCount,
    }
  }, [invoicesResponse])

  if (isLoading || invoicesLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (isError || !campaign) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The campaign you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    )
  }

  const variantMap = {
    draft: "secondary" as const,
    active: "default" as const,
    completed: "outline" as const,
    cancelled: "destructive" as const,
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/campaigns')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>

        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <Badge variant={variantMap[campaign.status]}>
            <span className="capitalize">{campaign.status}</span>
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financials.currency} ${financials.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {campaign.invoiceIds.length} {campaign.invoiceIds.length === 1 ? 'invoice' : 'invoices'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Booked Amount</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financials.currency} ${financials.totalBooked.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {financials.variance >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <p className={`text-xs ${financials.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {financials.variance >= 0 ? '+' : ''}{financials.variancePercentage.toFixed(1)}% variance
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {financials.currency} ${financials.totalPaid.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {financials.totalRevenue > 0 ? ((financials.totalPaid / financials.totalRevenue) * 100).toFixed(1) : 0}% collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {financials.currency} ${financials.totalOutstanding.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {financials.overdueCount > 0 && (
                  <span className="text-red-600">{financials.overdueCount} overdue</span>
                )}
                {financials.overdueCount === 0 && 'No overdue invoices'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Details and Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Basic information about this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Campaign ID</span>
                  <span className="text-sm font-medium">{campaign.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium capitalize">{campaign.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Start Date</span>
                  <span className="text-sm font-medium">
                    {campaign.startDate?.toLocaleDateString() || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">End Date</span>
                  <span className="text-sm font-medium">
                    {campaign.endDate?.toLocaleDateString() || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created At</span>
                  <span className="text-sm font-medium">
                    {campaign.createdAt?.toLocaleDateString() || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Updated At</span>
                  <span className="text-sm font-medium">
                    {campaign.updatedAt?.toLocaleDateString() || 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Variance and adjustments breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Booked Amount</span>
                  <span className="text-sm font-medium">
                    {financials.currency} ${financials.totalBooked.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Actual Amount</span>
                  <span className="text-sm font-medium">
                    {financials.currency} ${financials.totalActual.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Variance</span>
                  <span className={`text-sm font-semibold ${financials.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {financials.variance >= 0 ? '+' : ''}{financials.currency} ${Math.abs(financials.variance).toLocaleString()}
                    <span className="text-xs ml-1">({financials.variancePercentage >= 0 ? '+' : ''}{financials.variancePercentage.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Adjustments</span>
                  <span className={`text-sm font-medium ${financials.totalAdjustments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {financials.totalAdjustments >= 0 ? '+' : ''}{financials.currency} ${Math.abs(financials.totalAdjustments).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Payment Rate</span>
                  <span className="text-sm font-semibold">
                    {financials.totalRevenue > 0 ? ((financials.totalPaid / financials.totalRevenue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/invoices?campaignId=${campaign.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Invoices</CardTitle>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{campaign.invoiceIds.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {campaign.invoiceIds.length === 1 ? 'invoice' : 'invoices'} in this campaign
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/line-items?campaignId=${campaign.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Line Items</CardTitle>
              <ListChecks className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{campaign.lineItemIds.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {campaign.lineItemIds.length === 1 ? 'line item' : 'line items'} in this campaign
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices */}
        {invoicesResponse && invoicesResponse.data.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Latest invoices for this campaign</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/invoices?campaignId=${campaign.id}`)}
                >
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoicesResponse.data.slice(0, 5).map((invoice) => {
                  const variantMap = {
                    draft: "secondary" as const,
                    sent: "default" as const,
                    paid: "outline" as const,
                    overdue: "destructive" as const,
                    cancelled: "destructive" as const,
                  }

                  return (
                    <Link
                      key={invoice.id}
                      to={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-blue-600">{invoice.invoiceNumber}</p>
                          <Badge variant={variantMap[invoice.status]}>
                            <span className="capitalize">{invoice.status}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{invoice.clientName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {invoice.currency} ${invoice.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due: {invoice.dueDate?.toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default CampaignDetail
