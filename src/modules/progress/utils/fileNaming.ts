/**
 * Utilities for formatting and parsing progress file names.
 * Format: yyMMdd_<DocID>_<Unit>.xlsx
 */

export function sanitizeSharePointPath(segment: string): string {
  // Remove chars forbidden by SharePoint
  return segment.replace(/["*:<>?/\\|#%~&{}]/g, '-').trim();
}

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatDateToYYMMDD(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = padZero(d.getMonth() + 1);
  const dd = padZero(d.getDate());
  return `${yy}${mm}${dd}`;
}

export function formatDateToYYYYMMDD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = padZero(d.getMonth() + 1);
  const dd = padZero(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

export function parseYYYYMMDD(str: string): Date {
  const parts = str.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function buildDataFileName(date: Date, docId: string, unit: string): string {
  const datePrefix = formatDateToYYMMDD(date);
  const cleanDoc = sanitizeSharePointPath(docId);
  const cleanUnit = sanitizeSharePointPath(unit);
  return `${datePrefix}_${cleanDoc}_${cleanUnit}.xlsx`;
}

export function parseDataFileName(
  fileName: string
): { dateYYMMDD: string; dateStr: string; docId: string; unit: string } | undefined {
  if (!fileName.toLowerCase().endsWith('.xlsx')) return undefined;
  const raw = fileName.slice(0, -5); // strip .xlsx
  const parts = raw.split('_');
  if (parts.length < 3) return undefined;

  const dateYYMMDD = parts[0];
  if (!/^\d{6}$/.test(dateYYMMDD)) return undefined;

  const unit = parts[parts.length - 1];
  const docId = parts.slice(1, parts.length - 1).join('_');

  const yy = parseInt(dateYYMMDD.substring(0, 2), 10);
  const mm = parseInt(dateYYMMDD.substring(2, 4), 10);
  const dd = parseInt(dateYYMMDD.substring(4, 6), 10);
  const fullYear = yy < 50 ? 2000 + yy : 1900 + yy;
  const dateStr = `${fullYear}-${padZero(mm)}-${padZero(dd)}`;

  return { dateYYMMDD, dateStr, docId, unit };
}
