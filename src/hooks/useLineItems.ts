import { lineItemService, type PaginatedResponse } from "@/services/firebase/lineItemService";
import type { LineItem, LineItemFilters } from "@/types/lineItem";
import { useQuery } from "@tanstack/react-query";

export function useLineItems(filters?: LineItemFilters) {
  return useQuery<PaginatedResponse<LineItem>>({
    queryKey: ['lineItems', filters],
    queryFn: () => lineItemService.getByFilter(filters ?? {}),
  });
}

// Hook to get a single line item by ID
export function useLineItem(id: string | undefined) {
  return useQuery<LineItem | null>({
    queryKey: ['lineItems', id],
    queryFn: () => id ? lineItemService.getById(id) : Promise.resolve(null),
    enabled: !!id,
  });
}

// Hook to get line item count with filters
export function useLineItemCount(filters?: Omit<LineItemFilters, 'page' | 'pageSize' | 'cursor'>) {
  return useQuery<number>({
    queryKey: ['lineItems', 'count', filters],
    queryFn: () => lineItemService.getTotalCount(filters),
  });
}
