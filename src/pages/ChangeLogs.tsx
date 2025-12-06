import { useChangeLogs, useChangeLogCount } from '@/hooks/useChangeLog'
import { useCampaignsContext } from '@/contexts/CampaignsContext'
import { useInvoicesContext } from '@/contexts/InvoicesContext'
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
import { BulkActionToolbar } from '@/components/BulkActionToolbar'
import DataTable from '@/components/DataTable'
import { exportToCsv } from '@/lib/exportToCsv'
import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, Download } from 'lucide-react'
import { toast } from 'sonner'
import type { ChangeLogEntry, ChangeLogFilters } from '@/types/changeLog'
import type { RowSelectionState, Table, Row } from '@tanstack/react-table'

// Available change types
const CHANGE_TYPE_OPTIONS = [
  { label: 'Adjustment Created', value: 'adjustment_created' },
  { label: 'Adjustment Updated', value: 'adjustment_updated' },
  { label: 'Adjustment Deleted', value: 'adjustment_deleted' },
  { label: 'Line Item Moved', value: 'line_item_moved' },
]

// Available entity types
const ENTITY_TYPE_OPTIONS = [
  { label: 'Line Item', value: 'line_item' },
  { label: 'Invoice', value: 'invoice' },
]

const columns = [
  {
    id: "select",
    header: ({ table }: { table: Table<ChangeLogEntry> }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableHiding: false,
  },
  {
    accessorKey: "timestamp",
    header: "Date & Time",
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => {
      const date = row.getValue("timestamp") as Date;
      return (
        <div className="flex flex-col">
          <div className="font-medium">{date?.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">{date?.toLocaleTimeString()}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "changeType",
    header: "Change Type",
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => {
      const changeType = row.getValue("changeType") as string;
      const label = CHANGE_TYPE_OPTIONS.find(opt => opt.value === changeType)?.label || changeType;
      const variantMap = {
        adjustment_created: "default" as const,
        adjustment_updated: "secondary" as const,
        adjustment_deleted: "destructive" as const,
        line_item_moved: "outline" as const,
      };
      return (
        <Badge variant={variantMap[changeType as keyof typeof variantMap]}>
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "entityType",
    header: "Entity Type",
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => {
      const entityType = row.getValue("entityType") as string;
      return <div className="capitalize">{entityType.replace('_', ' ')}</div>;
    },
  },
  {
    accessorKey: "lineItemName",
    header: "Line Item",
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => {
      const lineItemName = row.getValue("lineItemName") as string | undefined;
      return <div className="font-medium">{lineItemName || '-'}</div>;
    },
  },
  {
    accessorKey: "invoiceNumber",
    header: "Invoice",
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => {
      const invoiceNumber = row.getValue("invoiceNumber") as string;
      const invoiceId = row.original.invoiceId;
      return (
        <Link
          to={`/invoices/${invoiceId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {invoiceNumber}
        </Link>
      );
    },
  },
  {
    accessorKey: "previousAmount",
    header: () => <div className="text-right">Previous Amount</div>,
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => {
      const amount = row.getValue("previousAmount") as number;
      return <div className="text-right">${amount.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "newAmount",
    header: () => <div className="text-right">New Amount</div>,
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => {
      const amount = row.getValue("newAmount") as number;
      return <div className="text-right">${amount.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "difference",
    header: () => <div className="text-right">Difference</div>,
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => {
      const diff = row.getValue("difference") as number;
      const isNegative = diff < 0;
      return (
        <div className={`text-right font-medium ${isNegative ? 'text-red-600' : diff > 0 ? 'text-green-600' : ''}`}>
          {isNegative ? '-' : diff > 0 ? '+' : ''}${Math.abs(diff).toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "comment",
    header: "Comment",
    cell: ({ row }: { row: Row<ChangeLogEntry> }) => {
      const comment = row.getValue("comment") as string;
      return (
        <div className="max-w-xs truncate" title={comment}>
          {comment}
        </div>
      );
    },
  },
]

function ChangeLogs() {
  const { campaigns } = useCampaignsContext()
  const { invoices } = useInvoicesContext()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get filters from URL params
  const campaignIdFromUrl = searchParams.get('campaignId') || undefined
  const invoiceIdFromUrl = searchParams.get('invoiceId') || undefined

  // Data filters (non-pagination)
  const [dataFilters, setDataFilters] = useState<Omit<ChangeLogFilters, 'page' | 'pageSize' | 'cursor'>>({
    campaignId: campaignIdFromUrl,
    invoiceId: invoiceIdFromUrl,
  })

  // Cursor-based pagination hook
  const { pagination, setPagination, cursor, setLastDoc, reset } = useCursorPagination({
    initialPageSize: 50,
  })

  // Fetch change logs with pagination
  const { data: response, isLoading } = useChangeLogs({
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

  const changeLogs = response?.data ?? []

  // Fetch total count (only depends on data filters, not pagination)
  const { data: totalCount = 0 } = useChangeLogCount(dataFilters)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handleFilterChange = (updates: Partial<ChangeLogFilters>) => {
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

    // Update URL params if invoiceId changes
    if ('invoiceId' in updates) {
      if (updates.invoiceId) {
        searchParams.set('invoiceId', updates.invoiceId)
      } else {
        searchParams.delete('invoiceId')
      }
      setSearchParams(searchParams)
    }

    // Reset pagination when filters change
    reset()
  }

  // Calculate active filter count
  const activeFilterCount =
    (dataFilters.changeType ? 1 : 0) +
    (dataFilters.entityType ? 1 : 0) +
    (dataFilters.campaignId ? 1 : 0) +
    (dataFilters.invoiceId ? 1 : 0) +
    (dataFilters.startDate || dataFilters.endDate ? 1 : 0)

  const formatDateRange = (startDate?: Date, endDate?: Date) => {
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
    } else if (startDate) {
      return `From ${startDate.toLocaleDateString()}`
    } else if (endDate) {
      return `To ${endDate.toLocaleDateString()}`
    }
    return ''
  }

  // Get selected change logs
  const selectedChangeLogs = useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => changeLogs[parseInt(index)])
      .filter(Boolean);
  }, [rowSelection, changeLogs]);

  // Bulk action handlers
  const handleBulkExport = () => {
    if (selectedChangeLogs.length === 0) return;

    exportToCsv(
      selectedChangeLogs,
      `change-logs-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'timestamp', header: 'Date & Time' },
        { key: 'changeType', header: 'Change Type' },
        { key: 'entityType', header: 'Entity Type' },
        { key: 'lineItemName', header: 'Line Item' },
        { key: 'invoiceNumber', header: 'Invoice' },
        { key: 'previousAmount', header: 'Previous Amount' },
        { key: 'newAmount', header: 'New Amount' },
        { key: 'difference', header: 'Difference' },
        { key: 'comment', header: 'Comment' },
      ]
    );

    toast.success('Export successful', {
      description: `Exported ${selectedChangeLogs.length} change log${selectedChangeLogs.length > 1 ? 's' : ''} to CSV`,
    });
  };

  const handleClearSelection = () => {
    setRowSelection({});
  };

  return (
    <div className='container h-full flex flex-col'>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Change Logs</h1>

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
                  Refine your change log search
                </p>
              </div>

              <div className="space-y-4">
                {/* Change Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Change Type</label>
                  <Select
                    value={dataFilters.changeType || "all"}
                    onValueChange={(value) =>
                      handleFilterChange({
                        changeType: value === "all" ? undefined : value as ChangeLogEntry['changeType'],
                      })
                    }
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {CHANGE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entity Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Entity Type</label>
                  <Select
                    value={dataFilters.entityType || "all"}
                    onValueChange={(value) =>
                      handleFilterChange({
                        entityType: value === "all" ? undefined : value as ChangeLogEntry['entityType'],
                      })
                    }
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {ENTITY_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

                {/* Invoice Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Invoice</label>
                  <Select
                    value={dataFilters.invoiceId || "all"}
                    onValueChange={(value) => {
                      handleFilterChange({
                        invoiceId: value === "all" ? undefined : value,
                      })
                    }}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="All invoices">
                        {dataFilters.invoiceId
                          ? (() => {
                              const invoice = invoices.find(inv => inv.id === dataFilters.invoiceId)
                              return invoice?.invoiceNumber || ''
                            })()
                          : "All invoices"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-w-[280px]">
                      <SelectItem value="all">All invoices</SelectItem>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <DateRangeFilter
                    value={{
                      from: dataFilters.startDate,
                      to: dataFilters.endDate,
                    }}
                    onChange={(range) => {
                      handleFilterChange({
                        startDate: range?.from,
                        endDate: range?.to,
                      })
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
          {dataFilters.changeType && (
            <FilterBadge
              label="Change Type"
              value={CHANGE_TYPE_OPTIONS.find(opt => opt.value === dataFilters.changeType)?.label || dataFilters.changeType}
              onRemove={() => handleFilterChange({ changeType: undefined })}
            />
          )}
          {dataFilters.entityType && (
            <FilterBadge
              label="Entity Type"
              value={ENTITY_TYPE_OPTIONS.find(opt => opt.value === dataFilters.entityType)?.label || dataFilters.entityType}
              onRemove={() => handleFilterChange({ entityType: undefined })}
            />
          )}
          {dataFilters.campaignId && (
            <FilterBadge
              label="Campaign"
              value={campaigns.find(c => c.id === dataFilters.campaignId)?.name || dataFilters.campaignId}
              onRemove={() => handleFilterChange({ campaignId: undefined })}
            />
          )}
          {dataFilters.invoiceId && (
            <FilterBadge
              label="Invoice"
              value={invoices.find(inv => inv.id === dataFilters.invoiceId)?.invoiceNumber || dataFilters.invoiceId}
              onRemove={() => handleFilterChange({ invoiceId: undefined })}
            />
          )}
          {(dataFilters.startDate || dataFilters.endDate) && (
            <FilterBadge
              label="Date Range"
              value={formatDateRange(dataFilters.startDate, dataFilters.endDate)}
              onRemove={() => handleFilterChange({ startDate: undefined, endDate: undefined })}
            />
          )}
        </div>
      )}

      <div className='flex-1 min-h-0'>
        <DataTable
          data={changeLogs}
          columns={columns}
          setRowSelection={setRowSelection}
          rowSelection={rowSelection}
          pagination={pagination}
          setPagination={setPagination}
          totalCount={totalCount}
          isLoading={isLoading}
          enableGlobalSearch={true}
          globalSearchPlaceholder="Search change logs... (searches current page)"
          pageSizeOptions={[10, 20, 50, 100, 200]}
        />
      </div>

      <BulkActionToolbar
        selectedCount={selectedChangeLogs.length}
        onClearSelection={handleClearSelection}
        actions={[
          {
            label: 'Export CSV',
            icon: <Download className="mr-2 h-4 w-4" />,
            onClick: handleBulkExport,
            variant: 'secondary',
          },
        ]}
      />
    </div>
  )
}

export default ChangeLogs
