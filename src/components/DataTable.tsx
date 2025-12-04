import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type ExpandedState,
  type Row,
  type PaginationState
} from "@tanstack/react-table"
import { useState } from 'react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface DataTableProps<TData, TValue> {
  data: TData[]
  columns: ColumnDef<TData, TValue>[]
  setRowSelection: (value: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void
  setExpanded?: (value: ExpandedState | ((prev: ExpandedState) => ExpandedState)) => void
  rowSelection: RowSelectionState
  expanded?: ExpandedState
  renderSubRow?: (row: Row<TData>) => React.ReactNode
  // Pagination props
  pagination: PaginationState
  setPagination: (value: PaginationState | ((prev: PaginationState) => PaginationState)) => void
  totalCount?: number
  isLoading: boolean
  // Global search props
  enableGlobalSearch?: boolean
  globalSearchPlaceholder?: string
  // Page size selector props
  pageSizeOptions?: number[]
}

function DataTable<TData, TValue>({
  data,
  columns,
  setRowSelection,
  setExpanded,
  rowSelection,
  expanded,
  renderSubRow,
  pagination,
  setPagination,
  totalCount,
  isLoading,
  enableGlobalSearch = false,
  globalSearchPlaceholder = "Search all columns...",
  pageSizeOptions = [10, 20, 50, 100],
}: DataTableProps<TData, TValue>) {

  // Global search state
  const [globalFilter, setGlobalFilter] = useState('')

  const pageCount = totalCount ? Math.ceil(totalCount / pagination.pageSize) : -1;



  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    manualPagination: true,
    pageCount,
    state: {
      rowSelection,
      pagination,
      globalFilter,
      ...(expanded !== undefined && { expanded })
    },

  })
  return (

    <div className="w-full h-full flex flex-col">
      {enableGlobalSearch && (
        <div className="flex items-center justify-end pb-4">
          <Input
            type="text"
            placeholder={globalSearchPlaceholder}
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}
      <div className="overflow-auto rounded-md border flex-1">
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
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (pagination.pageIndex > 0) {
                    table.previousPage()
                  }
                }}
                aria-disabled={isLoading || pagination.pageIndex === 0}
                className={
                  isLoading || pagination.pageIndex === 0
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            <PaginationItem>
              <div className="flex items-center justify-center min-w-[100px] text-sm font-medium">
                Page {pagination.pageIndex + 1} {pageCount > 0 && `of ${pageCount}`}
              </div>
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (totalCount !== undefined && pagination.pageIndex < pageCount - 1) {
                    table.nextPage()
                  }
                }}
                aria-disabled={isLoading || (totalCount !== undefined && pagination.pageIndex >= pageCount - 1)}
                className={
                  isLoading || (totalCount !== undefined && pagination.pageIndex >= pageCount - 1)
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <div className="flex items-center gap-4">
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
            <span className="text-sm text-muted-foreground">Per page:</span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => {
                setPagination({
                  pageIndex: 0,
                  pageSize: parseInt(value),
                })
              }}
            >
              <SelectTrigger className="w-[100px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataTable