import type { Data_checkinRead, UserProfileRecord } from '../types';

/**
 * Extracts a clean email from raw email or SharePoint UPN/loginName
 * (Strips claims prefixes like "i:0#.f|membership|" if present)
 */
export function extractCleanEmail(rawEmailOrLoginName?: string): string {
  if (!rawEmailOrLoginName) return '';
  const parts = rawEmailOrLoginName.split('|');
  const clean = parts[parts.length - 1].trim();
  return clean.toLowerCase();
}

/**
 * Checks whether a given role string corresponds to an administrator
 */
export function checkIsAdmin(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return r === 'admin' || r === 'administrator' || r === 'quantri' || r === 'quản trị';
}

/**
 * Maps raw SharePoint UserProfiles list items (or imported Excel table) to clean UserProfileRecord
 *
 * Supported column mappings from Excel / SharePoint list:
 * - Col 0: field_0 / ID / Id / STT
 * - Col 1: Email / field_1 / Title / Mail / UserEmail / UserPrincipalName
 * - Col 2: Username / field_2 / Name / DisplayName / Title
 * - Col 3: DepartmentCode / Department / field_3
 * - Col 4: DepartmentName / field_4 / Department
 * - Col 5: Role / field_5
 */
export function mapSharePointUserProfile(raw: Record<string, unknown>): UserProfileRecord {
  const rawId = (raw.field_0 as number | string) ?? (raw.ID as number | string) ?? (raw.Id as number | string) ?? '';

  // Extract email candidate
  const rawEmail = String(
    raw.Email ?? raw.email ?? raw.Mail ?? raw.UserEmail ?? raw.UserPrincipalName ?? raw.field_1 ?? raw.Title ?? ''
  ).trim();
  const cleanEmail = extractCleanEmail(rawEmail);

  // Extract username / code
  const rawUsername = String(
    raw.Username ?? raw.username ?? raw.field_2 ?? raw.field_1 ?? raw.Title ?? ''
  ).trim();

  // Extract display name (fall back to username or email prefix)
  const rawDisplayName = String(
    raw.DisplayName ?? raw.Name ?? raw.field_2 ?? rawUsername ?? ''
  ).trim();

  // Department code & name
  const deptCode = String(raw.DepartmentCode ?? raw.Department ?? raw.field_3 ?? '').trim();
  const deptName = String(raw.DepartmentName ?? raw.field_4 ?? deptCode ?? '').trim();

  // Role
  const role = String(raw.Role ?? raw.role ?? raw.field_5 ?? 'user').trim().toLowerCase();

  return {
    id: rawId,
    email: cleanEmail,
    username: rawUsername || cleanEmail.split('@')[0],
    displayName: rawDisplayName || rawUsername || cleanEmail.split('@')[0],
    departmentCode: deptCode,
    departmentName: deptName || deptCode,
    role: role || 'user',
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
