import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { AlertCircle } from 'lucide-react';
import type { LineItem } from '@/types/lineItem';
import type { Invoice } from '@/types/invoice';

interface AddToInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItems: LineItem[];
  invoices: Invoice[];
  onConfirm: (invoiceId: string) => void;
  isAdding?: boolean;
}

export function AddToInvoiceDialog({
  open,
  onOpenChange,
  lineItems,
  invoices,
  onConfirm,
  isAdding = false,
}: AddToInvoiceDialogProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [error, setError] = useState('');

  // Get campaign ID from line items (assuming all are from same campaign)
  const campaignId = lineItems[0]?.campaignId;

  // Filter invoices to only show those from the same campaign
  const availableInvoices = useMemo(() => {
    return invoices.filter(inv => inv.campaignId === campaignId);
  }, [invoices, campaignId]);

  // Calculate totals for selected line items
  const totals = useMemo(() => {
    const booked = lineItems.reduce((sum, item) => sum + item.bookedAmount, 0);
    const actual = lineItems.reduce((sum, item) => sum + item.actualAmount, 0);
    const adjustments = lineItems.reduce((sum, item) => sum + item.adjustments, 0);
    const total = actual + adjustments;

    return { booked, actual, adjustments, total };
  }, [lineItems]);

  const handleSubmit = () => {
    if (!selectedInvoiceId) {
      setError('Please select an invoice');
      return;
    }

    setError('');
    onConfirm(selectedInvoiceId);
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedInvoiceId('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to Existing Invoice</DialogTitle>
          <DialogDescription>
            Add {lineItems.length} line item{lineItems.length > 1 ? 's' : ''} to an existing invoice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Line Items Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm font-semibold mb-3 text-foreground">Selected Line Items Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Count:</span>
                <span className="font-medium">{lineItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Booked:</span>
                <span className="font-medium">${totals.booked.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Actual:</span>
                <span className="font-medium">${totals.actual.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Adjustments:</span>
                <span className={`font-medium ${totals.adjustments < 0 ? 'text-red-600' :
                  totals.adjustments > 0 ? 'text-green-600' : ''
                  }`}>
                  {totals.adjustments < 0 ? '-' : totals.adjustments > 0 ? '+' : ''}
                  ${Math.abs(totals.adjustments).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground font-medium">Total Amount:</span>
                <span className="font-semibold">${totals.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Invoice Selection */}
          <div className="space-y-2">
            <Label htmlFor="invoice">
              Select Invoice <span className="text-destructive">*</span>
            </Label>
            {availableInvoices.length === 0 ? (
              <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">No Invoices Available</p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                    There are no invoices from the same campaign. Please create a new invoice instead.
                  </p>
                </div>
              </div>
            ) : (
              <Select
                value={selectedInvoiceId}
                onValueChange={(value) => {
                  setSelectedInvoiceId(value);
                  setError('');
                }}
                disabled={isAdding}
              >
                <SelectTrigger id="invoice">
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent>
                  {availableInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {invoice.status.toUpperCase()} - ${invoice.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Only invoices from the same campaign are shown
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isAdding || !selectedInvoiceId || availableInvoices.length === 0}
          >
            {isAdding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Adding...
              </>
            ) : (
              'Add to Invoice'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
