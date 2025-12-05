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

// Hook to update invoice amounts
export function useUpdateInvoiceAmounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amounts }: { id: string; amounts: { bookedAmount: number; actualAmount: number; totalAdjustments: number; totalAmount: number } }) =>
      invoiceService.updateAmounts(id, amounts),
    onSuccess: () => {
      // Invalidate and refetch invoice queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// Hook to update invoice status
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, paidDate }: { id: string; status: Invoice['status']; paidDate?: Date | null }) =>
      invoiceService.updateStatus(id, status, paidDate),
    onSuccess: () => {
      // Invalidate and refetch invoice queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// Hook to create invoice from line items
export function useCreateInvoiceFromLineItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      campaignId: string;
      lineItemIds: string[];
      clientName: string;
      clientEmail: string;
      issueDate: Date;
      dueDate: Date;
      currency: string;
      bookedAmount: number;
      actualAmount: number;
      totalAdjustments: number;
      totalAmount: number;
    }) => invoiceService.createFromLineItems(params),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['lineItems'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// Hook to get all invoices (for context/dropdowns)
export function useAllInvoices() {
  return useQuery<Invoice[]>({
    queryKey: ['invoices', 'all'],
    queryFn: async () => {
      const response = await invoiceService.getByFilter({ pageSize: 1000 });
      return response.data;
    },
  });
}

// Hook to add line items to an existing invoice
export function useAddLineItemsToInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      invoiceId: string;
      lineItemIds: string[];
    }) => invoiceService.addLineItems(params),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['lineItems'] });
    },
  });
}

// Hook to move line items from one invoice to another
export function useMoveLineItemsToInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      fromInvoiceId: string;
      toInvoiceId: string;
      lineItemIds: string[];
    }) => invoiceService.moveLineItems(params),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['lineItems'] });
    },
  });
}
