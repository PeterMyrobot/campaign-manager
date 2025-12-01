import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type ExpandedState,
  type Row,
  type PaginationState
} from "@tanstack/react-table"
import { useState, useEffect } from 'react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface DataTableProps<TData, TValue> {
  data: TData[]
  columns: ColumnDef<TData, TValue>[]
  setSorting: (value: SortingState | ((prev: SortingState) => SortingState)) => void
  setColumnFilters: (value: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => void
  setColumnVisibility: (value: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void
  setRowSelection: (value: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void
  setExpanded?: (value: ExpandedState | ((prev: ExpandedState) => ExpandedState)) => void
  sorting: SortingState
  columnFilters: ColumnFiltersState
  columnVisibility: VisibilityState
  rowSelection: RowSelectionState
  expanded?: ExpandedState
  renderSubRow?: (row: Row<TData>) => React.ReactNode
  // Pagination props
  pagination: PaginationState
  setPagination: (value: PaginationState | ((prev: PaginationState) => PaginationState)) => void
  totalCount?: number
  lastDoc?: unknown
  isLoading: boolean
  onPaginationChange: (pageIndex: number, pageSize: number, cursor?: unknown) => void
}

function DataTable<TData, TValue>({
  data,
  columns,
  setSorting,
  setColumnFilters,
  setColumnVisibility,
  setRowSelection,
  setExpanded,
  sorting,
  columnFilters,
  columnVisibility,
  rowSelection,
  expanded,
  renderSubRow,
  pagination,
  setPagination,
  totalCount,
  lastDoc,
  isLoading,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {

  // Store cursors for each page to enable forward/backward navigation
  const [pageCursors, setPageCursors] = useState<Map<number, unknown>>(new Map())

  const pageCount = totalCount ? Math.ceil(totalCount / pagination.pageSize) : -1;

  // Handle pagination changes
  const handlePaginationChange = (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater
    const isNextPage = newPagination.pageIndex > pagination.pageIndex
    const isPrevPage = newPagination.pageIndex < pagination.pageIndex

    // Determine cursor based on navigation direction
    let cursor: unknown = undefined

    if (isNextPage && lastDoc) {
      // Going forward - use the last document from current page
      const newCursors = new Map(pageCursors)
      newCursors.set(newPagination.pageIndex, lastDoc)
      setPageCursors(newCursors)
      cursor = lastDoc
    } else if (isPrevPage) {
      // Going backward - use the stored cursor for the target page
      cursor = pageCursors.get(newPagination.pageIndex)
    } else if (newPagination.pageIndex === 0) {
      // First page - no cursor needed
      cursor = undefined
      setPageCursors(new Map()) // Reset cursors when going to first page
    }

    // Update pagination state
    setPagination(newPagination)

    // Notify parent component
    onPaginationChange(newPagination.pageIndex, newPagination.pageSize, cursor)
  }

  // Reset pagination when filters change
  useEffect(() => {
    setPageCursors(new Map())
  }, [columnFilters, sorting])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    manualFiltering: true,
    onSortingChange: setSorting,
    manualSorting: true, //use pre-sorted row model instead of sorted row model
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: handlePaginationChange,
    onExpandedChange: setExpanded,
    manualPagination: true,
    pageCount,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      ...(expanded !== undefined && { expanded })
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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <>
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
                  {row.getIsExpanded() && renderSubRow && (
                    <TableRow key={`${row.id}-expanded`}>
                      <TableCell colSpan={columns.length}>
                        {renderSubRow(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </>
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
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          {totalCount !== undefined ? (
            <>
              Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} of{' '}
              {totalCount} results
            </>
          ) : (
            <>
              {table.getFilteredSelectedRowModel().rows.length} of{' '}
              {table.getFilteredRowModel().rows.length} row(s) selected
            </>
          )}
        </div>
        <div className="flex items-center gap-2">

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={isLoading || pagination.pageIndex === 0}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {pagination.pageIndex + 1} of {pageCount > 0 ? pageCount : 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={isLoading || (totalCount !== undefined && pagination.pageIndex >= pageCount - 1)}
          >
            Next
          </Button>

        </div>
      </div>
    </div>
  )
}

export default DataTable