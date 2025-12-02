export interface LineItem {
  id: string;
  campaignId: string;
  campaignName?: string;
  name: string;
  bookedAmount: number;
  actualAmount: number;
  adjustments: number;
  invoiceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LineItemFilters {
  name?: string;
  campaignId?: string;
  invoiceId?: string;
  page?: number;
  pageSize?: number;
  cursor?: unknown;
}
