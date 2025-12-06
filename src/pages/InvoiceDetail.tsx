import { useParams, Link, useNavigate } from 'react-router-dom';
import { useInvoice } from '@/hooks/useInvoices';
import { useCampaignsContext } from '@/contexts/CampaignsContext';
import BaseLineItemsTable from '@/components/BaseLineItemsTable';
import ChangeLogList from '@/components/ChangeLogList';
import InfoRow from '@/components/InfoRow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar } from 'lucide-react';

function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const { campaigns } = useCampaignsContext();

  const campaign = campaigns.find(c => c.id === invoice?.campaignId);

  if (isLoading) {
    return (
      <div className="container h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container h-full flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Invoice not found</h2>
        <Button onClick={() => navigate('/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
      </div>
    );
  }

  const variantMap = {
    draft: "secondary" as const,
    sent: "default" as const,
    paid: "outline" as const,
    overdue: "destructive" as const,
    cancelled: "destructive" as const,
  };

  return (
    <div className="container h-full flex flex-col overflow-y-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/invoices')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{invoice.invoiceNumber}</h1>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={variantMap[invoice.status]}>
                <span className="capitalize">{invoice.status}</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="Campaign:"
                  value={
                    campaign ? (
                      <Link
                        to={`/campaigns/${invoice.campaignId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {campaign.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{invoice.campaignId}</span>
                    )
                  }
                />
                <InfoRow label="Client:" value={invoice.clientName} />
                <InfoRow label="Email:" value={invoice.clientEmail} />
                <InfoRow label="Currency:" value={invoice.currency} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="Booked Amount:"
                  value={`${invoice.currency} $${invoice.bookedAmount.toLocaleString()}`}
                />
                <InfoRow
                  label="Actual Amount:"
                  value={`${invoice.currency} $${invoice.actualAmount.toLocaleString()}`}
                />
                <InfoRow
                  label="Adjustments:"
                  value={
                    <span className={`font-medium ${invoice.totalAdjustments < 0 ? 'text-red-600' : invoice.totalAdjustments > 0 ? 'text-green-600' : ''}`}>
                      {invoice.totalAdjustments < 0 ? '-' : invoice.totalAdjustments > 0 ? '+' : ''}{invoice.currency} ${Math.abs(invoice.totalAdjustments).toLocaleString()}
                    </span>
                  }
                />
                <InfoRow
                  label="Difference (Actual - Booked):"
                  value={
                    <span className={`font-semibold ${(invoice.actualAmount - invoice.bookedAmount) < 0 ? 'text-red-600' : (invoice.actualAmount - invoice.bookedAmount) > 0 ? 'text-green-600' : ''}`}>
                      {(invoice.actualAmount - invoice.bookedAmount) < 0 ? '-' : (invoice.actualAmount - invoice.bookedAmount) > 0 ? '+' : ''}{invoice.currency} ${Math.abs(invoice.actualAmount - invoice.bookedAmount).toLocaleString()}
                    </span>
                  }
                  className="pt-2 border-t"
                />
                <InfoRow
                  label="Invoice Total:"
                  value={
                    <span className="text-xl font-bold">
                      {invoice.currency} ${invoice.totalAmount.toLocaleString()}
                    </span>
                  }
                  className="pt-2 border-t"
                />
                <div className="border-t pt-3 mt-3 space-y-2">
                  <InfoRow
                    label="Issue Date:"
                    value={invoice.issueDate?.toLocaleDateString()}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  <InfoRow
                    label="Due Date:"
                    value={invoice.dueDate?.toLocaleDateString()}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  {invoice.paidDate && (
                    <InfoRow
                      label="Paid Date:"
                      value={
                        <span className="font-medium text-green-600">
                          {invoice.paidDate.toLocaleDateString()}
                        </span>
                      }
                      icon={<Calendar className="h-4 w-4" />}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <BaseLineItemsTable
                mode="invoice"
                invoiceId={invoice.id}
                invoiceStatus={invoice.status}
                compact
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6 flex-1 overflow-y-auto">
          <ChangeLogList invoiceId={invoice.id} variant="full" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default InvoiceDetail;
