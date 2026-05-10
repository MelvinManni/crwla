// Browser-side CSV / Excel export. No deps — Excel opens an HTML file with
// the .xls extension natively, so we avoid pulling in a spreadsheet lib.

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

export function exportCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const headerLine = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows
    .map((r) => columns.map((c) => csvCell(formatCell(c.value(r)))).join(','))
    .join('\r\n');
  // BOM keeps Excel happy with non-ASCII.
  const blob = new Blob(['﻿' + headerLine + '\r\n' + body], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerDownload(blob, ensureExt(filename, 'csv'));
}

export function exportXls<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const head =
    '<tr>' + columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('') + '</tr>';
  const body = rows
    .map(
      (r) =>
        '<tr>' +
        columns
          .map((c) => `<td>${escapeHtml(formatCell(c.value(r)))}</td>`)
          .join('') +
        '</tr>',
    )
    .join('');
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body><table>${head}${body}</table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  triggerDownload(blob, ensureExt(filename, 'xls'));
}

function csvCell(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureExt(name: string, ext: string): string {
  return name.toLowerCase().endsWith('.' + ext) ? name : `${name}.${ext}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
