import { useLineItems, useLineItemCount } from '@/hooks/useLineItems'
import { useCampaignsContext } from '@/contexts/CampaignsContext'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DataTable from '@/components/DataTable'
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { LineItemFilters, LineItem } from '@/types/lineItem'
import type { SortingState, ColumnFiltersState, RowSelectionState, PaginationState, Row } from '@tanstack/react-table'
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
    enableSorting: false,
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

  // Separate pagination filters from data filters
  const [dataFilters, setDataFilters] = useState<Omit<LineItemFilters, 'page' | 'pageSize' | 'cursor'>>({})
  const [paginationFilters, setPaginationFilters] = useState<Pick<LineItemFilters, 'page' | 'pageSize' | 'cursor'>>({
    page: 0,
    pageSize: 100,
  })

  // Table state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Combine filters for the query
  const queryFilters = { ...dataFilters, ...paginationFilters }

  // Fetch line items with pagination
  const { data: response, isLoading } = useLineItems(queryFilters)

  // Enrich line items with campaign names
  const enrichedLineItems = useMemo(
    () => enrichLineItemData(response?.data ?? [], campaigns),
    [response?.data, campaigns]
  )

  // Fetch total count (only depends on data filters, not pagination)
  const { data: totalCount = 0 } = useLineItemCount(dataFilters)

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handlePaginationChange = (pageIndex: number, newPageSize: number, cursor?: unknown) => {
    setPaginationFilters({
      page: pageIndex,
      pageSize: newPageSize,
      cursor,
    })
  }

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
    setPaginationFilters({
      page: 0,
      pageSize: pagination.pageSize,
      cursor: undefined,
    })
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

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Per page:</span>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) => {
              const newPageSize = parseInt(value)
              setPagination({
                pageIndex: 0,
                pageSize: newPageSize,
              })
              setPaginationFilters({
                page: 0,
                pageSize: newPageSize,
                cursor: undefined,
              })
            }}
          >
            <SelectTrigger className="w-[100px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='flex-1 min-h-0'>
        <DataTable
          data={enrichedLineItems}
          columns={columns}
          setSorting={setSorting}
          setColumnFilters={setColumnFilters}
          setRowSelection={setRowSelection}
          sorting={sorting}
          columnFilters={columnFilters}
          rowSelection={rowSelection}
          pagination={pagination}
          setPagination={setPagination}
          totalCount={totalCount}
          lastDoc={response?.lastDoc}
          isLoading={isLoading}
          onPaginationChange={handlePaginationChange}
          enableGlobalSearch={true}
          globalSearchPlaceholder="Search line items... (searches current page)"
        />
      </div>
    </div>
  )
}

export default LineItems
