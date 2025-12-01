import { useCampaigns, useCampaignCount } from '@/hooks/useCampaigns'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import { DateRangeFilter } from '@/components/ui/date-range-filter'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpDown } from 'lucide-react'
import DataTable from '@/components/DataTable'
import { useState } from 'react'
import type { CampaignFilters, DateRange } from '@/types/campaign'
import type { SortingState, ColumnFiltersState, VisibilityState, RowSelectionState, PaginationState } from '@tanstack/react-table'

// Available campaign statuses
const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
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
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Campaign Name
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("status")}</div>
    ),
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Start Date
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("startDate") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "endDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        End Date
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("endDate") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
        <ArrowUpDown />
      </Button>
    ),
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
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

      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Search:</span>
            <Input
              type="text"
              placeholder="Search by name..."
              className="w-[200px]"
              value={dataFilters.name ?? ""}
              onChange={(e) =>
                handleFilterChange({
                  name: e.target.value || undefined,
                })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <MultiSelect
              options={STATUS_OPTIONS}
              selected={dataFilters.status ?? []}
              onChange={(values) =>
                handleFilterChange({
                  status: values.length > 0 ? values : undefined,
                })
              }
              placeholder="All statuses"
              className="w-[200px]"
            />
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

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Start Date:</span>
            <DateRangeFilter
              value={dataFilters.startDateRange}
              onChange={(range) =>
                handleFilterChange({
                  startDateRange: range,
                })
              }
              placeholder="Any start date"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">End Date:</span>
            <DateRangeFilter
              value={dataFilters.endDateRange}
              onChange={(range) =>
                handleFilterChange({
                  endDateRange: range,
                })
              }
              placeholder="Any end date"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Created:</span>
            <DateRangeFilter
              value={dataFilters.createdDateRange}
              onChange={(range) =>
                handleFilterChange({
                  createdDateRange: range,
                })
              }
              placeholder="Any creation date"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div>Loading campaigns...</div>
      ) : (
        <DataTable
          data={campaigns}
          columns={columns}
          setSorting={setSorting}
          setColumnFilters={setColumnFilters}
          setColumnVisibility={setColumnVisibility}
          setRowSelection={setRowSelection}
          sorting={sorting}
          columnFilters={columnFilters}
          columnVisibility={columnVisibility}
          rowSelection={rowSelection}
          pagination={pagination}
          setPagination={setPagination}
          totalCount={totalCount}
          lastDoc={response?.lastDoc}
          firstDoc={response?.firstDoc}
          onPaginationChange={handlePaginationChange}
        />
      )}
    </div>
  )
}

export default Campaigns