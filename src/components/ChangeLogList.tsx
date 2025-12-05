import { useState, useMemo } from 'react';
import { useChangeLogsByInvoice } from '@/hooks/useChangeLog';
import { useLineItems } from '@/hooks/useLineItems';
import type { ChangeLogFilters } from '@/types/changeLog';
import ChangeLogEntry from '@/components/ChangeLogEntry';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter } from 'lucide-react';

interface ChangeLogListProps {
  invoiceId: string;
  variant?: 'full' | 'summary';
  maxItems?: number;
  showFilters?: boolean;
}

function ChangeLogList({
  invoiceId,
  variant = 'full',
  maxItems,
  showFilters = false // Temporarily disabled filters
}: ChangeLogListProps) {
  const [filters, setFilters] = useState<Omit<ChangeLogFilters, 'invoiceId'>>({});

  // Fetch change logs for this invoice
  const { data: changeLogs = [], isLoading } = useChangeLogsByInvoice(invoiceId);

  // Fetch line items for this invoice to populate filter dropdown
  const { data: lineItemsResponse } = useLineItems({ invoiceId, pageSize: 100 });
  const lineItems = lineItemsResponse?.data ?? [];

  // Apply max items limit if specified
  const displayedLogs = useMemo(() => {
    return maxItems ? changeLogs.slice(0, maxItems) : changeLogs;
  }, [changeLogs, maxItems]);

  // Group change logs by date for better organization
  const groupedLogs = useMemo(() => {
    const groups: Record<string, typeof displayedLogs> = {};

    displayedLogs.forEach(log => {
      const dateKey = log.timestamp.toLocaleDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    return groups;
  }, [displayedLogs]);

  const handleFilterChange = (key: keyof ChangeLogFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      all: changeLogs.length,
      adjustment_created: changeLogs.filter(l => l.changeType === 'adjustment_created').length,
      adjustment_updated: changeLogs.filter(l => l.changeType === 'adjustment_updated').length,
      adjustment_deleted: changeLogs.filter(l => l.changeType === 'adjustment_deleted').length,
      line_item_moved: changeLogs.filter(l => l.changeType === 'line_item_moved').length,
    };
  }, [changeLogs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
          <CardDescription>Loading change history...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (changeLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
          <CardDescription>Track all changes made to this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No change history available for this invoice.</p>
            <p className="text-xs mt-2">Changes will appear here when adjustments are made or line items are moved.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Change History ({changeLogs.length})</CardTitle>
            <CardDescription>Track all changes made to this invoice</CardDescription>
          </div>
          {variant === 'full' && showFilters && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardHeader>

      {/* Filters */}
      {variant === 'full' && showFilters && (
        <CardContent className="border-b">
          <div className="flex flex-wrap gap-3">
            {/* Change Type Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Change Type
              </label>
              <Select
                value={filters.changeType || 'all'}
                onValueChange={(value) => handleFilterChange('changeType', value)}
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types ({filterCounts.all})</SelectItem>
                  {filterCounts.adjustment_created > 0 && (
                    <SelectItem value="adjustment_created">
                      Adjustment Created ({filterCounts.adjustment_created})
                    </SelectItem>
                  )}
                  {filterCounts.adjustment_updated > 0 && (
                    <SelectItem value="adjustment_updated">
                      Adjustment Updated ({filterCounts.adjustment_updated})
                    </SelectItem>
                  )}
                  {filterCounts.adjustment_deleted > 0 && (
                    <SelectItem value="adjustment_deleted">
                      Adjustment Deleted ({filterCounts.adjustment_deleted})
                    </SelectItem>
                  )}
                  {filterCounts.line_item_moved > 0 && (
                    <SelectItem value="line_item_moved">
                      Line Item Moved ({filterCounts.line_item_moved})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Line Item Filter */}
            {lineItems.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Line Item
                </label>
                <Select
                  value={filters.entityId || 'all'}
                  onValueChange={(value) => handleFilterChange('entityId', value)}
                >
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="All line items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Line Items</SelectItem>
                    {lineItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Change Log Entries */}
      <CardContent className="pt-6">
        {displayedLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No changes match the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {variant === 'full' ? (
              // Grouped by date
              Object.entries(groupedLogs).map(([date, logs]) => (
                <div key={date}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                    {date}
                  </h4>
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <ChangeLogEntry key={log.id} entry={log} variant="default" />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Summary view - compact entries
              <div className="space-y-0 divide-y">
                {displayedLogs.map((log) => (
                  <ChangeLogEntry key={log.id} entry={log} variant="compact" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Show "View All" link if maxItems is set and there are more items */}
        {maxItems && changeLogs.length > maxItems && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Showing {maxItems} of {changeLogs.length} changes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ChangeLogList;
