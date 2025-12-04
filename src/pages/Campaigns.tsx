import { useCampaigns, useCampaignCount } from '@/hooks/useCampaigns'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { Checkbox } from '@/components/ui/checkbox'
import { MultiSelect } from '@/components/ui/multi-select'
import { DateRangeFilter } from '@/components/ui/date-range-filter'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FilterBadge } from '@/components/FilterBadge'
import DataTable from '@/components/DataTable'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Filter } from 'lucide-react'
import type { Campaign, CampaignFilters } from '@/types/campaign'
import type { RowSelectionState, Table, Row } from '@tanstack/react-table'

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
    header: ({ table }: { table: Table<Campaign> }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: { row: Row<Campaign> }) => (
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
    header: "Campaign Name",
    cell: ({ row }: { row: Row<Campaign> }) => {
      const campaignId = row.original.id;
      return (
        <Link
          to={`/campaigns/${campaignId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          {row.getValue("name")}
        </Link>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: Row<Campaign> }) => {
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
    cell: ({ row }: { row: Row<Campaign> }) => {
      const date = row.getValue("startDate") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }: { row: Row<Campaign> }) => {
      const date = row.getValue("endDate") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "lineItemIds",
    header: "Line Items",
    cell: ({ row }: { row: Row<Campaign> }) => {
      const lineItemIds = row.getValue("lineItemIds") as string[];
      return <div className="text-center">{lineItemIds?.length || 0}</div>;
    },
  },
  {
    accessorKey: "invoiceIds",
    header: "Invoices",
    cell: ({ row }: { row: Row<Campaign> }) => {
      const invoiceIds = row.getValue("invoiceIds") as string[];
      return <div className="text-center">{invoiceIds?.length || 0}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }: { row: Row<Campaign> }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
]

function Campaigns() {
  // Data filters (non-pagination)
  const [dataFilters, setDataFilters] = useState<Omit<CampaignFilters, 'page' | 'pageSize' | 'cursor'>>({})

  // Cursor-based pagination hook
  const { pagination, setPagination, cursor, setLastDoc, reset } = useCursorPagination({
    initialPageSize: 10,
  })

  // Fetch campaigns with pagination
  const { data: response, isLoading } = useCampaigns({
    ...dataFilters,
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    cursor,
  })
  const campaigns = response?.data ?? []

  // Update lastDoc when response arrives
  useEffect(() => {
    if (response?.lastDoc) {
      setLastDoc(response.lastDoc)
    }
  }, [response?.lastDoc, setLastDoc])

  // Fetch total count (only depends on data filters, not pagination)
  const { data: totalCount = 0 } = useCampaignCount(dataFilters)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handleFilterChange = (updates: Partial<CampaignFilters>) => {
    setDataFilters(prev => ({
      ...prev,
      ...updates,
    }))
    // Reset pagination when filters change
    reset()
  }

  // Calculate active filter count
  const activeFilterCount =
    (dataFilters.statuses?.length || 0) +
    (dataFilters.createdDateRange ? 1 : 0) +
    (dataFilters.startDateRange ? 1 : 0) +
    (dataFilters.endDateRange ? 1 : 0)

  // Get active date filter info
  const getDateFilterInfo = () => {
    if (dataFilters.createdDateRange) return { type: 'created', label: 'Created Date', range: dataFilters.createdDateRange }
    if (dataFilters.startDateRange) return { type: 'start', label: 'Start Date', range: dataFilters.startDateRange }
    if (dataFilters.endDateRange) return { type: 'end', label: 'End Date', range: dataFilters.endDateRange }
    return null
  }

  const dateFilterInfo = getDateFilterInfo()

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
        <h1 className="text-3xl font-bold">Campaigns</h1>

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
                  Refine your campaign search
                </p>
              </div>

              <div className="space-y-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Status</label>
                  <MultiSelect
                    options={STATUS_OPTIONS}
                    selected={dataFilters.statuses ?? []}
                    onChange={(values) =>
                      handleFilterChange({
                        statuses: values.length > 0 ? values : undefined,
                      })
                    }
                    placeholder="All statuses"
                    className="w-full"
                  />
                </div>

                {/* Date Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Type</label>
                  <Select
                    value={
                      dataFilters.createdDateRange ? 'created' :
                        dataFilters.startDateRange ? 'start' :
                          dataFilters.endDateRange ? 'end' :
                            'none'
                    }
                    onValueChange={(value) => {
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
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No date filter</SelectItem>
                      <SelectItem value="created">Created Date</SelectItem>
                      <SelectItem value="start">Start Date</SelectItem>
                      <SelectItem value="end">End Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Filter */}
                {(dataFilters.createdDateRange || dataFilters.startDateRange || dataFilters.endDateRange) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
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
                      placeholder="Select date range"
                    />
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {dataFilters.statuses?.map((status) => (
            <FilterBadge
              key={status}
              label="Status"
              value={STATUS_OPTIONS.find(s => s.value === status)?.label || status}
              onRemove={() => {
                const newStatuses = dataFilters.statuses?.filter(s => s !== status)
                handleFilterChange({ statuses: newStatuses?.length ? newStatuses : undefined })
              }}
            />
          ))}
          {dateFilterInfo && (
            <FilterBadge
              label={dateFilterInfo.label}
              value={formatDateRange(dateFilterInfo.range)}
              onRemove={() => {
                if (dataFilters.createdDateRange) {
                  handleFilterChange({ createdDateRange: undefined })
                } else if (dataFilters.startDateRange) {
                  handleFilterChange({ startDateRange: undefined })
                } else if (dataFilters.endDateRange) {
                  handleFilterChange({ endDateRange: undefined })
                }
              }}
            />
          )}
        </div>
      )}

      <div className='flex-1 min-h-0'>
        <DataTable
          data={campaigns}
          columns={columns}
          setRowSelection={setRowSelection}
          rowSelection={rowSelection}
          pagination={pagination}
          setPagination={setPagination}
          totalCount={totalCount}
          isLoading={isLoading}
          enableGlobalSearch={true}
          globalSearchPlaceholder="Search campaigns... (searches current page)"
          pageSizeOptions={[1, 5, 10, 20, 50, 100]}
        />
      </div>
    </div>
  )
}

export default Campaigns