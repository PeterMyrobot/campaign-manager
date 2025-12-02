export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  invoiceIds: string[];
  lineItemIds: string[];
}

export type CampaignSortField = 'createdAt' | 'startDate' | 'endDate';
export type SortOrder = 'asc' | 'desc';

export type DateRangePreset =
  | 'all'
  | 'last7days'
  | 'last30days'
  | 'last3months'
  | 'last6months'
  | 'lastYear'
  | 'thisMonth'
  | 'thisQuarter'
  | 'thisYear'
  | 'custom';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface CampaignFilters {
  name?: string;
  statuses?: string[];
  // Date range filters for different fields
  startDateRange?: DateRange;
  endDateRange?: DateRange;
  createdDateRange?: DateRange;
  sortBy?: CampaignSortField;
  sortOrder?: SortOrder;
  // Pagination
  page?: number;
  pageSize?: number;
  cursor?: unknown; // Firestore document snapshot for cursor-based pagination
}
