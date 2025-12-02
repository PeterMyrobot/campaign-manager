import { campaignService, type PaginatedResponse } from "@/services/firebase/campaignService";
import type { Campaign, CampaignFilters } from "@/types/campaign";
import { useQuery } from "@tanstack/react-query";

export function useCampaigns(filters?: CampaignFilters) {
  return useQuery<PaginatedResponse<Campaign>>({
    queryKey: ['campaigns', filters],
    queryFn: () => campaignService.getByFilter(filters ?? {}),
  });
}

// Hook to get a single campaign by ID
export function useCampaign(id: string | undefined) {
  return useQuery<Campaign | null>({
    queryKey: ['campaigns', id],
    queryFn: () => id ? campaignService.getById(id) : Promise.resolve(null),
    enabled: !!id,
  });
}

// Hook to get campaign count with filters
export function useCampaignCount(filters?: Omit<CampaignFilters, 'page' | 'pageSize' | 'cursor'>) {
  return useQuery<number>({
    queryKey: ['campaigns', 'count', filters],
    queryFn: () => campaignService.getTotalCount(filters),
  });
}