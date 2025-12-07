import { useInvoices, useInvoiceCount } from '@/hooks/useInvoices'
import { useCampaignsContext } from '@/contexts/CampaignsContext'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { Checkbox } from '@/components/ui/checkbox'
import { MultiSelect } from '@/components/ui/multi-select'
import { DateRangeFilter } from '@/components/ui/date-range-filter'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FilterBadge } from '@/components/FilterBadge'
import { BulkActionToolbar } from '@/components/BulkActionToolbar'
import DataTable from '@/components/DataTable'
import BaseLineItemsTable from '@/components/BaseLineItemsTable'
import { exportToCsv } from '@/lib/exportToCsv'
import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, ChevronDown, Filter, Download } from 'lucide-react'
import { toast } from 'sonner'
import type { Invoice, InvoiceFilters } from '@/types/invoice'
import type { RowSelectionState, ExpandedState, Table, Row } from '@tanstack/react-table'
import type { Campaign } from '@/types/campaign'

type EnrichedInvoice = Invoice & {
  campaignName?: string;
}

// Available invoice statuses
const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Cancelled', value: 'cancelled' },
]

const columns = [
  {
    id: "expander",
    header: () => null,
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => {
      return row.original.lineItemIds.length > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => row.toggleExpanded()}
          className="h-8 w-8 p-0"
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      ) : null;
    },
    enableHiding: false,
  },
  {
    id: "select",
    header: ({ table }: { table: Table<EnrichedInvoice> }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableHiding: false,
  },
  {
    accessorKey: "invoiceNumber",
    header: "Invoice Number",
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => {
      return (
        <Link
          to={`/invoices/${row.original.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.getValue("invoiceNumber")}
        </Link>
      );
    },
  },
  {
    accessorKey: "campaignId",
    header: "Campaign",
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => {
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => {
      const status = row.getValue("status") as string;
      const variantMap = {
        draft: "secondary" as const,
        sent: "default" as const,
        paid: "outline" as const,
        overdue: "destructive" as const,
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
    accessorKey: "clientName",
    header: "Client",
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => {
      return <div>{row.getValue("clientName")}</div>;
    },
  },
  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right">Total Amount</div>,
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => {
      const amount = row.getValue("totalAmount") as number;
      const currency = row.original.currency;
      return <div className="text-right font-medium">{currency} ${amount.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "issueDate",
    header: "Issue Date",
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => {
      const date = row.getValue("issueDate") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => {
      const date = row.getValue("dueDate") as Date;
      return <div>{date?.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "paidDate",
    header: "Paid Date",
    cell: ({ row }: { row: Row<EnrichedInvoice> }) => {
      const date = row.getValue("paidDate") as Date | null;
      return <div>{date ? date.toLocaleDateString() : '-'}</div>;
    },
  },
]

const enrichInvoiceData = (data: Invoice[], campaigns: Campaign[]): EnrichedInvoice[] => {
  // Create a map for O(1) campaign lookup
  const campaignMap = new Map(campaigns.map(c => [c.id, c.name]))

  // Enrich each invoice with campaign name
  return data.map(invoice => ({
    ...invoice,
    campaignName: campaignMap.get(invoice.campaignId),
  }))
}

function Invoices() {
  const { campaigns } = useCampaignsContext()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get filters from URL params
  const campaignIdFromUrl = searchParams.get('campaignId') || undefined
  const statusesFromUrl = searchParams.get('statuses')?.split(',').filter(Boolean) ||
    (searchParams.get('status') ? [searchParams.get('status')!] : undefined)

  // Data filters (non-pagination)
  const [dataFilters, setDataFilters] = useState<Omit<InvoiceFilters, 'page' | 'pageSize' | 'cursor'>>({
    campaignId: campaignIdFromUrl,
    statuses: statusesFromUrl,
  })

  // Cursor-based pagination hook
  const { pagination, setPagination, cursor, setLastDoc, reset } = useCursorPagination({
    initialPageSize: 10,
  })

  // Fetch invoices with pagination
  const { data: response, isLoading } = useInvoices({
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

  // Enrich invoices with campaign names
  const enrichedInvoices = useMemo(
    () => enrichInvoiceData(response?.data ?? [], campaigns),
    [response?.data, campaigns]
  )

  // Fetch total count (only depends on data filters, not pagination)
  const { data: totalCount = 0 } = useInvoiceCount(dataFilters)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const handleFilterChange = (updates: Partial<InvoiceFilters>) => {
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

    // Update URL params if statuses changes
    if ('statuses' in updates) {
      if (updates.statuses && updates.statuses.length > 0) {
        searchParams.set('statuses', updates.statuses.join(','))
      } else {
        searchParams.delete('statuses')
        searchParams.delete('status')
      }
      setSearchParams(searchParams)
    }

    // Reset pagination when filters change
    reset()
  }

  // Calculate active filter count
  const activeFilterCount =
    (dataFilters.statuses?.length || 0) +
    (dataFilters.campaignId ? 1 : 0) +
    (dataFilters.issueDateRange ? 1 : 0) +
    (dataFilters.dueDateRange ? 1 : 0) +
    (dataFilters.paidDateRange ? 1 : 0) +
    (dataFilters.createdDateRange ? 1 : 0)

  // Get active date filter info
  const getDateFilterInfo = () => {
    if (dataFilters.issueDateRange) return { type: 'issue', label: 'Issue Date', range: dataFilters.issueDateRange }
    if (dataFilters.dueDateRange) return { type: 'due', label: 'Due Date', range: dataFilters.dueDateRange }
    if (dataFilters.paidDateRange) return { type: 'paid', label: 'Paid Date', range: dataFilters.paidDateRange }
    if (dataFilters.createdDateRange) return { type: 'created', label: 'Created Date', range: dataFilters.createdDateRange }
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

  // Get selected invoices
  const selectedInvoices = useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => enrichedInvoices[parseInt(index)])
      .filter(Boolean);
  }, [rowSelection, enrichedInvoices]);

  // Bulk action handlers
  const handleBulkExport = () => {
    if (selectedInvoices.length === 0) return;

    exportToCsv(
      selectedInvoices,
      `invoices-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'invoiceNumber', header: 'Invoice Number' },
        { key: 'campaignName', header: 'Campaign' },
        { key: 'status', header: 'Status' },
        { key: 'clientName', header: 'Client' },
        { key: 'totalAmount', header: 'Total Amount' },
        { key: 'currency', header: 'Currency' },
        { key: 'issueDate', header: 'Issue Date' },
        { key: 'dueDate', header: 'Due Date' },
        { key: 'paidDate', header: 'Paid Date' },
      ]
    );

    toast.success('Export successful', {
      description: `Exported ${selectedInvoices.length} invoice${selectedInvoices.length > 1 ? 's' : ''} to CSV`,
    });
  };

  const handleClearSelection = () => {
    setRowSelection({});
  };

  return (
    <div className='container h-full flex flex-col'>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Invoices</h1>

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
                  Refine your invoice search
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

                {/* Campaign Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Campaign</label>
                  <SearchableSelect
                    options={campaigns.map((campaign) => ({
                      label: campaign.name,
                      value: campaign.id,
                    }))}
                    value={dataFilters.campaignId}
                    onChange={(value) => {
                      handleFilterChange({
                        campaignId: value,
                      })
                    }}
                    placeholder="All campaigns"
                    searchPlaceholder="Search campaigns..."
                    emptyText="No campaigns found"
                    className="w-full"
                  />
                </div>

                {/* Date Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Type</label>
                  <Select
                    value={
                      dataFilters.issueDateRange ? 'issue' :
                        dataFilters.dueDateRange ? 'due' :
                          dataFilters.paidDateRange ? 'paid' :
                            dataFilters.createdDateRange ? 'created' :
                              'none'
                    }
                    onValueChange={(value) => {
                      if (value === 'none') {
                        handleFilterChange({
                          issueDateRange: undefined,
                          dueDateRange: undefined,
                          paidDateRange: undefined,
                          createdDateRange: undefined,
                        })
                      } else if (value === 'issue') {
                        handleFilterChange({
                          issueDateRange: {},
                          dueDateRange: undefined,
                          paidDateRange: undefined,
                          createdDateRange: undefined,
                        })
                      } else if (value === 'due') {
                        handleFilterChange({
                          issueDateRange: undefined,
                          dueDateRange: {},
                          paidDateRange: undefined,
                          createdDateRange: undefined,
                        })
                      } else if (value === 'paid') {
                        handleFilterChange({
                          issueDateRange: undefined,
                          dueDateRange: undefined,
                          paidDateRange: {},
                          createdDateRange: undefined,
                        })
                      } else if (value === 'created') {
                        handleFilterChange({
                          issueDateRange: undefined,
                          dueDateRange: undefined,
                          paidDateRange: undefined,
                          createdDateRange: {},
                        })
                      }
                    }}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No date filter</SelectItem>
                      <SelectItem value="issue">Issue Date</SelectItem>
                      <SelectItem value="due">Due Date</SelectItem>
                      <SelectItem value="paid">Paid Date</SelectItem>
                      <SelectItem value="created">Created Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Filter */}
                {(dataFilters.issueDateRange || dataFilters.dueDateRange || dataFilters.paidDateRange || dataFilters.createdDateRange) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <DateRangeFilter
                      value={
                        dataFilters.issueDateRange ||
                        dataFilters.dueDateRange ||
                        dataFilters.paidDateRange ||
                        dataFilters.createdDateRange
                      }
                      onChange={(range) => {
                        if (dataFilters.issueDateRange !== undefined) {
                          handleFilterChange({ issueDateRange: range })
                        } else if (dataFilters.dueDateRange !== undefined) {
                          handleFilterChange({ dueDateRange: range })
                        } else if (dataFilters.paidDateRange !== undefined) {
                          handleFilterChange({ paidDateRange: range })
                        } else if (dataFilters.createdDateRange !== undefined) {
                          handleFilterChange({ createdDateRange: range })
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
          {dataFilters.campaignId && (
            <FilterBadge
              label="Campaign"
              value={campaigns.find(c => c.id === dataFilters.campaignId)?.name || dataFilters.campaignId}
              onRemove={() => handleFilterChange({ campaignId: undefined })}
            />
          )}
          {dateFilterInfo && (
            <FilterBadge
              label={dateFilterInfo.label}
              value={formatDateRange(dateFilterInfo.range)}
              onRemove={() => {
                if (dataFilters.issueDateRange) {
                  handleFilterChange({ issueDateRange: undefined })
                } else if (dataFilters.dueDateRange) {
                  handleFilterChange({ dueDateRange: undefined })
                } else if (dataFilters.paidDateRange) {
                  handleFilterChange({ paidDateRange: undefined })
                } else if (dataFilters.createdDateRange) {
                  handleFilterChange({ createdDateRange: undefined })
                }
              }}
            />
          )}
        </div>
      )}

      <div className='flex-1 min-h-0'>
        <DataTable
          data={enrichedInvoices}
          columns={columns}
          setRowSelection={setRowSelection}
          rowSelection={rowSelection}
          expanded={expanded}
          setExpanded={setExpanded}
          renderSubRow={(row) => (
            <div className='p-2'>
              <BaseLineItemsTable
                mode="invoice"
                invoiceId={row.original.id}
                invoiceStatus={row.original.status}
              />
            </div>
          )}
          pagination={pagination}
          setPagination={setPagination}
          totalCount={totalCount}
          isLoading={isLoading}
          enableGlobalSearch={true}
          globalSearchPlaceholder="Search invoices... (searches current page)"
          pageSizeOptions={[1, 5, 10, 20, 50, 100]}
        />
      </div>

      <BulkActionToolbar
        selectedCount={selectedInvoices.length}
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

export default Invoices
