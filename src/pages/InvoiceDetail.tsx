import { useParams, Link, useNavigate } from 'react-router-dom';
import { useInvoice, useUpdateInvoiceStatus } from '@/hooks/useInvoices';
import { useCampaignsContext } from '@/contexts/CampaignsContext';
import InvoiceLineItemsTable from '@/components/InvoiceLineItemsTable';
import InfoRow from '@/components/InfoRow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { Invoice } from '@/types/invoice';

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Cancelled', value: 'cancelled' },
];

function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const { campaigns } = useCampaignsContext();
  const updateStatus = useUpdateInvoiceStatus();

  const [selectedStatus, setSelectedStatus] = useState<Invoice['status'] | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const campaign = campaigns.find(c => c.id === invoice?.campaignId);

  const handleStatusChange = async (newStatus: Invoice['status']) => {
    if (!invoice || !id) return;

    setIsUpdating(true);
    try {
      const paidDate = newStatus === 'paid' ? new Date() : null;
      await updateStatus.mutateAsync({
        id,
        status: newStatus,
        paidDate,
      });
      setSelectedStatus('');
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update invoice status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

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

          <div className="flex items-center gap-2">
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as Invoice['status'])}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter(opt => opt.value !== invoice.status).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStatus && (
              <Button
                onClick={() => handleStatusChange(selectedStatus as Invoice['status'])}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceLineItemsTable
            invoiceId={invoice.id}
            invoiceStatus={invoice.status}
          />
        </CardContent>
      </Card>

    </div>
  );
}

export default InvoiceDetail;
