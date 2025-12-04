import { useState } from 'react';
import { useLineItems } from '@/hooks/useLineItems';
import { useUpdateLineItemAdjustments } from '@/hooks/useLineItems';
import { useUpdateInvoiceAmounts } from '@/hooks/useInvoices';
import type { LineItem } from '@/types/lineItem';
import type { ColumnDef, Row } from '@tanstack/react-table';
import DataTable from '@/components/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceLineItemsTableProps {
  invoiceId: string;
  invoiceStatus?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  onTotalUpdate?: (newTotal: number) => void;
}

function InvoiceLineItemsTable({ invoiceId, invoiceStatus, onTotalUpdate }: InvoiceLineItemsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Fetch line items for this invoice
  const { data: response, isLoading } = useLineItems({ invoiceId, pageSize: 100 });
  const lineItems = response?.data ?? [];

  // Mutations
  const updateAdjustments = useUpdateLineItemAdjustments();
  const updateInvoiceAmounts = useUpdateInvoiceAmounts();

  // Check if adjustments can be edited (only for draft or overdue invoices)
  const canEditAdjustments = invoiceStatus === 'draft' || invoiceStatus === 'overdue';

  const handleEditClick = (lineItem: LineItem) => {
    if (!canEditAdjustments) return;
    setEditingId(lineItem.id);
    setEditValue(lineItem.adjustments.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (lineItem: LineItem) => {
    const newAdjustment = parseFloat(editValue);

    if (isNaN(newAdjustment)) {
      toast.error('Invalid number', {
        description: 'Please enter a valid number for the adjustment',
      });
      return;
    }

    try {
      // Update the line item adjustment
      await updateAdjustments.mutateAsync({
        id: lineItem.id,
        adjustments: newAdjustment,
      });

      // Calculate new invoice amounts
      const amounts = lineItems.reduce((acc, item) => {
        const adjustments = item.id === lineItem.id ? newAdjustment : item.adjustments;
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

      setEditingId(null);
      setEditValue('');

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
        const isEditing = editingId === lineItem.id;

        return (
          <div className="text-right text-sm">
            {isEditing ? (
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-32 h-8 text-right text-sm ml-auto"
                autoFocus
                step="0.01"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit(lineItem);
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
              />
            ) : (
              <span
                className={
                  lineItem.adjustments < 0 ? 'text-red-600' : lineItem.adjustments > 0 ? 'text-green-600' : ''
                }
              >
                {lineItem.adjustments < 0 ? '-' : lineItem.adjustments > 0 ? '+' : ''}$
                {Math.abs(lineItem.adjustments).toLocaleString()}
              </span>
            )}
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
        const isEditing = editingId === lineItem.id;

        return (
          <div className="flex items-center justify-center gap-1">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSaveEdit(lineItem)}
                  disabled={updateAdjustments.isPending || updateInvoiceAmounts.isPending}
                  className="h-7 w-7 p-0"
                >
                  {updateAdjustments.isPending || updateInvoiceAmounts.isPending ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-900"></div>
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={updateAdjustments.isPending || updateInvoiceAmounts.isPending}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEditClick(lineItem)}
                className="h-7 w-7 p-0"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
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
  );
}

export default InvoiceLineItemsTable;
