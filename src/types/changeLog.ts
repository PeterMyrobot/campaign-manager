export interface ChangeLogEntry {
  id: string;
  entityType: 'line_item' | 'invoice';
  entityId: string; // lineItemId or invoiceId
  changeType: 'adjustment_created' | 'adjustment_updated' | 'adjustment_deleted' | 'line_item_moved';

  // Amount tracking
  previousAmount: number;
  newAmount: number;
  difference: number;

  // Reference amounts (for context)
  bookedAmountAtTime: number;
  actualAmountAtTime: number;

  // Metadata
  comment: string;
  userId?: string; // For future user tracking
  userName?: string;
  timestamp: Date;

  // Related entities
  invoiceId: string;
  invoiceNumber: string;
  campaignId: string;
  lineItemName?: string;

  // Line item move specific fields
  previousInvoiceId?: string; // For line_item_moved: source invoice
  previousInvoiceNumber?: string; // For line_item_moved: source invoice number
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface ChangeLogFilters {
  entityId?: string;
  entityType?: 'line_item' | 'invoice';
  invoiceId?: string;
  campaignId?: string;
  changeType?: 'adjustment_created' | 'adjustment_updated' | 'adjustment_deleted' | 'line_item_moved';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  cursor?: unknown;
}
