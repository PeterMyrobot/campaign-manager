import { invoiceService, type PaginatedResponse } from "@/services/firebase/invoiceService";
import type { Invoice, InvoiceFilters } from "@/types/invoice";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery<PaginatedResponse<Invoice>>({
    queryKey: ['invoices', filters],
    queryFn: () => invoiceService.getByFilter(filters ?? {}),
  });
}

// Hook to get a single invoice by ID
export function useInvoice(id: string | undefined) {
  return useQuery<Invoice | null>({
    queryKey: ['invoices', id],
    queryFn: () => id ? invoiceService.getById(id) : Promise.resolve(null),
    enabled: !!id,
  });
}

// Hook to get invoice count with filters
export function useInvoiceCount(filters?: Omit<InvoiceFilters, 'page' | 'pageSize' | 'cursor'>) {
  return useQuery<number>({
    queryKey: ['invoices', 'count', filters],
    queryFn: () => invoiceService.getTotalCount(filters),
  });
}

// Hook to update invoice total amount
export function useUpdateInvoiceTotalAmount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, totalAmount }: { id: string; totalAmount: number }) =>
      invoiceService.updateTotalAmount(id, totalAmount),
    onSuccess: () => {
      // Invalidate and refetch invoice queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
