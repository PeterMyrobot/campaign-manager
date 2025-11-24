import { useCampaigns } from '@/hooks/useCampaigns'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ArrowUpDown } from 'lucide-react'
import DataTable from '@/components/DataTable'
import { useState } from 'react'

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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("status")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      console.log(column, column.getIsSorted())

      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown />
        </Button>
      )
    },
    cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <Button
      className=''
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      Amount
    </Button>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      // Format the amount as a dollar amount
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
]

const data = [
  {
    id: "m5gr84i9",
    amount: 316,
    status: "success",
    email: "ken99@example.com",
  },
  {
    id: "3u1reuv4",
    amount: 242,
    status: "success",
    email: "Abe45@example.com",
  },
  {
    id: "derv1ws0",
    amount: 837,
    status: "processing",
    email: "Monserrat44@example.com",
  },
  {
    id: "5kma53ae",
    amount: 874,
    status: "success",
    email: "Silas22@example.com",
  },
  {
    id: "bhqecj4p",
    amount: 721,
    status: "failed",
    email: "carmella@example.com",
  },
]

function Campaigns() {

  const { data: campaigns = [] } = useCampaigns()

  console.log(campaigns)
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    useState({})
  const [rowSelection, setRowSelection] = useState({})
  return (
    <div className='container'>
      Campaigns
      <Button>Button</Button>

      <div className="flex items-center gap-4 py-4">
        <div className="flex items-center gap-2">
          <span>Filter Email:</span>
          <Input
            type="text"
            placeholder="Search emails..."
            className="max-w-xs"
            value={(columnFilters.find((f) => f.id === "email")?.value as string) ?? ""}
            onChange={(e) =>
              setColumnFilters((prev) =>
                e.target.value
                  ? [...prev.filter((f) => f.id !== "email"), { id: "email", value: e.target.value }]
                  : prev.filter((f) => f.id !== "email")
              )
            }
          />
        </div>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={columnVisibility.email !== false}
            onCheckedChange={(value) =>
              setColumnVisibility((prev) => ({ ...prev, email: !!value }))
            }
          />
          <span>Show Email</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={columnVisibility.amount !== false}
            onCheckedChange={(value) =>
              setColumnVisibility((prev) => ({ ...prev, amount: !!value }))
            }
          />
          <span>Show Amount</span>
        </label>
      </div>

      <div>current sorting: {JSON.stringify(sorting)}</div>
      <div>current columnFilters: {JSON.stringify(columnFilters)}</div>
      <div>current columnVisibility: {JSON.stringify(columnVisibility)}</div>
      <div>current rowSelection: {JSON.stringify(rowSelection)}</div>
      <DataTable
        data={data}
        columns={columns}
        setSorting={setSorting}
        setColumnFilters={setColumnFilters}
        setColumnVisibility={setColumnVisibility}
        setRowSelection={setRowSelection}
        sorting={sorting}
        columnFilters={columnFilters}
        columnVisibility={columnVisibility}
        rowSelection={rowSelection}
      />
    </div>
  )
}

export default Campaigns