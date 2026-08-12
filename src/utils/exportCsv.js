// src/utils/exportCsv.js
//
// Client-side CSV export — no backend endpoint needed since the data is
// already loaded into the page. Useful for personal backup/portability
// even with no payment system in place.

function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * @param {Array<Object>} rows - plain objects, one per CSV row
 * @param {Array<{key: string, label: string}>} columns - which fields to include, in order
 * @param {string} filename
 */
export function exportToCsv(rows, columns, filename) {
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const body = rows
    .map(row => columns.map(c => csvEscape(row[c.key])).join(','))
    .join('\n');
  const csvContent = `${header}\n${body}`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
