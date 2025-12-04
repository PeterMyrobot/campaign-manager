/**
 * Converts data to CSV format and triggers download
 */
export function exportToCsv<T extends object>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
) {
  if (data.length === 0) {
    return;
  }

  // If columns not specified, use all keys from first item
  const cols = columns || (Object.keys(data[0]) as Array<keyof T>).map(key => ({
    key,
    header: String(key).charAt(0).toUpperCase() + String(key).slice(1).replace(/([A-Z])/g, ' $1').trim()
  }));

  // Create CSV header
  const headers = cols.map(col => col.header).join(',');

  // Create CSV rows
  const rows = data.map(item => {
    return cols.map(col => {
      const value = item[col.key];

      // Handle different value types
      if (value === null || value === undefined) {
        return '';
      }

      if (value instanceof Date) {
        return value.toLocaleDateString();
      }

      if (Array.isArray(value)) {
        return `"${value.join('; ')}"`;
      }

      if (typeof value === 'object') {
        return `"${JSON.stringify(value)}"`;
      }

      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    }).join(',');
  });

  // Combine headers and rows
  const csv = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
