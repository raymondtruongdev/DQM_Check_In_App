import {
  sanitizeSharePointPath,
  formatDateToYYYYMMDD,
  formatDateToYYYYMMDDWithoutDash,
  parseDateString
} from '../../../core/utils';

/**
 * Return formatted yyyyMMdd without dash from "YYYY-MM-DD" or Date
 */
export function toYYYYMMDD(date: string | Date): string {
  if (typeof date === 'string') {
    const clean = date.replace(/-/g, '').trim();
    if (clean.length === 8 && /^\d{8}$/.test(clean)) {
      return clean;
    }
    return formatDateToYYYYMMDDWithoutDash(parseDateString(date));
  }
  return formatDateToYYYYMMDDWithoutDash(date);
}

/**
 * Return standardized date string "YYYY-MM-DD"
 */
export function toStandardDateStr(date: string | Date): string {
  if (typeof date === 'string') {
    const clean = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    return formatDateToYYYYMMDD(parseDateString(clean));
  }
  return formatDateToYYYYMMDD(date);
}

/**
 * Folder name: <DocID>_<yyyyMMdd>, e.g. DailyReport_20261110 or WeeklyReport_20261110
 */
export function getReportFolderName(docId: string, date: string | Date): string {
  const cleanDoc = sanitizeSharePointPath(docId);
  const dateStr = toYYYYMMDD(date);
  return `${cleanDoc}_${dateStr}`;
}

/**
 * File name inside folder: <DocID>_<yyyyMMdd>.xlsx, e.g. DailyReport_20261110.xlsx
 */
export function getReportFileName(docId: string, date: string | Date): string {
  return `${getReportFolderName(docId, date)}.xlsx`;
}

/**
 * Server relative path for unit folder:
 * <libraryPath>/data/<Unit>
 */
export function getUnitFolderRelativePath(
  libraryPath: string,
  unit: string
): string {
  const cleanLib = libraryPath.replace(/\/+$/, '');
  const cleanUnit = sanitizeSharePointPath(unit);
  return `${cleanLib}/data/${cleanUnit}`;
}

/**
 * Server relative path for the report folder:
 * <libraryPath>/data/<Unit>/<DocID>_<yyyyMMdd>
 */
export function getReportFolderRelativePath(
  libraryPath: string,
  unit: string,
  docId: string,
  date: string | Date
): string {
  const cleanLib = libraryPath.replace(/\/+$/, '');
  const cleanUnit = sanitizeSharePointPath(unit);
  const folderName = getReportFolderName(docId, date);
  return `${cleanLib}/data/${cleanUnit}/${folderName}`;
}

/**
 * Server relative path for the report file:
 * <libraryPath>/data/<Unit>/<DocID>_<yyyyMMdd>/<DocID>_<yyyyMMdd>.xlsx
 */
export function getReportFileRelativePath(
  libraryPath: string,
  unit: string,
  docId: string,
  date: string | Date
): string {
  const folderPath = getReportFolderRelativePath(libraryPath, unit, docId, date);
  const fileName = getReportFileName(docId, date);
  return `${folderPath}/${fileName}`;
}

/**
 * Server relative path for the report photos subfolder:
 * <libraryPath>/data/<Unit>/<DocID>_<yyyyMMdd>/photos
 */
export function getReportPhotosFolderRelativePath(
  libraryPath: string,
  unit: string,
  docId: string,
  date: string | Date
): string {
  const folderPath = getReportFolderRelativePath(libraryPath, unit, docId, date);
  return `${folderPath}/photos`;
}

/**
 * Server relative path for template file:
 * <libraryPath>/_template/<DocID>_template.xlsx
 */
export function getTemplateFileRelativePath(libraryPath: string, docId: string): string {
  const cleanLib = libraryPath.replace(/\/+$/, '');
  const cleanDoc = sanitizeSharePointPath(docId);
  return `${cleanLib}/_template/${cleanDoc}_template.xlsx`;
}

