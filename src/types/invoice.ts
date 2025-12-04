export interface Invoice {
  id: string;
  campaignId: string;
  invoiceNumber: string;
  lineItemIds: string[];
  adjustmentIds: string[];
  totalAmount: number;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  clientName: string;
  clientEmail: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InvoiceFilters {
  campaignId?: string;
  status?: string;
  statuses?: string[];
  page?: number;
  pageSize?: number;
  cursor?: unknown;
}
