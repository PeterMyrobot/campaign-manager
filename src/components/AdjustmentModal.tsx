import { useState, useEffect } from 'react';
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
import { Textarea } from './ui/textarea';
import { AlertCircle } from 'lucide-react';
import type { LineItem } from '@/types/lineItem';

interface AdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem: LineItem | null;
  invoiceId: string;
  invoiceNumber: string;
  campaignId: string;
  onConfirm: (data: {
    newAdjustment: number;
    comment: string;
  }) => void;
  isSaving?: boolean;
}

export function AdjustmentModal({
  open,
  onOpenChange,
  lineItem,
  invoiceId,
  invoiceNumber,
  campaignId,
  onConfirm,
  isSaving = false,
}: AdjustmentModalProps) {
  const [newAdjustment, setNewAdjustment] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  // Reset form when modal opens with new line item
  useEffect(() => {
    if (open && lineItem) {
      setNewAdjustment(lineItem.adjustments.toString());
      setComment('');
      setError('');
    }
  }, [open, lineItem]);

  if (!lineItem) return null;

  const currentTotal = lineItem.actualAmount + lineItem.adjustments;
  const parsedAdjustment = parseFloat(newAdjustment);
  const isValidNumber = !isNaN(parsedAdjustment);
  const newTotal = isValidNumber ? lineItem.actualAmount + parsedAdjustment : currentTotal;
  const difference = isValidNumber ? parsedAdjustment - lineItem.adjustments : 0;

  // Calculate if change is significant (> $1000 or > 20% of actual amount)
  const isSignificantChange =
    Math.abs(difference) > 1000 ||
    Math.abs(difference) > lineItem.actualAmount * 0.2;

  const handleSubmit = () => {
    // Validation
    if (!isValidNumber) {
      setError('Please enter a valid number');
      return;
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length > 500) {
      setError('Comment must be 500 characters or less');
      return;
    }

    if (parsedAdjustment === lineItem.adjustments) {
      setError('Adjustment value has not changed');
      return;
    }

    setError('');
    onConfirm({
      newAdjustment: parsedAdjustment,
      comment: trimmedComment,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && !isSaving) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Edit Adjustment</DialogTitle>
          <DialogDescription>
            {lineItem.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Financial Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm font-semibold mb-3 text-foreground">Current Financial Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booked Amount:</span>
                <span className="font-medium">${lineItem.bookedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Amount:</span>
                <span className="font-medium">${lineItem.actualAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Adjustment:</span>
                <span className={`font-medium ${lineItem.adjustments < 0 ? 'text-red-600' :
                    lineItem.adjustments > 0 ? 'text-green-600' : ''
                  }`}>
                  {lineItem.adjustments < 0 ? '-' : lineItem.adjustments > 0 ? '+' : ''}
                  ${Math.abs(lineItem.adjustments).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground font-medium">Current Total:</span>
                <span className="font-semibold">${currentTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* New Adjustment Input */}
          <div className="space-y-2">
            <Label htmlFor="adjustment">
              New Adjustment <span className="text-destructive">*</span>
            </Label>
            <Input
              id="adjustment"
              type="number"
              step="0.01"
              value={newAdjustment}
              onChange={(e) => {
                setNewAdjustment(e.target.value);
                setError('');
              }}
              placeholder="0.00"
              className="text-right font-mono"
              autoFocus
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Positive for additions, negative for deductions
            </p>
          </div>

          {/* New Total Preview */}
          {isValidNumber && (
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">New Total:</span>
                <span className="font-bold text-lg">${newTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-muted-foreground">Change:</span>
                <span className={`font-semibold ${difference < 0 ? 'text-red-600' :
                    difference > 0 ? 'text-green-600' :
                      'text-muted-foreground'
                  }`}>
                  {difference < 0 ? '-' : difference > 0 ? '+' : ''}
                  ${Math.abs(difference).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Significant Change Warning */}
          {isValidNumber && isSignificantChange && (
            <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">Significant Change</p>
                <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                  This adjustment is large ({Math.abs(difference) > 1000 ? 'over $1,000' : 'over 20% of actual amount'}).
                  Please ensure this is correct.
                </p>
              </div>
            </div>
          )}

          {/* Comment Field */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              Reason for Change
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setError('');
              }}
              placeholder="Explain why this adjustment is being made..."
              rows={4}
              maxLength={500}
              disabled={isSaving}
              className="resize-none"
            />
            <div className="flex justify-between text-xs">
              <span className={comment.trim().length === 0 ? 'text-muted-foreground' : 'text-foreground'}>
                {comment.length}/500 characters
              </span>
              {comment.trim().length > 0 && comment.trim().length < 10 && (
                <span className="text-amber-600">Comment seems short</span>
              )}
            </div>
          </div>

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
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !isValidNumber}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              'Save Adjustment'
            )}
          </Button>
        </DialogFooter>

        <div className="text-xs text-muted-foreground text-center pb-2">
          Press Ctrl+Enter to save
        </div>
      </DialogContent>
    </Dialog>
  );
}
