import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDateRangeFromPreset, DATE_RANGE_OPTIONS } from './dateRanges';

describe('dateRanges', () => {
  describe('DATE_RANGE_OPTIONS', () => {
    it('should contain all expected preset options', () => {
      const expectedLabels = [
        'All time',
        'Last 7 days',
        'Last 30 days',
        'Last 3 months',
        'Last 6 months',
        'Last year',
        'This month',
        'This quarter',
        'This year',
        'Custom range',
      ];

      expect(DATE_RANGE_OPTIONS).toHaveLength(expectedLabels.length);
      DATE_RANGE_OPTIONS.forEach((option, index) => {
        expect(option.label).toBe(expectedLabels[index]);
      });
    });
  });

  describe('getDateRangeFromPreset', () => {
    let mockDate: Date;

    beforeEach(() => {
      // Mock a specific date: March 15, 2024, 14:30:00 in local timezone
      mockDate = new Date(2024, 2, 15, 14, 30, 0);
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return undefined for "all" preset', () => {
      const result = getDateRangeFromPreset('all');
      expect(result).toBeUndefined();
    });

    it('should return undefined for "custom" preset', () => {
      const result = getDateRangeFromPreset('custom');
      expect(result).toBeUndefined();
    });

    describe('last7days', () => {
      it('should return correct date range for last 7 days', () => {
        const result = getDateRangeFromPreset('last7days');

        expect(result).toBeDefined();
        expect(result?.from).toBeInstanceOf(Date);
        expect(result?.to).toBeInstanceOf(Date);

        // Today at midnight in local timezone
        const expectedTo = new Date(2024, 2, 15); // March 15, 2024 at midnight
        // 7 days ago at midnight
        const expectedFrom = new Date(2024, 2, 8); // March 8, 2024 at midnight

        expect(result?.to).toEqual(expectedTo);
        expect(result?.from).toEqual(expectedFrom);
      });
    });

    describe('last30days', () => {
      it('should return correct date range for last 30 days', () => {
        const result = getDateRangeFromPreset('last30days');

        expect(result).toBeDefined();

        // Today at midnight
        const expectedTo = new Date(2024, 2, 15);
        // 30 days ago at midnight
        const expectedFrom = new Date(2024, 1, 14); // February 14, 2024

        expect(result?.to).toEqual(expectedTo);
        expect(result?.from).toEqual(expectedFrom);
      });
    });

    describe('last3months', () => {
      it('should return correct date range for last 3 months', () => {
        const result = getDateRangeFromPreset('last3months');

        expect(result).toBeDefined();

        // Today at midnight
        const expectedTo = new Date(2024, 2, 15);
        // 3 months ago (December 15, 2023)
        const expectedFrom = new Date(2023, 11, 15); // December is month 11

        expect(result?.to).toEqual(expectedTo);
        expect(result?.from).toEqual(expectedFrom);
      });

      it('should handle month boundaries correctly', () => {
        // Test with May 31st - 3 months back will overflow to March 1st
        // (because February doesn't have 31 days, even in leap years with 29 days)
        vi.setSystemTime(new Date(2024, 4, 31, 14, 30, 0)); // May 31, 2024

        const result = getDateRangeFromPreset('last3months');

        expect(result).toBeDefined();
        // JavaScript Date constructor with (2024, 1, 31) = Feb 31 -> adjusts to March 1
        // This is expected behavior: new Date(2024, 1, 31) === new Date(2024, 2, 1)
        const expectedFrom = new Date(2024, 1, 31); // Feb 31 -> March 1, 2024

        expect(result?.from).toEqual(expectedFrom);
      });
    });

    describe('last6months', () => {
      it('should return correct date range for last 6 months', () => {
        const result = getDateRangeFromPreset('last6months');

        expect(result).toBeDefined();

        // Today at midnight
        const expectedTo = new Date(2024, 2, 15);
        // 6 months ago (September 15, 2023)
        const expectedFrom = new Date(2023, 8, 15); // September is month 8

        expect(result?.to).toEqual(expectedTo);
        expect(result?.from).toEqual(expectedFrom);
      });
    });

    describe('lastYear', () => {
      it('should return correct date range for last year', () => {
        const result = getDateRangeFromPreset('lastYear');

        expect(result).toBeDefined();

        // Today at midnight
        const expectedTo = new Date(2024, 2, 15);
        // 1 year ago (March 15, 2023)
        const expectedFrom = new Date(2023, 2, 15);

        expect(result?.to).toEqual(expectedTo);
        expect(result?.from).toEqual(expectedFrom);
      });
    });

    describe('thisMonth', () => {
      it('should return correct date range for this month', () => {
        const result = getDateRangeFromPreset('thisMonth');

        expect(result).toBeDefined();

        // March 1, 2024
        const expectedFrom = new Date(2024, 2, 1);
        // March 31, 2024
        const expectedTo = new Date(2024, 2, 31);

        expect(result?.from).toEqual(expectedFrom);
        expect(result?.to).toEqual(expectedTo);
      });

      it('should handle February correctly', () => {
        vi.setSystemTime(new Date(2024, 1, 15, 14, 30, 0)); // February 15, 2024

        const result = getDateRangeFromPreset('thisMonth');

        expect(result).toBeDefined();

        // Feb 1, 2024
        const expectedFrom = new Date(2024, 1, 1);
        // Feb 29, 2024 (leap year)
        const expectedTo = new Date(2024, 1, 29);

        expect(result?.from).toEqual(expectedFrom);
        expect(result?.to).toEqual(expectedTo);
      });

      it('should handle December correctly', () => {
        vi.setSystemTime(new Date(2024, 11, 15, 14, 30, 0)); // December 15, 2024

        const result = getDateRangeFromPreset('thisMonth');

        expect(result).toBeDefined();

        // Dec 1, 2024
        const expectedFrom = new Date(2024, 11, 1);
        // Dec 31, 2024
        const expectedTo = new Date(2024, 11, 31);

        expect(result?.from).toEqual(expectedFrom);
        expect(result?.to).toEqual(expectedTo);
      });
    });

    describe('thisQuarter', () => {
      it('should return Q1 (Jan-Mar) when in March', () => {
        // March 15, 2024 - Q1
        const result = getDateRangeFromPreset('thisQuarter');

        expect(result).toBeDefined();

        // Jan 1, 2024
        const expectedFrom = new Date(2024, 0, 1);
        // Mar 31, 2024
        const expectedTo = new Date(2024, 2, 31);

        expect(result?.from).toEqual(expectedFrom);
        expect(result?.to).toEqual(expectedTo);
      });

      it('should return Q2 (Apr-Jun) when in May', () => {
        vi.setSystemTime(new Date(2024, 4, 15, 14, 30, 0)); // May 15, 2024

        const result = getDateRangeFromPreset('thisQuarter');

        expect(result).toBeDefined();

        // Apr 1, 2024
        const expectedFrom = new Date(2024, 3, 1);
        // Jun 30, 2024
        const expectedTo = new Date(2024, 5, 30);

        expect(result?.from).toEqual(expectedFrom);
        expect(result?.to).toEqual(expectedTo);
      });

      it('should return Q3 (Jul-Sep) when in August', () => {
        vi.setSystemTime(new Date(2024, 7, 15, 14, 30, 0)); // August 15, 2024

        const result = getDateRangeFromPreset('thisQuarter');

        expect(result).toBeDefined();

        // Jul 1, 2024
        const expectedFrom = new Date(2024, 6, 1);
        // Sep 30, 2024
        const expectedTo = new Date(2024, 8, 30);

        expect(result?.from).toEqual(expectedFrom);
        expect(result?.to).toEqual(expectedTo);
      });

      it('should return Q4 (Oct-Dec) when in November', () => {
        vi.setSystemTime(new Date(2024, 10, 15, 14, 30, 0)); // November 15, 2024

        const result = getDateRangeFromPreset('thisQuarter');

        expect(result).toBeDefined();

        // Oct 1, 2024
        const expectedFrom = new Date(2024, 9, 1);
        // Dec 31, 2024
        const expectedTo = new Date(2024, 11, 31);

        expect(result?.from).toEqual(expectedFrom);
        expect(result?.to).toEqual(expectedTo);
      });

      it('should handle edge case at start of Q1', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0)); // January 1, 2024

        const result = getDateRangeFromPreset('thisQuarter');

        expect(result).toBeDefined();
        expect(result?.from).toEqual(new Date(2024, 0, 1));
        expect(result?.to).toEqual(new Date(2024, 2, 31));
      });

      it('should handle edge case at end of Q4', () => {
        vi.setSystemTime(new Date(2024, 11, 31, 23, 59, 59, 999)); // December 31, 2024

        const result = getDateRangeFromPreset('thisQuarter');

        expect(result).toBeDefined();
        expect(result?.from).toEqual(new Date(2024, 9, 1));
        expect(result?.to).toEqual(new Date(2024, 11, 31));
      });
    });

    describe('thisYear', () => {
      it('should return correct date range for this year', () => {
        const result = getDateRangeFromPreset('thisYear');

        expect(result).toBeDefined();

        // Jan 1, 2024
        const expectedFrom = new Date(2024, 0, 1);
        // Dec 31, 2024
        const expectedTo = new Date(2024, 11, 31);

        expect(result?.from).toEqual(expectedFrom);
        expect(result?.to).toEqual(expectedTo);
      });

      it('should handle leap year', () => {
        vi.setSystemTime(new Date(2024, 1, 29, 14, 30, 0)); // February 29, 2024

        const result = getDateRangeFromPreset('thisYear');

        expect(result).toBeDefined();
        expect(result?.from).toEqual(new Date(2024, 0, 1));
        expect(result?.to).toEqual(new Date(2024, 11, 31));
      });

      it('should handle non-leap year', () => {
        vi.setSystemTime(new Date(2023, 2, 15, 14, 30, 0)); // March 15, 2023

        const result = getDateRangeFromPreset('thisYear');

        expect(result).toBeDefined();
        expect(result?.from).toEqual(new Date(2023, 0, 1));
        expect(result?.to).toEqual(new Date(2023, 11, 31));
      });
    });

    describe('Edge cases', () => {
      it('should normalize time to midnight for "to" date', () => {
        // Even though current time is 14:30, "to" should be midnight
        const result = getDateRangeFromPreset('last7days');

        expect(result?.to.getHours()).toBe(0);
        expect(result?.to.getMinutes()).toBe(0);
        expect(result?.to.getSeconds()).toBe(0);
        expect(result?.to.getMilliseconds()).toBe(0);
      });

      it('should handle year boundaries for last3months', () => {
        vi.setSystemTime(new Date(2024, 0, 15, 14, 30, 0)); // January 15, 2024

        const result = getDateRangeFromPreset('last3months');

        expect(result).toBeDefined();
        // Should go back to October 2023
        expect(result?.from.getFullYear()).toBe(2023);
        expect(result?.from.getMonth()).toBe(9); // October (0-indexed)
      });

      it('should handle year boundaries for last6months', () => {
        vi.setSystemTime(new Date(2024, 1, 15, 14, 30, 0)); // February 15, 2024

        const result = getDateRangeFromPreset('last6months');

        expect(result).toBeDefined();
        // Should go back to August 2023
        expect(result?.from.getFullYear()).toBe(2023);
        expect(result?.from.getMonth()).toBe(7); // August (0-indexed)
      });
    });
  });
});
