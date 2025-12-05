import { useState } from 'react';
import { useLineItems } from '@/hooks/useLineItems';
import { useUpdateLineItemAdjustments } from '@/hooks/useLineItems';
import { useUpdateInvoiceAmounts } from '@/hooks/useInvoices';
import { useInvoice } from '@/hooks/useInvoices';
import { useCreateChangeLog } from '@/hooks/useChangeLog';
import type { LineItem } from '@/types/lineItem';
import type { ColumnDef, Row } from '@tanstack/react-table';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { AdjustmentModal } from '@/components/AdjustmentModal';

interface InvoiceLineItemsTableProps {
  invoiceId: string;
  invoiceStatus?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  onTotalUpdate?: (newTotal: number) => void;
}

function InvoiceLineItemsTable({ invoiceId, invoiceStatus, onTotalUpdate }: InvoiceLineItemsTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(null);

  // Fetch line items for this invoice
  const { data: response, isLoading } = useLineItems({ invoiceId, pageSize: 100 });
  const lineItems = response?.data ?? [];

  // Fetch invoice details for modal
  const { data: invoice } = useInvoice(invoiceId);

  // Mutations
  const updateAdjustments = useUpdateLineItemAdjustments();
  const updateInvoiceAmounts = useUpdateInvoiceAmounts();

  // Check if adjustments can be edited (only for draft or overdue invoices)
  const canEditAdjustments = invoiceStatus === 'draft' || invoiceStatus === 'overdue';

  const handleEditClick = (lineItem: LineItem) => {
    if (!canEditAdjustments) return;
    setSelectedLineItem(lineItem);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedLineItem(null);
  };

  const handleSaveAdjustment = async (data: { newAdjustment: number; comment: string }) => {
    if (!selectedLineItem || !invoice) return;

    const { newAdjustment, comment } = data;

    try {
      // Update the line item adjustment
      await updateAdjustments.mutateAsync({
        id: selectedLineItem.id,
        adjustments: newAdjustment,
      });

      // Calculate new invoice amounts
      const amounts = lineItems.reduce((acc, item) => {
        const adjustments = item.id === selectedLineItem.id ? newAdjustment : item.adjustments;
        return {
          bookedAmount: acc.bookedAmount + item.bookedAmount,
          actualAmount: acc.actualAmount + item.actualAmount,
          totalAdjustments: acc.totalAdjustments + adjustments,
        };
      }, { bookedAmount: 0, actualAmount: 0, totalAdjustments: 0 });

      const totalAmount = amounts.actualAmount + amounts.totalAdjustments;

      // Update invoice amounts
      await updateInvoiceAmounts.mutateAsync({
        id: invoiceId,
        amounts: {
          bookedAmount: Math.round(amounts.bookedAmount * 100) / 100,
          actualAmount: Math.round(amounts.actualAmount * 100) / 100,
          totalAdjustments: Math.round(amounts.totalAdjustments * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
        },
      });

      // Notify parent component
      if (onTotalUpdate) {
        onTotalUpdate(Math.round(totalAmount * 100) / 100);
      }

      // Close modal
      handleModalClose();

      // Show success toast
      toast.success('Adjustment updated', {
        description: `Successfully updated adjustment to $${Math.abs(newAdjustment).toLocaleString()}`,
      });
    } catch (error) {
      console.error('Failed to update adjustment:', error);
      toast.error('Failed to update adjustment', {
        description: 'Please try again or contact support if the problem persists',
      });
    }
  };

  const columns: ColumnDef<LineItem>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }: { row: Row<LineItem> }) => (
        <div className="font-medium text-sm">{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'bookedAmount',
      header: () => <div className="text-right">Booked Amount</div>,
      cell: ({ row }: { row: Row<LineItem> }) => (
        <div className="text-right text-sm">${(row.getValue('bookedAmount') as number).toLocaleString()}</div>
      ),
    },
    {
      accessorKey: 'actualAmount',
      header: () => <div className="text-right">Actual Amount</div>,
      cell: ({ row }: { row: Row<LineItem> }) => (
        <div className="text-right text-sm">${(row.getValue('actualAmount') as number).toLocaleString()}</div>
      ),
    },
    {
      accessorKey: 'adjustments',
      header: () => <div className="text-right">Adjustments</div>,
      cell: ({ row }: { row: Row<LineItem> }) => {
        const lineItem = row.original;

        return (
          <div className="text-right text-sm">
            <span
              className={
                lineItem.adjustments < 0 ? 'text-red-600' : lineItem.adjustments > 0 ? 'text-green-600' : ''
              }
            >
              {lineItem.adjustments < 0 ? '-' : lineItem.adjustments > 0 ? '+' : ''}$
              {Math.abs(lineItem.adjustments).toLocaleString()}
            </span>
          </div>
        );
      },
    },
    {
      id: 'total',
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }: { row: Row<LineItem> }) => {
        const lineItem = row.original;
        const total = lineItem.actualAmount + lineItem.adjustments;
        return <div className="text-right font-medium text-sm">${total.toLocaleString()}</div>;
      },
    },
    ...(canEditAdjustments ? [{
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }: { row: Row<LineItem> }) => {
        const lineItem = row.original;

        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditClick(lineItem)}
              className="h-7 w-7 p-0"
              title="Edit adjustment"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    }] : []),
  ];

  if (isLoading) {
    return (
      <div className="bg-muted/30 p-4 rounded-md">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              {canEditAdjustments && <Skeleton className="h-10 w-16" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (lineItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No line items found for this invoice.
      </div>
    );
  }

  return (
    <>
      <div className="bg-muted/30 p-4 rounded-md h-full flex flex-col">
        <div className="mb-2 text-sm font-medium text-muted-foreground">
          Line Items ({lineItems.length})
        </div>
        <div className="flex-1 min-h-0">
          <DataTable
            data={lineItems}
            columns={columns}
            setRowSelection={() => {}}
            rowSelection={{}}
            pagination={{ pageIndex: 0, pageSize: lineItems.length }}
            setPagination={() => {}}
            totalCount={lineItems.length}
            isLoading={false}
            enableGlobalSearch={false}
            pageSizeOptions={[]}
          />
        </div>
      </div>

      {/* Adjustment Modal */}
      <AdjustmentModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        lineItem={selectedLineItem}
        invoiceId={invoiceId}
        invoiceNumber={invoice?.invoiceNumber || ''}
        campaignId={invoice?.campaignId || ''}
        onConfirm={handleSaveAdjustment}
        isSaving={createChangeLog.isPending || updateAdjustments.isPending || updateInvoiceAmounts.isPending}
      />
    </>
  );
}

export default InvoiceLineItemsTable;
