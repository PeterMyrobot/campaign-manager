import { formatDistanceToNow } from 'date-fns';
import { FileEdit, FilePlus, FileX, ArrowRightLeft } from 'lucide-react';
import type { ChangeLogEntry } from '@/types/changeLog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChangeLogEntryProps {
  entry: ChangeLogEntry;
  variant?: 'default' | 'compact';
  showLineItemName?: boolean;
}

function ChangeLogEntryComponent({ entry, variant = 'default', showLineItemName = true }: ChangeLogEntryProps) {
  // Determine icon and color based on change type
  const getChangeTypeInfo = () => {
    switch (entry.changeType) {
      case 'adjustment_created':
        return {
          icon: <FilePlus className="h-4 w-4" />,
          label: 'Adjustment Created',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        };
      case 'adjustment_updated':
        return {
          icon: <FileEdit className="h-4 w-4" />,
          label: 'Adjustment Updated',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        };
      case 'adjustment_deleted':
        return {
          icon: <FileX className="h-4 w-4" />,
          label: 'Adjustment Deleted',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
        };
      case 'line_item_moved':
        return {
          icon: <ArrowRightLeft className="h-4 w-4" />,
          label: 'Line Item Moved',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
        };
      default:
        return {
          icon: <FileEdit className="h-4 w-4" />,
          label: 'Change',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
        };
    }
  };

  const typeInfo = getChangeTypeInfo();

  // Format amounts
  const formatAmount = (amount: number) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    return {
      display: `${isNegative ? '-' : '+'}$${absAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      className: isNegative ? 'text-red-600' : amount > 0 ? 'text-green-600' : 'text-gray-600',
    };
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return date.toLocaleDateString();
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-start gap-3 py-2 border-b last:border-b-0">
        <div className={`${typeInfo.bgColor} p-2 rounded-full ${typeInfo.color}`}>
          {typeInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{typeInfo.label}</span>
            <span className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</span>
          </div>
          {showLineItemName && entry.lineItemName && (
            <div className="text-sm text-muted-foreground truncate">{entry.lineItemName}</div>
          )}
          {entry.changeType !== 'line_item_moved' && entry.difference !== 0 && (
            <div className="text-sm">
              <span className={formatAmount(entry.difference).className}>
                {formatAmount(entry.difference).display}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default (full) variant
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`${typeInfo.bgColor} p-3 rounded-full ${typeInfo.color} flex-shrink-0`}>
            {typeInfo.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{typeInfo.label}</h4>
                  <Badge variant="outline" className="text-xs">
                    {entry.invoiceNumber}
                  </Badge>
                </div>
                {showLineItemName && entry.lineItemName && (
                  <p className="text-sm text-muted-foreground mt-1">{entry.lineItemName}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTimestamp(entry.timestamp)}
              </span>
            </div>

            {/* Change Details */}
            {entry.changeType === 'line_item_moved' ? (
              <div className="bg-muted/30 p-3 rounded-md mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">From:</span>
                  <Badge variant="secondary">{entry.previousInvoiceNumber}</Badge>
                  <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">To:</span>
                  <Badge variant="secondary">{entry.invoiceNumber}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Line Item Details at Time of Move:
                </div>
                <div className="flex gap-4 mt-1 text-xs">
                  <span>Booked: ${entry.bookedAmountAtTime.toLocaleString()}</span>
                  <span>Actual: ${entry.actualAmountAtTime.toLocaleString()}</span>
                  {entry.previousAmount !== 0 && (
                    <span>Adjustment: {formatAmount(entry.previousAmount).display}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 p-3 rounded-md mb-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Previous</div>
                    <div className={formatAmount(entry.previousAmount).className}>
                      {formatAmount(entry.previousAmount).display}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">New</div>
                    <div className={formatAmount(entry.newAmount).className}>
                      {formatAmount(entry.newAmount).display}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Change</div>
                    <div className={`font-semibold ${formatAmount(entry.difference).className}`}>
                      {formatAmount(entry.difference).display}
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  Reference Amounts: Booked ${entry.bookedAmountAtTime.toLocaleString()} • Actual $
                  {entry.actualAmountAtTime.toLocaleString()}
                </div>
              </div>
            )}

            {/* Comment */}
            {entry.comment && (
              <div className="mt-3 p-3 bg-muted/20 rounded-md border-l-2 border-muted-foreground/30">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground mt-0.5">💬</span>
                  <p className="text-sm text-muted-foreground flex-1">{entry.comment}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              {entry.userName && (
                <span>
                  By: <span className="font-medium">{entry.userName}</span>
                </span>
              )}
              <span>•</span>
              <span>{entry.timestamp.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ChangeLogEntryComponent;
