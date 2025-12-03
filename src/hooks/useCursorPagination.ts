import { useState, useRef, useEffect } from 'react'
import type { PaginationState } from '@tanstack/react-table'

interface UseCursorPaginationOptions {
  initialPageSize?: number
  onReset?: () => void
}

interface UseCursorPaginationReturn {
  pagination: PaginationState
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
  cursor: unknown
  setLastDoc: (doc: unknown) => void
  reset: () => void
}

/**
 * Custom hook for managing cursor-based pagination state
 *
 * Handles:
 * - Pagination state (pageIndex, pageSize)
 * - Cursor management for forward/backward navigation
 * - Cursor history for previous page navigation
 * - Reset functionality when filters change
 *
 * @param options - Configuration options
 * @param options.initialPageSize - Initial page size (default: 10)
 * @param options.onReset - Optional callback when pagination is reset
 * @returns Pagination state and controls
 */
export function useCursorPagination(
  options: UseCursorPaginationOptions = {}
): UseCursorPaginationReturn {
  const { initialPageSize = 10, onReset } = options

  // Pagination state (single source of truth)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  // Cursor management for server-side pagination
  const [cursor, setCursor] = useState<unknown>(undefined)
  const pageCursorsRef = useRef<Map<number, unknown>>(new Map())
  const lastDocRef = useRef<unknown>(undefined)
  const prevPaginationRef = useRef<PaginationState>(pagination)

  // Function to update lastDoc from query response
  const setLastDoc = (doc: unknown) => {
    if (doc) {
      lastDocRef.current = doc
    }
  }

  // Handle pagination changes and update cursor
  useEffect(() => {
    const prev = prevPaginationRef.current
    const current = pagination

    const isNextPage = current.pageIndex > prev.pageIndex
    const isPrevPage = current.pageIndex < prev.pageIndex
    const isPageSizeChange = current.pageSize !== prev.pageSize

    if (isNextPage && lastDocRef.current) {
      // Going forward - use lastDoc from previous page
      pageCursorsRef.current.set(current.pageIndex, lastDocRef.current)
      setCursor(lastDocRef.current)
    } else if (isPrevPage) {
      // Going backward - use stored cursor
      const storedCursor = pageCursorsRef.current.get(current.pageIndex)
      setCursor(storedCursor)
    } else if (current.pageIndex === 0 || isPageSizeChange) {
      // First page or page size changed
      setCursor(undefined)
      pageCursorsRef.current.clear()
    }

    prevPaginationRef.current = current
  }, [pagination])

  // Reset function to clear pagination and cursor state
  const reset = () => {
    setPagination({
      pageIndex: 0,
      pageSize: pagination.pageSize,
    })
    setCursor(undefined)
    pageCursorsRef.current.clear()

    if (onReset) {
      onReset()
    }
  }

  return {
    pagination,
    setPagination,
    cursor,
    setLastDoc,
    reset,
  }
}
