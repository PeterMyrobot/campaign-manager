import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState
} from "@tanstack/react-table"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
  data: TData[]
  columns: ColumnDef<TData, TValue>[]
  setSorting: (value: SortingState | ((prev: SortingState) => SortingState)) => void
  setColumnFilters: (value: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => void
  setColumnVisibility: (value: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void
  setRowSelection: (value: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void
  sorting: SortingState
  columnFilters: ColumnFiltersState
  columnVisibility: VisibilityState
  rowSelection: RowSelectionState
}

function DataTable<TData, TValue>({
  data,
  columns,
  setSorting,
  setColumnFilters,
  setColumnVisibility,
  setRowSelection,
  sorting,
  columnFilters,
  columnVisibility,
  rowSelection
}: DataTableProps<TData, TValue>) {

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    // getFilteredRowModel: getFilteredRowModel(), // not needed for manual server-side filtering
    manualFiltering: true,
    onSortingChange: setSorting,
    // getSortedRowModel: getSortedRowModel(), no need for manual sorting
    manualSorting: true, //use pre-sorted row model instead of sorted row model
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection
    },

  })
  return (

    <div className="w-full">
      <div id="table-header"></div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header, header.getContext()
                        )
                      }
                    </TableHead>
                  )
                })}
              </TableRow>
            ))
            }
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default DataTable