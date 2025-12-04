import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { LineItem } from '@/types/lineItem';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItems: Array<LineItem & { campaignName?: string }>;
  onConfirm: (data: {
    clientName: string;
    clientEmail: string;
    issueDate: Date;
    dueDate: Date;
    currency: string;
  }) => void;
  isCreating?: boolean;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  lineItems,
  onConfirm,
  isCreating = false,
}: CreateInvoiceDialogProps) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default: 30 days from now
    return date;
  });
  const [currency, setCurrency] = useState('USD');

  // Calculate totals
  const bookedAmount = lineItems.reduce((sum, item) => sum + item.bookedAmount, 0);
  const actualAmount = lineItems.reduce((sum, item) => sum + item.actualAmount, 0);
  const totalAdjustments = lineItems.reduce((sum, item) => sum + item.adjustments, 0);
  const totalAmount = actualAmount + totalAdjustments;

  const handleSubmit = () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      return;
    }

    onConfirm({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      issueDate,
      dueDate,
      currency,
    });
  };

  const campaignName = lineItems[0]?.campaignName || 'Unknown Campaign';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice from {lineItems.length} selected line item{lineItems.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Campaign Info */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm font-medium mb-2">Campaign</div>
            <div className="text-sm text-muted-foreground">{campaignName}</div>
          </div>

          {/* Line Items Preview */}
          <div>
            <div className="text-sm font-medium mb-2">Line Items ({lineItems.length})</div>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-right p-2">Booked</th>
                      <th className="text-right p-2">Actual</th>
                      <th className="text-right p-2">Adjustments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-2">{item.name}</td>
                        <td className="text-right p-2">${item.bookedAmount.toLocaleString()}</td>
                        <td className="text-right p-2">${item.actualAmount.toLocaleString()}</td>
                        <td className="text-right p-2">
                          <span className={item.adjustments < 0 ? 'text-red-600' : item.adjustments > 0 ? 'text-green-600' : ''}>
                            {item.adjustments < 0 ? '-' : item.adjustments > 0 ? '+' : ''}${Math.abs(item.adjustments).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="text-sm font-medium mb-3">Financial Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booked Amount:</span>
                <span className="font-medium">${bookedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Amount:</span>
                <span className="font-medium">${actualAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Adjustments:</span>
                <span className={`font-medium ${totalAdjustments < 0 ? 'text-red-600' : totalAdjustments > 0 ? 'text-green-600' : ''}`}>
                  {totalAdjustments < 0 ? '-' : totalAdjustments > 0 ? '+' : ''}${Math.abs(totalAdjustments).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>Invoice Total:</span>
                <span className="text-lg">${totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientEmail">Client Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                required
              />
            </div>
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Issue Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(issueDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={issueDate}
                    onSelect={(date) => date && setIssueDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dueDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => date && setDueDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Currency */}
          <div className="grid gap-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
              maxLength={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!clientName.trim() || !clientEmail.trim() || isCreating}
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Invoice'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
