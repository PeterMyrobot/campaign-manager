import { useLineItems, useLineItemCount } from '@/hooks/useLineItems'
import { useCampaignsContext } from '@/contexts/CampaignsContext'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DataTable from '@/components/DataTable'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { LineItemFilters, LineItem } from '@/types/lineItem'
import type { RowSelectionState, PaginationState, Row } from '@tanstack/react-table'
import type { Campaign } from '@/types/campaign'

type EnrichedLineItem = LineItem & {
  campaignName?: string;
}

const columns = [
  {
    id: "select",
    header: ({ table }: { table: any }) => (
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
    header: "Booked Amount",
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
      const amount = row.getValue("bookedAmount") as number;
      return <div className="text-right">${amount.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "actualAmount",
    header: "Actual Amount",
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
      const amount = row.getValue("actualAmount") as number;
      return <div className="text-right">${amount.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "adjustments",
    header: "Adjustments",
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

  // Data filters (non-pagination)
  const [dataFilters, setDataFilters] = useState<Omit<LineItemFilters, 'page' | 'pageSize' | 'cursor'>>({})

  // Pagination state (single source of truth)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Cursor management for server-side pagination
  const [cursor, setCursor] = useState<unknown>(undefined)
  const pageCursorsRef = useRef<Map<number, unknown>>(new Map())
  const lastDocRef = useRef<unknown>(undefined)

  // Fetch line items with pagination
  const { data: response, isLoading } = useLineItems({
    ...dataFilters,
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    cursor,
  })

  // Enrich line items with campaign names
  const enrichedLineItems = useMemo(
    () => enrichLineItemData(response?.data ?? [], campaigns),
    [response?.data, campaigns]
  )

  // Fetch total count (only depends on data filters, not pagination)
  const { data: totalCount = 0 } = useLineItemCount(dataFilters)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const prevPaginationRef = useRef<PaginationState>(pagination)

  // Store lastDoc from response for cursor-based pagination
  useEffect(() => {
    if (response?.lastDoc) {
      lastDocRef.current = response.lastDoc
    }
  }, [response?.lastDoc])

  // Handle pagination changes and update cursor
  useEffect(() => {
    const prev = prevPaginationRef.current
    const current = pagination

    const isNextPage = current.pageIndex > prev.pageIndex
    const isPrevPage = current.pageIndex < prev.pageIndex
    const isPageSizeChange = current.pageSize !== prev.pageSize

    if (isNextPage && lastDocRef.current) {
      // Going forward - use lastDoc from previous page
      pageCursorsRef.current.set(current.pageIndex, lastDocRef.current)
      setCursor(lastDocRef.current)
    } else if (isPrevPage) {
      // Going backward - use stored cursor
      const storedCursor = pageCursorsRef.current.get(current.pageIndex)
      setCursor(storedCursor)
    } else if (current.pageIndex === 0 || isPageSizeChange) {
      // First page or page size changed
      setCursor(undefined)
      pageCursorsRef.current.clear()
    }

    prevPaginationRef.current = current
  }, [pagination])

  const handleFilterChange = (updates: Partial<LineItemFilters>) => {
    setDataFilters(prev => ({
      ...prev,
      ...updates,
    }))
    // Reset pagination when filters change
    setPagination({
      pageIndex: 0,
      pageSize: pagination.pageSize,
    })
    setCursor(undefined)
    pageCursorsRef.current.clear()
  }

  return (
    <div className='container h-full flex flex-col'>
      <h1 className="text-3xl font-bold mb-6">Line Items</h1>

      <div className="flex items-center gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Campaign:</span>
          <Select
            value={dataFilters.campaignId || "all"}
            onValueChange={(value) => {
              handleFilterChange({
                campaignId: value === "all" ? undefined : value,
              })
            }}
          >
            <SelectTrigger className="w-[200px]" size="sm">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
