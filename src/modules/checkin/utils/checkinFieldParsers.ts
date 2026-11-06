import type { CheckinRecord } from '../types';

/**
 * Safe accessor for Name: Name -> field_1 -> Title
 */
export function getCheckinName(item: CheckinRecord): string {
  return String(item.Name ?? item.field_1 ?? item.Title ?? '').trim();
}

/**
 * Safe accessor for Id: Id -> field_0 -> ID
 */
export function getCheckinDisplayId(item: CheckinRecord): number | string {
  return item.Id ?? item.field_0 ?? item.ID;
}

/**
 * Safe accessor for Check-in timestamp: Check_x0020_in -> field_2 -> CheckIn
 */
export function getCheckinTime(item: CheckinRecord): string | undefined {
  const val = item.Check_x0020_in ?? item.field_2 ?? item.CheckIn;
  return val ? String(val) : undefined;
}

/**
 * Safe accessor for Location: Location -> field_3
 */
export function getCheckinLocation(item: CheckinRecord): string {
  return String(item.Location ?? item.field_3 ?? '').trim();
}

/**
 * Safe accessor for Note: Note -> field_4
 */
export function getCheckinNote(item: CheckinRecord): string {
  return String(item.Note ?? item.field_4 ?? '').trim();
}

/**
 * Safe accessor for Phone: Phone -> field_5
 */
export function getCheckinPhone(item: CheckinRecord): string {
  return String(item.Phone ?? item.field_5 ?? '').trim();
}
