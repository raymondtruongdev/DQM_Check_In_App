import type { Data_checkinRead } from '../types';

/**
 * Helper to get Name value safely:
 * Priority: Name -> field_1 -> Title
 */
export function getItemName(item: Data_checkinRead): string {
  const val = item.Name ?? item.field_1 ?? item.Title;
  return val !== undefined && val !== null ? String(val).trim() : '';
}

/**
 * Helper to get Id value safely:
 * Priority: Id -> field_0 -> ID
 */
export function getItemDisplayId(item: Data_checkinRead): number | string {
  if (item.Id !== undefined && item.Id !== null) return item.Id;
  if (item.field_0 !== undefined && item.field_0 !== null) return item.field_0;
  return item.ID;
}

/**
 * Helper to get Check in timestamp safely:
 * Priority: Check_x0020_in -> field_2 -> CheckIn -> 'Check in'
 */
export function getItemCheckIn(item: Data_checkinRead): string | undefined {
  const val = item.Check_x0020_in ?? item.field_2 ?? item.CheckIn ?? item['Check in'];
  return val ? String(val) : undefined;
}

/**
 * Helper to get Location safely:
 * Priority: Location -> field_3
 */
export function getItemLocation(item: Data_checkinRead): string {
  const val = item.Location ?? item.field_3;
  return val !== undefined && val !== null ? String(val).trim() : '';
}

/**
 * Helper to get Note safely:
 * Priority: Note -> field_4
 */
export function getItemNote(item: Data_checkinRead): string {
  const val = item.Note ?? item.field_4;
  return val !== undefined && val !== null ? String(val).trim() : '';
}

/**
 * Helper to get Phone safely:
 * Priority: Phone -> field_5
 */
export function getItemPhone(item: Data_checkinRead): string {
  const val = item.Phone ?? item.field_5;
  return val !== undefined && val !== null ? String(val).trim() : '';
}
