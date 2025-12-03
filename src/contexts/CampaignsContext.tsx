/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'
import { useAllCampaigns } from '@/hooks/useCampaigns'
import type { Campaign } from '@/types/campaign'

interface CampaignsContextType {
  campaigns: Campaign[]
  isLoading: boolean
  getCampaignName: (campaignId: string) => string | undefined
}

const CampaignsContext = createContext<CampaignsContextType | undefined>(undefined)

export function CampaignsProvider({ children }: { children: ReactNode }) {
  const { data: campaigns = [], isLoading } = useAllCampaigns()

  const getCampaignName = (campaignId: string): string | undefined => {
    return campaigns.find(c => c.id === campaignId)?.name
  }

  return (
    <CampaignsContext.Provider value={{ campaigns, isLoading, getCampaignName }}>
      {children}
    </CampaignsContext.Provider>
  )
}

export function useCampaignsContext() {
  const context = useContext(CampaignsContext)
  if (context === undefined) {
    throw new Error('useCampaignsContext must be used within a CampaignsProvider')
  }
  return context
}
