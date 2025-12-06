import { useLineItems, useLineItemCount } from '@/hooks/useLineItems'
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
import { CreateInvoiceDialog } from '@/components/CreateInvoiceDialog'
import { AddToInvoiceDialog } from '@/components/AddToInvoiceDialog'
import { MoveToInvoiceDialog } from '@/components/MoveToInvoiceDialog'
import DataTable from '@/components/DataTable'
import { exportToCsv } from '@/lib/exportToCsv'
import { useCreateInvoiceFromLineItems, useAddLineItemsToInvoice, useMoveLineItemsToInvoice } from '@/hooks/useInvoices'
import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Filter, Download, FileText, FolderPlus, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { LineItemFilters, LineItem } from '@/types/lineItem'
import type { RowSelectionState, Row, Table } from '@tanstack/react-table'
import type { Campaign } from '@/types/campaign'

type EnrichedLineItem = LineItem & {
  campaignName?: string;
  invoiceNumber?: string;
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
    accessorKey: "invoiceId",
    header: "Invoice",
    cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
      const invoiceId = row.getValue("invoiceId") as string | undefined;
      const invoiceNumber = row.original.invoiceNumber;

      if (!invoiceId) {
        return <div className="text-muted-foreground text-sm">Not invoiced</div>;
      }

      return (
        <Link
          to={`/invoices/${invoiceId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {invoiceNumber || invoiceId}
        </Link>
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

const enrichLineItemData = (
  data: LineItem[],
  campaigns: Campaign[],
  invoices: Array<{ id: string; invoiceNumber: string }>
): EnrichedLineItem[] => {
  // Create maps for O(1) lookup
  const campaignMap = new Map(campaigns.map(c => [c.id, c.name]))
  const invoiceMap = new Map(invoices.map(inv => [inv.id, inv.invoiceNumber]))

  // Enrich each line item with campaign name and invoice number
  return data.map(lineItem => ({
    ...lineItem,
    campaignName: campaignMap.get(lineItem.campaignId),
    invoiceNumber: lineItem.invoiceId ? invoiceMap.get(lineItem.invoiceId) : undefined,
  }))
}

function LineItems() {
  const navigate = useNavigate()
  const { campaigns } = useCampaignsContext()
  const { invoices } = useInvoicesContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAddToInvoiceDialog, setShowAddToInvoiceDialog] = useState(false)
  const [showMoveToInvoiceDialog, setShowMoveToInvoiceDialog] = useState(false)

  // Get filters from URL params
  const campaignIdFromUrl = searchParams.get('campaignId') || undefined
  const invoiceIdFromUrl = searchParams.get('invoiceId') || undefined

  // Data filters (non-pagination)
  const [dataFilters, setDataFilters] = useState<Omit<LineItemFilters, 'page' | 'pageSize' | 'cursor'>>({
    campaignId: campaignIdFromUrl,
    invoiceId: invoiceIdFromUrl,
  })

  // Cursor-based pagination hook
  const { pagination, setPagination, cursor, setLastDoc, reset } = useCursorPagination({
    initialPageSize: 100,
  })

  // Create invoice mutation
  const createInvoice = useCreateInvoiceFromLineItems()

  // Add to invoice mutation
  const addToInvoice = useAddLineItemsToInvoice()

  // Move to invoice mutation
  const moveToInvoice = useMoveLineItemsToInvoice()

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

  // Enrich line items with campaign names and invoice numbers
  const enrichedLineItems = useMemo(() => {
    const invoiceData = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
    }))
    return enrichLineItemData(response?.data ?? [], campaigns, invoiceData)
  }, [response?.data, campaigns, invoices])

  // Fetch total count (only depends on data filters, not pagination)
  const { data: totalCount = 0 } = useLineItemCount(dataFilters)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handleFilterChange = (updates: Partial<LineItemFilters>) => {
    setDataFilters(prev => ({
      ...prev,
      ...updates,
    }))

    // Update URL params
    if ('campaignId' in updates) {
      if (updates.campaignId) {
        searchParams.set('campaignId', updates.campaignId)
      } else {
        searchParams.delete('campaignId')
      }
    }
    if ('invoiceId' in updates) {
      if (updates.invoiceId) {
        searchParams.set('invoiceId', updates.invoiceId)
      } else {
        searchParams.delete('invoiceId')
      }
    }
    setSearchParams(searchParams)

    // Reset pagination when filters change
    reset()
  }

  // Calculate active filter count
  const activeFilterCount =
    (dataFilters.campaignId ? 1 : 0) +
    (dataFilters.invoiceId ? 1 : 0) +
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

  // Get selected line items
  const selectedLineItems = useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => enrichedLineItems[parseInt(index)])
      .filter(Boolean);
  }, [rowSelection, enrichedLineItems]);

  // Bulk action handlers
  const handleBulkExport = () => {
    if (selectedLineItems.length === 0) return;

    exportToCsv(
      selectedLineItems,
      `line-items-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'name', header: 'Line Item Name' },
        { key: 'campaignName', header: 'Campaign' },
        { key: 'bookedAmount', header: 'Booked Amount' },
        { key: 'actualAmount', header: 'Actual Amount' },
        { key: 'adjustments', header: 'Adjustments' },
        { key: 'createdAt', header: 'Created At' },
      ]
    );

    toast.success('Export successful', {
      description: `Exported ${selectedLineItems.length} line item${selectedLineItems.length > 1 ? 's' : ''} to CSV`,
    });
  };

  const handleClearSelection = () => {
    setRowSelection({});
  };

  // Validation for creating invoice
  const canCreateInvoice = useMemo(() => {
    if (selectedLineItems.length === 0) {
      return { valid: false, error: 'No line items selected' };
    }

    // Check if all line items are from the same campaign
    const campaignIds = new Set(selectedLineItems.map(item => item.campaignId));
    if (campaignIds.size > 1) {
      return { valid: false, error: 'Line items must be from the same campaign' };
    }

    // Check if any line items are already on an invoice
    const alreadyInvoiced = selectedLineItems.filter(item => item.invoiceId);
    if (alreadyInvoiced.length > 0) {
      return { valid: false, error: `${alreadyInvoiced.length} line item${alreadyInvoiced.length > 1 ? 's are' : ' is'} already on an invoice` };
    }

    return { valid: true, error: null };
  }, [selectedLineItems]);

  const handleCreateInvoice = () => {
    if (!canCreateInvoice.valid) {
      toast.error('Cannot create invoice', {
        description: canCreateInvoice.error!,
      });
      return;
    }

    setShowCreateDialog(true);
  };

  const handleConfirmCreateInvoice = async (data: {
    clientName: string;
    clientEmail: string;
    issueDate: Date;
    dueDate: Date;
    currency: string;
  }) => {
    if (selectedLineItems.length === 0) return;

    const campaignId = selectedLineItems[0].campaignId;
    const bookedAmount = selectedLineItems.reduce((sum, item) => sum + item.bookedAmount, 0);
    const actualAmount = selectedLineItems.reduce((sum, item) => sum + item.actualAmount, 0);
    const totalAdjustments = selectedLineItems.reduce((sum, item) => sum + item.adjustments, 0);
    const totalAmount = actualAmount + totalAdjustments;

    try {
      const invoiceId = await createInvoice.mutateAsync({
        campaignId,
        lineItemIds: selectedLineItems.map(item => item.id),
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: data.currency,
        bookedAmount,
        actualAmount,
        totalAdjustments,
        totalAmount,
      });

      setShowCreateDialog(false);
      setRowSelection({});

      toast.success('Invoice created', {
        description: `Successfully created invoice with ${selectedLineItems.length} line item${selectedLineItems.length > 1 ? 's' : ''}`,
      });

      // Navigate to the new invoice
      navigate(`/invoices/${invoiceId}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice', {
        description: 'Please try again or contact support if the problem persists',
      });
    }
  };

  // Validation for adding to invoice
  const canAddToInvoice = useMemo(() => {
    if (selectedLineItems.length === 0) {
      return { valid: false, error: 'No line items selected' };
    }

    // Check if all line items are from the same campaign
    const campaignIds = new Set(selectedLineItems.map(item => item.campaignId));
    if (campaignIds.size > 1) {
      return { valid: false, error: 'Line items must be from the same campaign' };
    }

    // Check if any line items are already on an invoice
    const alreadyInvoiced = selectedLineItems.filter(item => item.invoiceId);
    if (alreadyInvoiced.length > 0) {
      return { valid: false, error: `${alreadyInvoiced.length} line item${alreadyInvoiced.length > 1 ? 's are' : ' is'} already on an invoice` };
    }

    return { valid: true, error: null };
  }, [selectedLineItems]);

  const handleAddToInvoice = () => {
    if (!canAddToInvoice.valid) {
      toast.error('Cannot add to invoice', {
        description: canAddToInvoice.error!,
      });
      return;
    }

    setShowAddToInvoiceDialog(true);
  };

  const handleConfirmAddToInvoice = async (invoiceId: string) => {
    if (selectedLineItems.length === 0) return;

    try {
      await addToInvoice.mutateAsync({
        invoiceId,
        lineItemIds: selectedLineItems.map(item => item.id),
      });

      setShowAddToInvoiceDialog(false);
      setRowSelection({});

      toast.success('Line items added to invoice', {
        description: `Successfully added ${selectedLineItems.length} line item${selectedLineItems.length > 1 ? 's' : ''} to invoice`,
      });

      // Navigate to the invoice
      navigate(`/invoices/${invoiceId}`);
    } catch (error) {
      console.error('Failed to add to invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to add to invoice', {
        description: errorMessage,
      });
    }
  };

  // Validation for moving to invoice
  const canMoveToInvoice = useMemo(() => {
    if (selectedLineItems.length === 0) {
      return { valid: false, error: 'No line items selected' };
    }

    // Check if all line items are from the same campaign
    const campaignIds = new Set(selectedLineItems.map(item => item.campaignId));
    if (campaignIds.size > 1) {
      return { valid: false, error: 'Line items must be from the same campaign' };
    }

    // Check if all line items are on an invoice
    const notInvoiced = selectedLineItems.filter(item => !item.invoiceId);
    if (notInvoiced.length > 0) {
      return { valid: false, error: `${notInvoiced.length} line item${notInvoiced.length > 1 ? 's are' : ' is'} not on any invoice` };
    }

    // Check if all line items are from the same invoice
    const invoiceIds = new Set(selectedLineItems.map(item => item.invoiceId));
    if (invoiceIds.size > 1) {
      return { valid: false, error: 'Line items must all be from the same invoice' };
    }

    return { valid: true, error: null };
  }, [selectedLineItems]);

  const handleMoveToInvoice = () => {
    if (!canMoveToInvoice.valid) {
      toast.error('Cannot move to invoice', {
        description: canMoveToInvoice.error!,
      });
      return;
    }

    setShowMoveToInvoiceDialog(true);
  };

  const handleConfirmMoveToInvoice = async (toInvoiceId: string) => {
    if (selectedLineItems.length === 0) return;

    const fromInvoiceId = selectedLineItems[0].invoiceId;
    if (!fromInvoiceId) return;

    try {
      await moveToInvoice.mutateAsync({
        fromInvoiceId,
        toInvoiceId,
        lineItemIds: selectedLineItems.map(item => item.id),
      });

      setShowMoveToInvoiceDialog(false);
      setRowSelection({});

      toast.success('Line items moved to invoice', {
        description: `Successfully moved ${selectedLineItems.length} line item${selectedLineItems.length > 1 ? 's' : ''} to invoice`,
      });

      // Navigate to the destination invoice
      navigate(`/invoices/${toInvoiceId}`);
    } catch (error) {
      console.error('Failed to move to invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to move to invoice', {
        description: errorMessage,
      });
    }
  };

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
                        return (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="break-words">
                                    {isLong ? `${campaign.name.slice(0, 35)}...` : campaign.name}
                                  </span>
                                </TooltipTrigger>
                                {isLong && (
                                  <TooltipContent>
                                    <p className="max-w-xs">{campaign.name}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </SelectItem>
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
                            const number = invoice?.invoiceNumber || ''
                            return number
                          })()
                          : "All invoices"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-w-[280px]">
                      <SelectItem value="all">All invoices</SelectItem>
                      <SelectItem value="not-invoiced">Not invoiced</SelectItem>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber}
                        </SelectItem>
                      ))}
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
          {dataFilters.invoiceId && (
            <FilterBadge
              label="Invoice"
              value={dataFilters.invoiceId === 'not-invoiced'
                ? 'Not invoiced'
                : invoices.find(inv => inv.id === dataFilters.invoiceId)?.invoiceNumber || dataFilters.invoiceId
              }
              onRemove={() => handleFilterChange({ invoiceId: undefined })}
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

      <BulkActionToolbar
        selectedCount={selectedLineItems.length}
        onClearSelection={handleClearSelection}
        actions={[
          {
            label: 'Create Invoice',
            icon: <FileText className="mr-2 h-4 w-4" />,
            onClick: handleCreateInvoice,
            variant: 'default',
          },
          {
            label: 'Add to Invoice',
            icon: <FolderPlus className="mr-2 h-4 w-4" />,
            onClick: handleAddToInvoice,
            variant: 'default',
          },
          {
            label: 'Move to Invoice',
            icon: <ArrowRightLeft className="mr-2 h-4 w-4" />,
            onClick: handleMoveToInvoice,
            variant: 'default',
          },
          {
            label: 'Export CSV',
            icon: <Download className="mr-2 h-4 w-4" />,
            onClick: handleBulkExport,
            variant: 'secondary',
          },
        ]}
      />

      <CreateInvoiceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        lineItems={selectedLineItems}
        onConfirm={handleConfirmCreateInvoice}
        isCreating={createInvoice.isPending}
      />

      <AddToInvoiceDialog
        open={showAddToInvoiceDialog}
        onOpenChange={setShowAddToInvoiceDialog}
        lineItems={selectedLineItems}
        invoices={invoices}
        onConfirm={handleConfirmAddToInvoice}
        isAdding={addToInvoice.isPending}
      />

      <MoveToInvoiceDialog
        open={showMoveToInvoiceDialog}
        onOpenChange={setShowMoveToInvoiceDialog}
        lineItems={selectedLineItems}
        invoices={invoices}
        onConfirm={handleConfirmMoveToInvoice}
        isMoving={moveToInvoice.isPending}
      />
    </div>
  )
}

export default LineItems
