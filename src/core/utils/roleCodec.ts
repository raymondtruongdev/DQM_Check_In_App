import type * as XLSXTypes from 'xlsx';
import { extractCleanEmail } from '../auth';
import { RoleEntry } from '../types/role.types';

async function getXlsx(): Promise<typeof XLSXTypes> {
  return await import(/* webpackChunkName: 'xlsx' */ 'xlsx');
}

function cleanCellStr(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .trim();
}

function normalizeDocIdValue(rawDocId: string): string {
  const clean = rawDocId.trim();
  const lower = clean.toLowerCase().replace(/[\s_-]+/g, '');
  if (lower === 'dailyreport' || lower === 'drp' || lower === 'daily' || lower === 'bcn') {
    return 'DailyReport';
  }
  if (lower === 'weeklyreport' || lower === 'wrp' || lower === 'weekly' || lower === 'bct') {
    return 'WeeklyReport';
  }
  return clean;
}

/**
 * Parse role excel buffer (Projects_Role.xlsx or Report_Role.xlsx) into RoleEntry[]
 */
export async function parseRoleBuffer(buffer: ArrayBuffer): Promise<RoleEntry[]> {
  const XLSX = await getXlsx();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Order sheets so 'role' comes first, then others
  const orderedSheets = [...wb.SheetNames].sort((a, b) => {
    const aIsRole = a.trim().toLowerCase() === 'role' ? 0 : 1;
    const bIsRole = b.trim().toLowerCase() === 'role' ? 0 : 1;
    return aIsRole - bIsRole;
  });

  for (let s = 0; s < orderedSheets.length; s++) {
    const sheetName = orderedSheets[s];
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const matrix: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!matrix || matrix.length === 0) continue;

    // Find the header row (within first 15 rows)
    let headerRowIdx = -1;
    const colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(matrix.length, 15); r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      const tempMap: Record<string, number> = {};
      row.forEach((cell, cIdx) => {
        const key = cleanCellStr(cell)
          .toLowerCase()
          .replace(/[\s_-]+/g, '');
        if (key) {
          tempMap[key] = cIdx;
        }
      });

      const hasUnit = tempMap.unit !== undefined || tempMap.tram !== undefined || tempMap.donvi !== undefined;
      const hasDocId = tempMap.docid !== undefined || tempMap.loai !== undefined;
      const hasEmail = tempMap.email !== undefined || tempMap.mail !== undefined || tempMap.useremail !== undefined;

      if ((hasUnit && hasEmail) || (hasDocId && hasEmail)) {
        headerRowIdx = r;
        Object.assign(colMap, tempMap);
        break;
      }
    }

    // Fallback to row 0 if no explicit header match found
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      const row0 = matrix[0] || [];
      row0.forEach((cell, cIdx) => {
        const key = cleanCellStr(cell)
          .toLowerCase()
          .replace(/[\s_-]+/g, '');
        if (key) {
          colMap[key] = cIdx;
        }
      });
    }

    const idIdx = colMap.id ?? colMap.stt ?? 0;
    const unitIdx = colMap.unit ?? colMap.tram ?? colMap.donvi ?? 1;
    const docIdIdx = colMap.docid ?? colMap.loai ?? 2;
    const docTitleIdx =
      colMap.doctitle ?? colMap.doctile ?? colMap['têndựán'] ?? colMap['tênmảngviệc'] ?? colMap['tiêuđề'] ?? 3;
    const siteManagerIdx = colMap.sitemanager ?? colMap.manager ?? colMap.name ?? 4;
    const emailIdx = colMap.email ?? colMap.mail ?? colMap.useremail ?? 5;
    const statusIdx = colMap.status ?? colMap.trangthai ?? 6;

    const results: RoleEntry[] = [];

    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      const rawUnit = cleanCellStr(row[unitIdx]);
      const rawDocId = cleanCellStr(row[docIdIdx]);
      const rawEmailCell = cleanCellStr(row[emailIdx]);

      if (!rawUnit || !rawDocId || !rawEmailCell) continue;

      const docId = normalizeDocIdValue(rawDocId);
      const docTitle = cleanCellStr(row[docTitleIdx]) || undefined;
      const siteManager = cleanCellStr(row[siteManagerIdx]);
      const rawStatus = row[statusIdx];

      let status = true;
      if (rawStatus !== undefined && rawStatus !== null && cleanCellStr(rawStatus) !== '') {
        if (typeof rawStatus === 'boolean') {
          status = rawStatus;
        } else if (typeof rawStatus === 'number') {
          status = rawStatus !== 0;
        } else {
          const sVal = cleanCellStr(rawStatus).toLowerCase();
          status =
            sVal === 'true' ||
            sVal === '1' ||
            sVal === 'yes' ||
            sVal === 'y' ||
            sVal === 'active' ||
            sVal === 'x' ||
            sVal === 'hoạt động';
        }
      }

      // Support multiple emails separated by ; or , in a single cell
      const emailParts = rawEmailCell
        .split(/[;,\n]+/)
        .map((part) => extractCleanEmail(part))
        .filter(Boolean);

      const effectiveEmails = emailParts.length > 0 ? emailParts : [extractCleanEmail(rawEmailCell)];

      effectiveEmails.forEach((cleanMail, subIdx) => {
        if (!cleanMail) return;
        const baseId = cleanCellStr(row[idIdx]) || String(r);
        results.push({
          id: effectiveEmails.length > 1 ? `${baseId}_${subIdx + 1}` : baseId,
          docId,
          docTitle,
          unit: rawUnit,
          siteManager,
          email: cleanMail,
          status
        });
      });
    }

    if (results.length > 0) {
      return results;
    }
  }

  return [];
}

