import type { Data_checkinRead, AccountRecord } from '../types';

/**
 * Maps raw SharePoint Account list items to the clean AccountRecord domain model
 */
export function mapSharePointAccount(raw: Record<string, unknown>): AccountRecord {
  return {
    id: (raw.field_0 as number | string) ?? (raw.ID as number | string) ?? (raw.Id as number | string) ?? '',
    username: String(raw.field_1 ?? raw.Username ?? '').trim(),
    password: String(raw.field_2 ?? raw.Password ?? '').trim(),
    departmentCode: String(raw.field_3 ?? raw.Department ?? raw.DepartmentCode ?? '').trim(),
    departmentName: String(raw.field_4 ?? raw.DepartmentName ?? '').trim(),
    role: String(raw.field_5 ?? raw.Role ?? 'user').trim().toLowerCase(),
  };
}

/**
 * Safe accessor for Name: Name -> field_1 -> Title
 */
export function getItemName(item: Data_checkinRead): string {
  return String(item.Name ?? item.field_1 ?? item.Title ?? '').trim();
}

/**
 * Safe accessor for Id: Id -> field_0 -> ID
 */
export function getItemDisplayId(item: Data_checkinRead): number | string {
  return item.Id ?? item.field_0 ?? item.ID;
}

/**
 * Safe accessor for Check-in timestamp: Check_x0020_in -> field_2 -> CheckIn
 */
export function getItemCheckIn(item: Data_checkinRead): string | undefined {
  const val = item.Check_x0020_in ?? item.field_2 ?? item.CheckIn;
  return val ? String(val) : undefined;
}

/**
 * Safe accessor for Location: Location -> field_3
 */
export function getItemLocation(item: Data_checkinRead): string {
  return String(item.Location ?? item.field_3 ?? '').trim();
}

/**
 * Safe accessor for Note: Note -> field_4
 */
export function getItemNote(item: Data_checkinRead): string {
  return String(item.Note ?? item.field_4 ?? '').trim();
}

/**
 * Safe accessor for Phone: Phone -> field_5
 */
export function getItemPhone(item: Data_checkinRead): string {
  return String(item.Phone ?? item.field_5 ?? '').trim();
}

