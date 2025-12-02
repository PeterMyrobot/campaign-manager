import { useParams, useNavigate } from 'react-router-dom'
import { useCampaign } from '@/hooks/useCampaigns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: campaign, isLoading, isError } = useCampaign(id)

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (isError || !campaign) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The campaign you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    )
  }

  const variantMap = {
    draft: "secondary" as const,
    active: "default" as const,
    completed: "outline" as const,
    cancelled: "destructive" as const,
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/campaigns')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>

        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <Badge variant={variantMap[campaign.status]}>
            <span className="capitalize">{campaign.status}</span>
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Campaign Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Campaign ID</p>
              <p className="text-base">{campaign.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-base capitalize">{campaign.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Start Date</p>
              <p className="text-base">
                {campaign.startDate?.toLocaleDateString() || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">End Date</p>
              <p className="text-base">
                {campaign.endDate?.toLocaleDateString() || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created At</p>
              <p className="text-base">
                {campaign.createdAt?.toLocaleDateString() || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Updated At</p>
              <p className="text-base">
                {campaign.updatedAt?.toLocaleDateString() || 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Related Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Invoices</p>
              {campaign.invoiceIds.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {campaign.invoiceIds.map((invoiceId) => (
                    <li key={invoiceId} className="text-sm">{invoiceId}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No invoices</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Line Items</p>
              {campaign.lineItemIds.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {campaign.lineItemIds.map((lineItemId) => (
                    <li key={lineItemId} className="text-sm">{lineItemId}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No line items</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CampaignDetail
