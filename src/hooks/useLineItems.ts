import { lineItemService, type PaginatedResponse } from "@/services/firebase/lineItemService";
import type { LineItem, LineItemFilters } from "@/types/lineItem";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
export function useLineItemCount(filters?: Omit<LineItemFilters, 'page' | 'pageSize' | 'cursor'>, options?: { enabled?: boolean }) {
  return useQuery<number>({
    queryKey: ['lineItems', 'count', filters],
    queryFn: () => lineItemService.getTotalCount(filters),
    enabled: options?.enabled,
  });
}

// Hook to update line item adjustments
export function useUpdateLineItemAdjustments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, adjustments }: { id: string; adjustments: number }) =>
      lineItemService.updateAdjustments(id, adjustments),
    onSuccess: () => {
      // Invalidate and refetch line items queries
      queryClient.invalidateQueries({ queryKey: ['lineItems'] });
    },
  });
}
