export interface LineItem {
  id: string;
  campaignId: string;
  name: string;
  bookedAmount: number;
  actualAmount: number;
  adjustments: number;
  invoiceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface LineItemFilters {
  name?: string;
  campaignId?: string;
  invoiceId?: string;
  createdDateRange?: DateRange;
  page?: number;
  pageSize?: number;
  cursor?: unknown;
}
