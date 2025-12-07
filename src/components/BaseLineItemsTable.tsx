/**
 * Self-contained line items table component with two modes:
 *
 * **Global Mode**: Displays all line items across campaigns/invoices
 * - Shows campaign and invoice columns
 * - Built-in filter UI (popover with campaign, invoice, date filters)
 * - Filter state synced with URL params
 * - Built-in pagination
 * - Filters can be hidden with showFilters={false}
 * - Pagination can be hidden with showPagination={false}
 * - Bulk actions: Create Invoice, Add to Invoice, Move to Invoice, Export
 *
 * **Invoice Mode**: Displays line items for a specific invoice
 * - Shows total and actions columns
 * - No campaign/invoice columns (implicit context)
 * - No filters (specific to invoice)
 * - No pagination by default (loads all items, can enable with showPagination={true})
 * - Bulk actions: Remove from Invoice, Move to Invoice, Export
 * - Individual edit adjustments available for draft/overdue invoices
 *
 * @example Global mode (simplest - fully self-contained)
 * ```tsx
 * <BaseLineItemsTable mode="global" />
 * ```
 *
 * @example Global mode with initial filters (from parent or URL)
 * ```tsx
 * <BaseLineItemsTable
 *   mode="global"
 *   initialFilters={{ campaignId: 'abc123' }}
 * />
 * ```
 *
 * @example Global mode without filters UI
 * ```tsx
 * <BaseLineItemsTable
 *   mode="global"
 *   showFilters={false}
 * />
 * ```
 *
 * @example Invoice mode
 * ```tsx
 * <BaseLineItemsTable
 *   mode="invoice"
 *   invoiceId={invoiceId}
 *   invoiceStatus={status}
 * />
 * ```
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLineItems, useLineItemCount } from '@/hooks/useLineItems'
import { useInvoice } from '@/hooks/useInvoices'
import { useCampaignsContext } from '@/contexts/CampaignsContext'
import { useInvoicesContext } from '@/contexts/InvoicesContext'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DateRangeFilter } from '@/components/ui/date-range-filter'
import { FilterBadge } from '@/components/FilterBadge'
import DataTable from '@/components/DataTable'
import { BulkActionToolbar } from '@/components/BulkActionToolbar'
import { CreateInvoiceDialog } from '@/components/CreateInvoiceDialog'
import { AddToInvoiceDialog } from '@/components/AddToInvoiceDialog'
import { MoveToInvoiceDialog } from '@/components/MoveToInvoiceDialog'
import { AdjustmentModal } from '@/components/AdjustmentModal'
import { exportToCsv } from '@/lib/exportToCsv'
import { useCreateInvoiceFromLineItems, useAddLineItemsToInvoice, useMoveLineItemsToInvoice, useRemoveLineItemsFromInvoice } from '@/hooks/useInvoices'
import { useUpdateLineItemAdjustments } from '@/hooks/useLineItems'
import { useUpdateInvoiceAmounts } from '@/hooks/useInvoices'
import { useCreateChangeLog } from '@/hooks/useChangeLog'
import { toast } from 'sonner'
import { Pencil, FileText, FolderPlus, ArrowRightLeft, Download, Trash2, Filter } from 'lucide-react'
import type { LineItem, LineItemFilters } from '@/types/lineItem'
import type { RowSelectionState, Row, Table, ColumnDef } from '@tanstack/react-table'

// ============================================================================
// TYPES
// ============================================================================

type LineItemsTableMode = 'global' | 'invoice'

interface BaseLineItemsTableProps {
  // Mode determines behavior
  mode: LineItemsTableMode

  // Invoice mode specific props
  invoiceId?: string
  invoiceStatus?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

  // Global mode - optional initial filters (from URL or parent)
  initialFilters?: {
    campaignId?: string
    invoiceId?: string
    createdDateRange?: { from?: Date; to?: Date }
  }

  // Layout
  compact?: boolean
  showPagination?: boolean
  showFilters?: boolean

  // Callbacks (optional)
  onSelectionChange?: (selectedItems: LineItem[]) => void
  onTotalUpdate?: (newTotal: number) => void
}

type EnrichedLineItem = LineItem & {
  campaignName?: string
  invoiceNumber?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function BaseLineItemsTable({
  mode,
  invoiceId,
  invoiceStatus,
  initialFilters,
  showPagination = mode === 'global',
  showFilters = mode === 'global',
  onSelectionChange,
  onTotalUpdate,
}: BaseLineItemsTableProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { campaigns } = useCampaignsContext()
  const { invoices } = useInvoicesContext()

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAddToInvoiceDialog, setShowAddToInvoiceDialog] = useState(false)
  const [showMoveToInvoiceDialog, setShowMoveToInvoiceDialog] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(null)

  // Global mode: Filter state (from URL params or initialFilters)
  const [dataFilters, setDataFilters] = useState<Omit<LineItemFilters, 'page' | 'pageSize' | 'cursor'>>(() => {
    if (mode === 'global') {
      return {
        campaignId: searchParams.get('campaignId') || initialFilters?.campaignId,
        invoiceId: searchParams.get('invoiceId') || initialFilters?.invoiceId,
        createdDateRange: initialFilters?.createdDateRange,
      }
    }
    return {}
  })

  // Global mode: Pagination state
  const { pagination, setPagination, cursor, setLastDoc, reset } = useCursorPagination({
    initialPageSize: mode === 'global' ? 100 : 100,
  })

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Build filters based on mode
  const filters = useMemo(() => {
    if (mode === 'invoice') {
      return { invoiceId, pageSize: 100 }
    } else {
      return {
        ...dataFilters,
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        cursor,
      }
    }
  }, [mode, invoiceId, dataFilters, pagination.pageIndex, pagination.pageSize, cursor])

  // Fetch line items
  const { data: response, isLoading } = useLineItems(filters)

  // Fetch invoice details (for invoice mode)
  const { data: invoice } = useInvoice(invoiceId, { enabled: mode === 'invoice' && !!invoiceId })

  // Fetch total count (for global mode pagination)
  const { data: totalCount = 0 } = useLineItemCount(dataFilters, { enabled: mode === 'global' })

  // Update lastDoc when response arrives (global mode pagination)
  useEffect(() => {
    if (mode === 'global' && response?.lastDoc) {
      setLastDoc(response.lastDoc)
    }
  }, [mode, response?.lastDoc, setLastDoc])

  // ============================================================================
  // DATA ENRICHMENT
  // ============================================================================

  const enrichedLineItems = useMemo(() => {
    const lineItems = response?.data ?? []

    if (mode === 'invoice') {
      // Invoice mode: no enrichment needed (campaign/invoice are implicit)
      return lineItems
    } else {
      // Global mode: enrich with campaign names and invoice numbers
      const campaignMap = new Map(campaigns.map(c => [c.id, c.name]))
      const invoiceMap = new Map(invoices.map(inv => [inv.id, inv.invoiceNumber]))

      return lineItems.map(lineItem => ({
        ...lineItem,
        campaignName: campaignMap.get(lineItem.campaignId),
        invoiceNumber: lineItem.invoiceId ? invoiceMap.get(lineItem.invoiceId) : undefined,
      })) as EnrichedLineItem[]
    }
  }, [response?.data, mode, campaigns, invoices])

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  // Check if adjustments can be edited (invoice mode only, draft/overdue invoices)
  const canEditAdjustments = mode === 'invoice' && (invoiceStatus === 'draft' || invoiceStatus === 'overdue')

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // Global mode mutations
  const createInvoice = useCreateInvoiceFromLineItems()
  const addToInvoice = useAddLineItemsToInvoice()
  const moveToInvoice = useMoveLineItemsToInvoice()

  // Invoice mode mutations
  const removeFromInvoice = useRemoveLineItemsFromInvoice()
  const updateAdjustments = useUpdateLineItemAdjustments()
  const updateInvoiceAmounts = useUpdateInvoiceAmounts()
  const createChangeLog = useCreateChangeLog()

  // ============================================================================
  // SELECTED ITEMS
  // ============================================================================

  const selectedLineItems = useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => enrichedLineItems[parseInt(index)])
      .filter(Boolean)
  }, [rowSelection, enrichedLineItems])

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedLineItems)
    }
  }, [selectedLineItems, onSelectionChange])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleEditAdjustment = useCallback((lineItem: LineItem) => {
    setSelectedLineItem(lineItem)
    setShowAdjustmentModal(true)
  }, [])

  const handleClearSelection = useCallback(() => {
    setRowSelection({})
  }, [])

  // Filter change handler
  const handleFilterChange = useCallback((updates: Partial<LineItemFilters>) => {
    setDataFilters(prev => ({
      ...prev,
      ...updates,
    }))

    // Reset pagination when filters change
    reset()

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
  }, [reset, searchParams, setSearchParams])

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

  // ============================================================================
  // COLUMN CONFIGURATION (mode-based)
  // ============================================================================

  const columns = useMemo<ColumnDef<EnrichedLineItem>[]>(() => {
    const cols: ColumnDef<EnrichedLineItem>[] = []

    // SELECT COLUMN (always)
    cols.push({
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
    })

    // NAME COLUMN (always)
    cols.push({
      accessorKey: "name",
      header: "Line Item Name",
      cell: ({ row }: { row: Row<EnrichedLineItem> }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    })

    // CAMPAIGN COLUMN (global mode only)
    if (mode === 'global') {
      cols.push({
        accessorKey: "campaignId",
        header: "Campaign",
        cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
          const campaignId = row.getValue("campaignId") as string
          const campaignName = row.original.campaignName
          return (
            <Link
              to={`/campaigns/${campaignId}`}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {campaignName || campaignId}
            </Link>
          )
        },
      })
    }

    // BOOKED AMOUNT COLUMN (always)
    cols.push({
      accessorKey: "bookedAmount",
      header: () => <div className="text-right">Booked Amount</div>,
      cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
        const amount = row.getValue("bookedAmount") as number
        return <div className="text-right">${amount.toLocaleString()}</div>
      },
    })

    // ACTUAL AMOUNT COLUMN (always)
    cols.push({
      accessorKey: "actualAmount",
      header: () => <div className="text-right">Actual Amount</div>,
      cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
        const amount = row.getValue("actualAmount") as number
        return <div className="text-right">${amount.toLocaleString()}</div>
      },
    })

    // ADJUSTMENTS COLUMN (always)
    cols.push({
      accessorKey: "adjustments",
      header: () => <div className="text-right">Adjustments</div>,
      cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
        const amount = row.getValue("adjustments") as number
        const isNegative = amount < 0
        return (
          <div className={`text-right ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
            {isNegative ? '-' : '+'}${Math.abs(amount).toLocaleString()}
          </div>
        )
      },
    })

    // TOTAL COLUMN (invoice mode only)
    if (mode === 'invoice') {
      cols.push({
        id: 'total',
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
          const lineItem = row.original
          const total = lineItem.actualAmount + lineItem.adjustments
          return <div className="text-right font-medium">${total.toLocaleString()}</div>
        },
      })
    }

    // INVOICE COLUMN (global mode only)
    if (mode === 'global') {
      cols.push({
        accessorKey: "invoiceId",
        header: "Invoice",
        cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
          const invoiceId = row.getValue("invoiceId") as string | undefined
          const invoiceNumber = row.original.invoiceNumber

          if (!invoiceId) {
            return <div className="text-muted-foreground text-sm">Not invoiced</div>
          }

          return (
            <Link
              to={`/invoices/${invoiceId}`}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {invoiceNumber || invoiceId}
            </Link>
          )
        },
      })
    }

    // CREATED COLUMN (global mode only)
    if (mode === 'global') {
      cols.push({
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
          const date = row.getValue("createdAt") as Date
          return <div>{date?.toLocaleDateString()}</div>
        },
      })
    }

    // ACTIONS COLUMN (invoice mode only, if can edit)
    if (mode === 'invoice' && canEditAdjustments) {
      cols.push({
        id: 'actions',
        header: () => <div className="text-center">Actions</div>,
        cell: ({ row }: { row: Row<EnrichedLineItem> }) => {
          const lineItem = row.original

          return (
            <div className="flex items-center justify-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEditAdjustment(lineItem)}
                className="h-7 w-7 p-0"
                title="Edit adjustment"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      })
    }

    return cols
  }, [mode, canEditAdjustments, handleEditAdjustment])

  // ============================================================================
  // GLOBAL MODE - BULK ACTION HANDLERS
  // ============================================================================

  // Validation for creating invoice
  const canCreateInvoice = useMemo(() => {
    if (selectedLineItems.length === 0) {
      return { valid: false, error: 'No line items selected' }
    }

    const campaignIds = new Set(selectedLineItems.map(item => item.campaignId))
    if (campaignIds.size > 1) {
      return { valid: false, error: 'Line items must be from the same campaign' }
    }

    const alreadyInvoiced = selectedLineItems.filter(item => item.invoiceId)
    if (alreadyInvoiced.length > 0) {
      return { valid: false, error: `${alreadyInvoiced.length} line item${alreadyInvoiced.length > 1 ? 's are' : ' is'} already on an invoice` }
    }

    return { valid: true, error: null }
  }, [selectedLineItems])

  const handleCreateInvoice = useCallback(() => {
    if (!canCreateInvoice.valid) {
      toast.error('Cannot create invoice', {
        description: canCreateInvoice.error!,
      })
      return
    }
    setShowCreateDialog(true)
  }, [canCreateInvoice])

  const handleConfirmCreateInvoice = async (data: {
    clientName: string
    clientEmail: string
    issueDate: Date
    dueDate: Date
    currency: string
  }) => {
    if (selectedLineItems.length === 0) return

    const campaignId = selectedLineItems[0].campaignId
    const bookedAmount = selectedLineItems.reduce((sum, item) => sum + item.bookedAmount, 0)
    const actualAmount = selectedLineItems.reduce((sum, item) => sum + item.actualAmount, 0)
    const totalAdjustments = selectedLineItems.reduce((sum, item) => sum + item.adjustments, 0)
    const totalAmount = actualAmount + totalAdjustments

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
      })

      setShowCreateDialog(false)
      setRowSelection({})

      toast.success('Invoice created', {
        description: `Successfully created invoice with ${selectedLineItems.length} line item${selectedLineItems.length > 1 ? 's' : ''}`,
      })

      navigate(`/invoices/${invoiceId}`)
    } catch (error) {
      console.error('Failed to create invoice:', error)
      toast.error('Failed to create invoice', {
        description: 'Please try again or contact support if the problem persists',
      })
    }
  }

  // Validation for adding to invoice
  const canAddToInvoice = useMemo(() => {
    if (selectedLineItems.length === 0) {
      return { valid: false, error: 'No line items selected' }
    }

    const campaignIds = new Set(selectedLineItems.map(item => item.campaignId))
    if (campaignIds.size > 1) {
      return { valid: false, error: 'Line items must be from the same campaign' }
    }

    const alreadyInvoiced = selectedLineItems.filter(item => item.invoiceId)
    if (alreadyInvoiced.length > 0) {
      return { valid: false, error: `${alreadyInvoiced.length} line item${alreadyInvoiced.length > 1 ? 's are' : ' is'} already on an invoice` }
    }

    return { valid: true, error: null }
  }, [selectedLineItems])

  const handleAddToInvoice = useCallback(() => {
    if (!canAddToInvoice.valid) {
      toast.error('Cannot add to invoice', {
        description: canAddToInvoice.error!,
      })
      return
    }
    setShowAddToInvoiceDialog(true)
  }, [canAddToInvoice])

  const handleConfirmAddToInvoice = async (invoiceId: string) => {
    if (selectedLineItems.length === 0) return

    try {
      await addToInvoice.mutateAsync({
        invoiceId,
        lineItemIds: selectedLineItems.map(item => item.id),
      })

      setShowAddToInvoiceDialog(false)
      setRowSelection({})

      toast.success('Line items added to invoice', {
        description: `Successfully added ${selectedLineItems.length} line item${selectedLineItems.length > 1 ? 's' : ''} to invoice`,
      })

      navigate(`/invoices/${invoiceId}`)
    } catch (error) {
      console.error('Failed to add to invoice:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to add to invoice', {
        description: errorMessage,
      })
    }
  }

  // Validation for moving to invoice (global mode)
  const canMoveToInvoiceGlobal = useMemo(() => {
    if (selectedLineItems.length === 0) {
      return { valid: false, error: 'No line items selected' }
    }

    const campaignIds = new Set(selectedLineItems.map(item => item.campaignId))
    if (campaignIds.size > 1) {
      return { valid: false, error: 'Line items must be from the same campaign' }
    }

    const notInvoiced = selectedLineItems.filter(item => !item.invoiceId)
    if (notInvoiced.length > 0) {
      return { valid: false, error: `${notInvoiced.length} line item${notInvoiced.length > 1 ? 's are' : ' is'} not on any invoice` }
    }

    const invoiceIds = new Set(selectedLineItems.map(item => item.invoiceId))
    if (invoiceIds.size > 1) {
      return { valid: false, error: 'Line items must all be from the same invoice' }
    }

    return { valid: true, error: null }
  }, [selectedLineItems])

  const handleMoveToInvoiceGlobal = useCallback(() => {
    if (!canMoveToInvoiceGlobal.valid) {
      toast.error('Cannot move to invoice', {
        description: canMoveToInvoiceGlobal.error!,
      })
      return
    }
    setShowMoveToInvoiceDialog(true)
  }, [canMoveToInvoiceGlobal])

  const handleConfirmMoveToInvoice = async (toInvoiceId: string) => {
    if (selectedLineItems.length === 0) return

    const fromInvoiceId = selectedLineItems[0].invoiceId
    if (!fromInvoiceId) return

    try {
      await moveToInvoice.mutateAsync({
        fromInvoiceId,
        toInvoiceId,
        lineItemIds: selectedLineItems.map(item => item.id),
      })

      setShowMoveToInvoiceDialog(false)
      setRowSelection({})

      toast.success('Line items moved to invoice', {
        description: `Successfully moved ${selectedLineItems.length} line item${selectedLineItems.length > 1 ? 's' : ''} to invoice`,
      })

      navigate(`/invoices/${toInvoiceId}`)
    } catch (error) {
      console.error('Failed to move to invoice:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to move to invoice', {
        description: errorMessage,
      })
    }
  }

  // Export handler (both modes)
  const handleBulkExport = useCallback(() => {
    if (selectedLineItems.length === 0) return

    const columns = mode === 'global'
      ? [
        { key: 'name' as const, header: 'Line Item Name' },
        { key: 'campaignId' as const, header: 'Campaign' },
        { key: 'bookedAmount' as const, header: 'Booked Amount' },
        { key: 'actualAmount' as const, header: 'Actual Amount' },
        { key: 'adjustments' as const, header: 'Adjustments' },
        { key: 'createdAt' as const, header: 'Created At' },
      ]
      : [
        { key: 'name' as const, header: 'Line Item Name' },
        { key: 'bookedAmount' as const, header: 'Booked Amount' },
        { key: 'actualAmount' as const, header: 'Actual Amount' },
        { key: 'adjustments' as const, header: 'Adjustments' },
      ]

    exportToCsv(
      selectedLineItems,
      `line-items-${new Date().toISOString().split('T')[0]}`,
      columns
    )

    toast.success('Export successful', {
      description: `Exported ${selectedLineItems.length} line item${selectedLineItems.length > 1 ? 's' : ''} to CSV`,
    })
  }, [selectedLineItems, mode])

  // ============================================================================
  // INVOICE MODE - BULK ACTION HANDLERS
  // ============================================================================

  const handleRemoveFromInvoice = useCallback(async () => {
    if (selectedLineItems.length === 0 || !invoiceId) return

    try {
      await removeFromInvoice.mutateAsync({
        invoiceId,
        lineItemIds: selectedLineItems.map(item => item.id),
      })

      setRowSelection({})

      toast.success('Line items removed from invoice', {
        description: `Successfully removed ${selectedLineItems.length} line item${selectedLineItems.length > 1 ? 's' : ''} from invoice`,
      })
    } catch (error) {
      console.error('Failed to remove from invoice:', error)
      toast.error('Failed to remove from invoice', {
        description: 'Please try again or contact support if the problem persists',
      })
    }
  }, [selectedLineItems, invoiceId, removeFromInvoice])

  const handleMoveToInvoiceInvoiceMode = useCallback(() => {
    if (selectedLineItems.length === 0) {
      toast.error('No line items selected')
      return
    }
    setShowMoveToInvoiceDialog(true)
  }, [selectedLineItems])

  // TODO: Bulk edit adjustments handler

  // ============================================================================
  // BULK ACTIONS CONFIGURATION (mode-based)
  // ============================================================================

  const bulkActions = useMemo(() => {
    if (mode === 'global') {
      return [
        {
          label: 'Create Invoice',
          icon: <FileText className="mr-2 h-4 w-4" />,
          onClick: handleCreateInvoice,
          variant: 'default' as const,
        },
        {
          label: 'Add to Invoice',
          icon: <FolderPlus className="mr-2 h-4 w-4" />,
          onClick: handleAddToInvoice,
          variant: 'default' as const,
        },
        {
          label: 'Move to Invoice',
          icon: <ArrowRightLeft className="mr-2 h-4 w-4" />,
          onClick: handleMoveToInvoiceGlobal,
          variant: 'default' as const,
        },
        {
          label: 'Export CSV',
          icon: <Download className="mr-2 h-4 w-4" />,
          onClick: handleBulkExport,
          variant: 'secondary' as const,
        },
      ]
    } else {
      // Invoice mode
      const actions = []

      if (canEditAdjustments) {
        actions.push(
          {
            label: 'Remove from Invoice',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: handleRemoveFromInvoice,
            variant: 'destructive' as const,
          },
          {
            label: 'Move to Another Invoice',
            icon: <ArrowRightLeft className="mr-2 h-4 w-4" />,
            onClick: handleMoveToInvoiceInvoiceMode,
            variant: 'default' as const,
          }
        )
      }

      actions.push({
        label: 'Export CSV',
        icon: <Download className="mr-2 h-4 w-4" />,
        onClick: handleBulkExport,
        variant: 'secondary' as const,
      })

      return actions
    }
  }, [mode, canEditAdjustments, handleBulkExport, handleCreateInvoice, handleAddToInvoice, handleMoveToInvoiceGlobal, handleRemoveFromInvoice, handleMoveToInvoiceInvoiceMode])

  // ============================================================================
  // INDIVIDUAL ADJUSTMENT HANDLER (invoice mode)
  // ============================================================================

  const handleSaveAdjustment = async (data: { newAdjustment: number; comment: string }) => {
    if (!selectedLineItem || !invoice || mode !== 'invoice' || !invoiceId) return

    const { newAdjustment, comment } = data

    try {
      // Create change log entry first
      const changeType = selectedLineItem.adjustments === 0 ? 'adjustment_created' : 'adjustment_updated'

      await createChangeLog.mutateAsync({
        entityType: 'line_item',
        entityId: selectedLineItem.id,
        changeType,
        previousAmount: selectedLineItem.adjustments,
        newAmount: newAdjustment,
        difference: newAdjustment - selectedLineItem.adjustments,
        bookedAmountAtTime: selectedLineItem.bookedAmount,
        actualAmountAtTime: selectedLineItem.actualAmount,
        comment,
        userName: 'System',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        campaignId: invoice.campaignId,
        lineItemName: selectedLineItem.name,
      })

      // Update the line item adjustment
      await updateAdjustments.mutateAsync({
        id: selectedLineItem.id,
        adjustments: newAdjustment,
      })

      // Calculate new invoice amounts
      const lineItems = enrichedLineItems
      const amounts = lineItems.reduce((acc, item) => {
        const adjustments = item.id === selectedLineItem.id ? newAdjustment : item.adjustments
        return {
          bookedAmount: acc.bookedAmount + item.bookedAmount,
          actualAmount: acc.actualAmount + item.actualAmount,
          totalAdjustments: acc.totalAdjustments + adjustments,
        }
      }, { bookedAmount: 0, actualAmount: 0, totalAdjustments: 0 })

      const totalAmount = amounts.actualAmount + amounts.totalAdjustments

      // Update invoice amounts
      await updateInvoiceAmounts.mutateAsync({
        id: invoiceId,
        amounts: {
          bookedAmount: Math.round(amounts.bookedAmount * 100) / 100,
          actualAmount: Math.round(amounts.actualAmount * 100) / 100,
          totalAdjustments: Math.round(amounts.totalAdjustments * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
        },
      })

      // Notify parent component
      if (onTotalUpdate) {
        onTotalUpdate(Math.round(totalAmount * 100) / 100)
      }

      // Close modal
      setShowAdjustmentModal(false)
      setSelectedLineItem(null)

      // Show success toast
      toast.success('Adjustment updated', {
        description: `Successfully updated adjustment to $${Math.abs(newAdjustment).toLocaleString()}`,
      })
    } catch (error) {
      console.error('Failed to update adjustment:', error)
      toast.error('Failed to update adjustment', {
        description: 'Please try again or contact support if the problem persists',
      })
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Filter UI - Global Mode Only */}
      {showFilters && mode === 'global' && (
        <div className="mb-4 space-y-4">
          {/* Filter Button */}
          <div className="flex items-center justify-between">
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

                    {/* Invoice Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Invoice</label>
                      <SearchableSelect
                        options={[
                          { label: 'Not invoiced', value: 'not-invoiced' },
                          ...invoices.map((invoice) => ({
                            label: invoice.invoiceNumber,
                            value: invoice.id,
                          }))
                        ]}
                        value={dataFilters.invoiceId}
                        onChange={(value) => {
                          handleFilterChange({
                            invoiceId: value,
                          })
                        }}
                        placeholder="All invoices"
                        searchPlaceholder="Search invoices..."
                        emptyText="No invoices found"
                        className="w-full"
                      />
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
            <div className="flex flex-wrap gap-2">
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
        </div>
      )}
      <div className='flex-1 min-h-0 overflow-auto'>
        <DataTable
          data={enrichedLineItems}
          columns={columns}
          setRowSelection={setRowSelection}
          rowSelection={rowSelection}
          pagination={pagination}
          setPagination={setPagination}
          totalCount={totalCount}
          isLoading={isLoading}
          enableGlobalSearch={mode === 'global'}
          globalSearchPlaceholder={mode === 'global' ? "Search line items... (searches current page)" : undefined}
          pageSizeOptions={showPagination ? [1, 5, 10, 20, 50, 100] : []}
        />
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedLineItems.length}
        onClearSelection={handleClearSelection}
        actions={bulkActions}
      />

      {/* Dialogs - Global Mode */}
      {mode === 'global' && (
        <>
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
        </>
      )}

      {/* Dialogs - Invoice Mode */}
      {mode === 'invoice' && invoice && (
        <>
          <AdjustmentModal
            open={showAdjustmentModal}
            onOpenChange={setShowAdjustmentModal}
            lineItem={selectedLineItem}
            onConfirm={handleSaveAdjustment}
            isSaving={createChangeLog.isPending || updateAdjustments.isPending || updateInvoiceAmounts.isPending}
          />

          <MoveToInvoiceDialog
            open={showMoveToInvoiceDialog}
            onOpenChange={setShowMoveToInvoiceDialog}
            lineItems={selectedLineItems}
            invoices={invoices}
            onConfirm={handleConfirmMoveToInvoice}
            isMoving={moveToInvoice.isPending}
          />
        </>
      )}
    </div>
  )
}

export default BaseLineItemsTable
