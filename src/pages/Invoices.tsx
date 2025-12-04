import { useInvoices, useInvoiceCount } from '@/hooks/useInvoices'
import { useCampaignsContext } from '@/contexts/CampaignsContext'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { Checkbox } from '@/components/ui/checkbox'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DataTable from '@/components/DataTable'
import InvoiceLineItemsTable from '@/components/InvoiceLineItemsTable'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronDown } from 'lucide-react'
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
    header: "Total Amount",
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

  // Data filters (non-pagination)
  const [dataFilters, setDataFilters] = useState<Omit<InvoiceFilters, 'page' | 'pageSize' | 'cursor'>>({})

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
    // Reset pagination when filters change
    reset()
  }

  return (
    <div className='container h-full flex flex-col'>
      <h1 className="text-3xl font-bold mb-6">Invoices</h1>

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
          data={enrichedInvoices}
          columns={columns}
          setRowSelection={setRowSelection}
          rowSelection={rowSelection}
          expanded={expanded}
          setExpanded={setExpanded}
          renderSubRow={(row) => (
            <InvoiceLineItemsTable
              invoiceId={row.original.id}
              invoiceStatus={row.original.status}
            />
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
    </div>
  )
}

export default Invoices
