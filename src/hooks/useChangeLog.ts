import { changeLogService } from '@/services/firebase/changeLogService';
import type { ChangeLogEntry, ChangeLogFilters } from '@/types/changeLog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to get change logs by invoice ID
 */
export function useChangeLogsByInvoice(invoiceId: string | undefined) {
  return useQuery<ChangeLogEntry[]>({
    queryKey: ['changeLogs', 'invoice', invoiceId],
    queryFn: () =>
      invoiceId
        ? changeLogService.getByInvoice(invoiceId)
        : Promise.resolve([]),
    enabled: !!invoiceId,
  });
}

/**
 * Hook to get all change logs
 */
export function useAllChangeLogs() {
  return useQuery<ChangeLogEntry[]>({
    queryKey: ['changeLogs', 'all'],
    queryFn: () => changeLogService.getAll(),
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

/**
 * Hook to get change logs with filters and pagination
 */
export function useChangeLogs(filters?: ChangeLogFilters) {
  return useQuery({
    queryKey: ['changeLogs', 'paginated', filters],
    queryFn: () => changeLogService.getByFilter(filters || {}),
  });
}

/**
 * Hook to get total count of change logs
 */
export function useChangeLogCount(filters?: Omit<ChangeLogFilters, 'page' | 'pageSize' | 'cursor'>) {
  return useQuery({
    queryKey: ['changeLogs', 'count', filters],
    queryFn: () => changeLogService.getTotalCount(filters),
  });
}
