import { campaignService } from "@/services/firebase/campaignService";
import { useQuery } from "@tanstack/react-query";

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignService.getAll,
  });
}