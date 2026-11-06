/**
 * Format ISO datetime string to display string: HH:mm - DD/MM/YYYY
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const pad = (n: number): string => (n < 10 ? '0' : '') + n;
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();

    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

/**
 * Convert ISO date string to datetime-local input format (YYYY-MM-DDTHH:mm)
 */
export function isoToDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number): string => (n < 10 ? '0' : '') + n;
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Convert datetime-local input value back to ISO string
 */
export function datetimeLocalToIso(val?: string): string | undefined {
  if (!val) return undefined;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}
