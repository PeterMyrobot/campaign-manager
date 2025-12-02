import { useCampaigns, useCampaignCount } from '@/hooks/useCampaigns'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import { DateRangeFilter } from '@/components/ui/date-range-filter'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/DataTable'
import { useState } from 'react'
import type { CampaignFilters } from '@/types/campaign'
import type { SortingState, ColumnFiltersState, RowSelectionState, PaginationState } from '@tanstack/react-table'

// Available campaign statuses
const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
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
    header: "Campaign Name",
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variantMap = {
        draft: "secondary" as const,
        active: "default" as const,
        completed: "outline" as const,
        cancelled: "destructive" as const,
      };
      return (
        <Badge variant={variantMap[status as keyof typeof variantMap]}>
          <span className="capitalize">{status}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => {
      const date = row.getValue("startDate") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => {
      const date = row.getValue("endDate") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
]

function Campaigns() {
  // Separate pagination filters from data filters
  const [dataFilters, setDataFilters] = useState<Omit<CampaignFilters, 'page' | 'pageSize' | 'cursor'>>({})
  const [paginationFilters, setPaginationFilters] = useState<Pick<CampaignFilters, 'page' | 'pageSize' | 'cursor'>>({
    page: 0,
    pageSize: 10,
  })

  // Table state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Combine filters for the query
  const queryFilters = { ...dataFilters, ...paginationFilters }

  // Fetch campaigns with pagination
  const { data: response, isLoading } = useCampaigns(queryFilters)
  const campaigns = response?.data ?? []

  // Fetch total count (only depends on data filters, not pagination)
  const { data: totalCount = 0 } = useCampaignCount(dataFilters)

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handlePaginationChange = (pageIndex: number, newPageSize: number, cursor?: unknown) => {
    console.log(pageIndex, newPageSize, cursor);

    setPaginationFilters({
      page: pageIndex,
      pageSize: newPageSize,
      cursor,
    })
  }

  const handleFilterChange = (updates: Partial<CampaignFilters>) => {
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
    <div className='container py-8'>
      <h1 className="text-3xl font-bold mb-6">Campaigns</h1>

      <div className="flex items-center gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <MultiSelect
            options={STATUS_OPTIONS}
            selected={dataFilters.statuses ?? []}
            onChange={(values) =>
              handleFilterChange({
                statuses: values.length > 0 ? values : undefined,
              })
            }
            placeholder="All statuses"
            className="w-[200px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Date Filter:</span>
          <Select
            value={
              dataFilters.createdDateRange ? 'created' :
              dataFilters.startDateRange ? 'start' :
              dataFilters.endDateRange ? 'end' :
              'none'
            }
            onValueChange={(value) => {
              // Clear all date filters first, then set the selected one with empty range
              if (value === 'none') {
                handleFilterChange({
                  createdDateRange: undefined,
                  startDateRange: undefined,
                  endDateRange: undefined,
                })
              } else if (value === 'created') {
                handleFilterChange({
                  createdDateRange: {},
                  startDateRange: undefined,
                  endDateRange: undefined,
                })
              } else if (value === 'start') {
                handleFilterChange({
                  createdDateRange: undefined,
                  startDateRange: {},
                  endDateRange: undefined,
                })
              } else if (value === 'end') {
                handleFilterChange({
                  createdDateRange: undefined,
                  startDateRange: undefined,
                  endDateRange: {},
                })
              }
            }}
          >
            <SelectTrigger className="w-[150px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No date filter</SelectItem>
              <SelectItem value="created">Created Date</SelectItem>
              <SelectItem value="start">Start Date</SelectItem>
              <SelectItem value="end">End Date</SelectItem>
            </SelectContent>
          </Select>
          {(dataFilters.createdDateRange || dataFilters.startDateRange || dataFilters.endDateRange) && (
            <DateRangeFilter
              value={
                dataFilters.createdDateRange ||
                dataFilters.startDateRange ||
                dataFilters.endDateRange
              }
              onChange={(range) => {
                if (dataFilters.createdDateRange !== undefined) {
                  handleFilterChange({ createdDateRange: range })
                } else if (dataFilters.startDateRange !== undefined) {
                  handleFilterChange({ startDateRange: range })
                } else if (dataFilters.endDateRange !== undefined) {
                  handleFilterChange({ endDateRange: range })
                }
              }}
              placeholder={
                dataFilters.createdDateRange ? "Select created date range" :
                dataFilters.startDateRange ? "Select start date range" :
                "Select end date range"
              }
            />
          )}
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


      <DataTable
        data={campaigns}
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
        globalSearchPlaceholder="Search campaigns... (searches current page)"
      />

    </div>
  )
}

export default Campaigns