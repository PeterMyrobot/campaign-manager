import { useLineItems, useLineItemCount } from '@/hooks/useLineItems'
import { useCampaignsContext } from '@/contexts/CampaignsContext'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangeFilter } from '@/components/ui/date-range-filter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FilterBadge } from '@/components/FilterBadge'
import DataTable from '@/components/DataTable'
import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter } from 'lucide-react'
import type { LineItemFilters, LineItem } from '@/types/lineItem'
import type { RowSelectionState, Row, Table } from '@tanstack/react-table'
import type { Campaign } from '@/types/campaign'

type EnrichedLineItem = LineItem & {
  campaignName?: string;
}

const columns = [
  {
    id: "select",
    header: ({ table }: { table: Table<EnrichedLineItem> }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Line Item Name",
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
      return (
        <div className="font-medium">{row.getValue("name")}</div>
      );
    },
  },
  {
    accessorKey: "campaignId",
    header: "Campaign",
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
      const campaignId = row.getValue("campaignId") as string;
      const campaignName = row.original.campaignName;
      return (
        <Link
          to={`/campaigns/${campaignId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {campaignName || campaignId}
        </Link>
      );
    },
  },
  {
    accessorKey: "bookedAmount",
    header: () => <div className="text-right">Booked Amount</div>,
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
      const amount = row.getValue("bookedAmount") as number;
      return <div className="text-right">${amount.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "actualAmount",
    header: () => <div className="text-right">Actual Amount</div>,
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
      const amount = row.getValue("actualAmount") as number;
      return <div className="text-right">${amount.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "adjustments",
    header: () => <div className="text-right">Adjustments</div>,
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
      const amount = row.getValue("adjustments") as number;
      const isNegative = amount < 0;
      return (
        <div className={`text-right ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
          {isNegative ? '-' : '+'}${Math.abs(amount).toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
]

const enrichLineItemData = (data: LineItem[], campaigns: Campaign[]): EnrichedLineItem[] => {
  // Create a map for O(1) campaign lookup
  const campaignMap = new Map(campaigns.map(c => [c.id, c.name]))

  // Enrich each line item with campaign name
  return data.map(lineItem => ({
    ...lineItem,
    campaignName: campaignMap.get(lineItem.campaignId),
  }))
}

function LineItems() {
  const { campaigns } = useCampaignsContext()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get campaignId from URL params
  const campaignIdFromUrl = searchParams.get('campaignId') || undefined

  // Data filters (non-pagination)
  const [dataFilters, setDataFilters] = useState<Omit<LineItemFilters, 'page' | 'pageSize' | 'cursor'>>({
    campaignId: campaignIdFromUrl,
  })

  // Cursor-based pagination hook
  const { pagination, setPagination, cursor, setLastDoc, reset } = useCursorPagination({
    initialPageSize: 100,
  })

  // Fetch line items with pagination
  const { data: response, isLoading } = useLineItems({
    ...dataFilters,
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    cursor,
  })

  // Update lastDoc when response arrives
  useEffect(() => {
    if (response?.lastDoc) {
      setLastDoc(response.lastDoc)
    }
  }, [response?.lastDoc, setLastDoc])

  // Enrich line items with campaign names
  const enrichedLineItems = useMemo(
    () => enrichLineItemData(response?.data ?? [], campaigns),
    [response?.data, campaigns]
  )

  // Fetch total count (only depends on data filters, not pagination)
  const { data: totalCount = 0 } = useLineItemCount(dataFilters)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handleFilterChange = (updates: Partial<LineItemFilters>) => {
    setDataFilters(prev => ({
      ...prev,
      ...updates,
    }))

    // Update URL params if campaignId changes
    if ('campaignId' in updates) {
      if (updates.campaignId) {
        searchParams.set('campaignId', updates.campaignId)
      } else {
        searchParams.delete('campaignId')
      }
      setSearchParams(searchParams)
    }

    // Reset pagination when filters change
    reset()
  }

  // Calculate active filter count
  const activeFilterCount =
    (dataFilters.campaignId ? 1 : 0) +
    (dataFilters.createdDateRange ? 1 : 0)

  const formatDateRange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      return `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
    } else if (range.from) {
      return `From ${range.from.toLocaleDateString()}`
    } else if (range.to) {
      return `To ${range.to.toLocaleDateString()}`
    }
    return ''
  }

  return (
    <div className='container h-full flex flex-col'>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Line Items</h1>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-2 h-5 px-1 min-w-5 flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Filters</h4>
                <p className="text-sm text-muted-foreground">
                  Refine your line item search
                </p>
              </div>

              <div className="space-y-4">
                {/* Campaign Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Campaign</label>
                  <Select
                    value={dataFilters.campaignId || "all"}
                    onValueChange={(value) => {
                      handleFilterChange({
                        campaignId: value === "all" ? undefined : value,
                      })
                    }}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="All campaigns">
                        {dataFilters.campaignId
                          ? (() => {
                              const campaign = campaigns.find(c => c.id === dataFilters.campaignId)
                              const name = campaign?.name || ''
                              return name.length > 25 ? `${name.slice(0, 25)}...` : name
                            })()
                          : "All campaigns"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-w-[280px]">
                      <SelectItem value="all">All campaigns</SelectItem>
                      {campaigns.map((campaign) => {
                        const isLong = campaign.name.length > 35
                        const displayName = isLong ? `${campaign.name.slice(0, 35)}...` : campaign.name

                        return (
                          <TooltipProvider key={campaign.id} delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SelectItem value={campaign.id} className="cursor-pointer">
                                  <span className="block truncate max-w-[240px]">{displayName}</span>
                                </SelectItem>
                              </TooltipTrigger>
                              {isLong && (
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="break-words">{campaign.name}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Created Date Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Created Date</label>
                  <DateRangeFilter
                    value={dataFilters.createdDateRange}
                    onChange={(range) => {
                      handleFilterChange({ createdDateRange: range })
                    }}
                    placeholder="Select date range"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {dataFilters.campaignId && (
            <FilterBadge
              label="Campaign"
              value={campaigns.find(c => c.id === dataFilters.campaignId)?.name || dataFilters.campaignId}
              onRemove={() => handleFilterChange({ campaignId: undefined })}
            />
          )}
          {dataFilters.createdDateRange && (
            <FilterBadge
              label="Created Date"
              value={formatDateRange(dataFilters.createdDateRange)}
              onRemove={() => handleFilterChange({ createdDateRange: undefined })}
            />
          )}
        </div>
      )}

      <div className='flex-1 min-h-0'>
        <DataTable
          data={enrichedLineItems}
          columns={columns}
          setRowSelection={setRowSelection}
          rowSelection={rowSelection}
          pagination={pagination}
          setPagination={setPagination}
          totalCount={totalCount}
          isLoading={isLoading}
          enableGlobalSearch={true}
          globalSearchPlaceholder="Search line items... (searches current page)"
          pageSizeOptions={[1, 5, 10, 20, 50, 100]}
        />
      </div>
    </div>
  )
}

export default LineItems
