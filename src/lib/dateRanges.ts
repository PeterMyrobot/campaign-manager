import type { DateRange, DateRangePreset } from '@/types/campaign';

export interface DateRangeOption {
  label: string;
  value: DateRangePreset;
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { label: 'All time', value: 'all' },
  { label: 'Last 7 days', value: 'last7days' },
  { label: 'Last 30 days', value: 'last30days' },
  { label: 'Last 3 months', value: 'last3months' },
  { label: 'Last 6 months', value: 'last6months' },
  { label: 'Last year', value: 'lastYear' },
  { label: 'This month', value: 'thisMonth' },
  { label: 'This quarter', value: 'thisQuarter' },
  { label: 'This year', value: 'thisYear' },
  { label: 'Custom range', value: 'custom' },
];

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'all':
      return undefined;

    case 'last7days':
      return {
        from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        to: today,
      };

    case 'last30days':
      return {
        from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        to: today,
      };

    case 'last3months':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
        to: today,
      };

    case 'last6months':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
        to: today,
      };

    case 'lastYear':
      return {
        from: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        to: today,
      };

    case 'thisMonth':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };

    case 'thisQuarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        from: new Date(now.getFullYear(), quarter * 3, 1),
        to: new Date(now.getFullYear(), quarter * 3 + 3, 0),
      };
    }

    case 'thisYear':
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31),
      };

    case 'custom':
      return undefined;

    default:
      return undefined;
  }
}
