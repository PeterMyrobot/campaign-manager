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
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { LineItem } from '@/types/lineItem';
import type { Invoice } from '@/types/invoice';

interface MoveToInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItems: LineItem[];
  invoices: Invoice[];
  onConfirm: (toInvoiceId: string) => void;
  isMoving?: boolean;
}

export function MoveToInvoiceDialog({
  open,
  onOpenChange,
  lineItems,
  invoices,
  onConfirm,
  isMoving = false,
}: MoveToInvoiceDialogProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [error, setError] = useState('');

  // Get campaign ID from line items (assuming all are from same campaign)
  const campaignId = lineItems[0]?.campaignId;

  // Get the source invoice ID (all line items should be from the same invoice)
  const sourceInvoiceId = lineItems[0]?.invoiceId;

  // Find source invoice
  const sourceInvoice = useMemo(() => {
    return invoices.find(inv => inv.id === sourceInvoiceId);
  }, [invoices, sourceInvoiceId]);

  // Filter invoices to only show those from the same campaign and exclude source invoice
  const availableInvoices = useMemo(() => {
    return invoices.filter(inv =>
      inv.campaignId === campaignId &&
      inv.id !== sourceInvoiceId
    );
  }, [invoices, campaignId, sourceInvoiceId]);

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
      setError('Please select a destination invoice');
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
          <DialogTitle>Move to Different Invoice</DialogTitle>
          <DialogDescription>
            Move {lineItems.length} line item{lineItems.length > 1 ? 's' : ''} to a different invoice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Invoice Info */}
          {sourceInvoice && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm font-semibold mb-2 text-foreground">Moving From</div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="font-medium">{sourceInvoice.invoiceNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {sourceInvoice.status.toUpperCase()} - ${sourceInvoice.totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* Destination Invoice Selection */}
          <div className="space-y-2">
            <Label htmlFor="destination-invoice">
              Destination Invoice <span className="text-destructive">*</span>
            </Label>
            {availableInvoices.length === 0 ? (
              <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">No Invoices Available</p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                    There are no other invoices from the same campaign to move these items to.
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
                disabled={isMoving}
              >
                <SelectTrigger id="destination-invoice">
                  <SelectValue placeholder="Select destination invoice" />
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

          {/* Visual indicator */}
          {sourceInvoice && selectedInvoiceId && (
            <div className="flex items-center justify-center gap-3 p-3 bg-primary/5 rounded-lg">
              <div className="text-sm font-medium">{sourceInvoice.invoiceNumber}</div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">
                {availableInvoices.find(inv => inv.id === selectedInvoiceId)?.invoiceNumber}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isMoving || !selectedInvoiceId || availableInvoices.length === 0}
          >
            {isMoving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Moving...
              </>
            ) : (
              'Move to Invoice'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
