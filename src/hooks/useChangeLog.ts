import { changeLogService, type PaginatedResponse } from '@/services/firebase/changeLogService';
import type { ChangeLogEntry, ChangeLogFilters } from '@/types/changeLog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to get change logs by invoice ID
 */
export function useChangeLogsByInvoice(
  invoiceId: string | undefined,
  filters?: ChangeLogFilters
) {
  return useQuery<ChangeLogEntry[]>({
    queryKey: ['changeLogs', 'invoice', invoiceId, filters],
    queryFn: () =>
      invoiceId
        ? changeLogService.getByInvoice(invoiceId, filters)
        : Promise.resolve([]),
    enabled: !!invoiceId,
  });
}

/**
 * Hook to get change logs by line item ID
 */
export function useChangeLogsByLineItem(
  lineItemId: string | undefined,
  limitCount?: number
) {
  return useQuery<ChangeLogEntry[]>({
    queryKey: ['changeLogs', 'lineItem', lineItemId, limitCount],
    queryFn: () =>
      lineItemId
        ? changeLogService.getByLineItem(lineItemId, limitCount)
        : Promise.resolve([]),
    enabled: !!lineItemId,
  });
}

/**
 * Hook to get change logs by campaign ID
 */
export function useChangeLogsByCampaign(
  campaignId: string | undefined,
  filters?: ChangeLogFilters
) {
  return useQuery<ChangeLogEntry[]>({
    queryKey: ['changeLogs', 'campaign', campaignId, filters],
    queryFn: () =>
      campaignId
        ? changeLogService.getByCampaign(campaignId, filters)
        : Promise.resolve([]),
    enabled: !!campaignId,
  });
}

/**
 * Hook to get change logs with cursor-based pagination
 */
export function useChangeLogsWithCursor(filters: ChangeLogFilters) {
  return useQuery<PaginatedResponse<ChangeLogEntry>>({
    queryKey: ['changeLogs', 'cursor', filters],
    queryFn: () => changeLogService.getWithCursor(filters),
  });
}

/**
 * Hook to get recent change logs
 */
export function useRecentChangeLogs(limitCount: number = 10) {
  return useQuery<ChangeLogEntry[]>({
    queryKey: ['changeLogs', 'recent', limitCount],
    queryFn: () => changeLogService.getRecent(limitCount),
  });
}

/**
 * Hook to create a new change log entry
 */
export function useCreateChangeLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>) =>
      changeLogService.create(entry),
    onSuccess: () => {
      // Invalidate all change log queries to refetch
      queryClient.invalidateQueries({ queryKey: ['changeLogs'] });
    },
  });
}
