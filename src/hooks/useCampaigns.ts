import { campaignService, type PaginatedResponse } from "@/services/firebase/campaignService";
import type { Campaign, CampaignFilters } from "@/types/campaign";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export function useCampaigns(filters?: CampaignFilters) {
  return useQuery<PaginatedResponse<Campaign>>({
    queryKey: ['campaigns', filters],
    queryFn: () => campaignService.getByFilter(filters ?? {}),
    placeholderData: keepPreviousData,
  });
}

// Hook to get campaign count with filters
export function useCampaignCount(filters?: Omit<CampaignFilters, 'page' | 'pageSize' | 'cursor'>) {
  return useQuery<number>({
    queryKey: ['campaigns', 'count', filters],
    queryFn: () => campaignService.getTotalCount(filters),
  });
}