import { useState } from 'react';
import { useLineItems } from '@/hooks/useLineItems';
import { useUpdateLineItemAdjustments } from '@/hooks/useLineItems';
import { useUpdateInvoiceTotalAmount } from '@/hooks/useInvoices';
import type { LineItem } from '@/types/lineItem';
import type { ColumnDef, Row } from '@tanstack/react-table';
import DataTable from '@/components/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil } from 'lucide-react';

interface InvoiceLineItemsTableProps {
  invoiceId: string;
  onTotalUpdate?: (newTotal: number) => void;
}

function InvoiceLineItemsTable({ invoiceId, onTotalUpdate }: InvoiceLineItemsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Fetch line items for this invoice
  const { data: response, isLoading } = useLineItems({ invoiceId, pageSize: 100 });
  const lineItems = response?.data ?? [];

  // Mutations
  const updateAdjustments = useUpdateLineItemAdjustments();
  const updateInvoiceTotal = useUpdateInvoiceTotalAmount();

  const handleEditClick = (lineItem: LineItem) => {
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
      alert('Please enter a valid number');
      return;
    }

    try {
      // Update the line item adjustment
      await updateAdjustments.mutateAsync({
        id: lineItem.id,
        adjustments: newAdjustment,
      });

      // Calculate new invoice total
      const newTotal = lineItems.reduce((sum, item) => {
        const adjustments = item.id === lineItem.id ? newAdjustment : item.adjustments;
        return sum + item.actualAmount + adjustments;
      }, 0);

      // Update invoice total
      await updateInvoiceTotal.mutateAsync({
        id: invoiceId,
        totalAmount: Math.round(newTotal * 100) / 100,
      });

      // Notify parent component
      if (onTotalUpdate) {
        onTotalUpdate(Math.round(newTotal * 100) / 100);
      }

      setEditingId(null);
      setEditValue('');
    } catch (error) {
      console.error('Failed to update adjustment:', error);
      alert('Failed to update adjustment. Please try again.');
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
    {
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
                  disabled={updateAdjustments.isPending || updateInvoiceTotal.isPending}
                  className="h-7 w-7 p-0"
                >
                  {updateAdjustments.isPending || updateInvoiceTotal.isPending ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-900"></div>
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={updateAdjustments.isPending || updateInvoiceTotal.isPending}
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
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
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
    <div className="bg-muted/30 p-4 rounded-md">
      <div className="mb-2 text-sm font-medium text-muted-foreground">
        Line Items ({lineItems.length})
      </div>
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
  );
}

export default InvoiceLineItemsTable;
