import type * as XLSXTypes from 'xlsx';
import { RoleEntry } from '../types/role.types';

async function getXlsx(): Promise<typeof XLSXTypes> {
  return await import(/* webpackChunkName: 'xlsx' */ 'xlsx');
}

/**
 * Parse role excel buffer (Projects_Role.xlsx or Report_Role.xlsx) into RoleEntry[]
 */
export async function parseRoleBuffer(buffer: ArrayBuffer): Promise<RoleEntry[]> {
  const XLSX = await getXlsx();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.find((s) => s.toLowerCase() === 'role') || wb.SheetNames[0];
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const results: RoleEntry[] = [];

  rawRows.forEach((r, idx) => {
    const normalized: Record<string, unknown> = {};
    Object.keys(r).forEach((k) => {
      normalized[k.trim().toLowerCase()] = r[k];
    });

    const docId = String(normalized.docid || normalized.doc_id || '').trim();
    const docTitle = String(
      normalized.doctitle || normalized.doc_title || normalized['tên dự án'] || normalized['tên mảng việc'] || normalized['tiêu đề'] || ''
    ).trim() || undefined;
    const unit = String(normalized.unit || '').trim();
    const email = String(normalized.email || '').trim();
    const siteManager = String(
      normalized['site manager'] || normalized.sitemanager || normalized.name || ''
    ).trim();
    const rawStatus = normalized.status;

    if (!docId || !unit || !email) {
      return;
    }

    let status = false;
    if (typeof rawStatus === 'boolean') {
      status = rawStatus;
    } else if (typeof rawStatus === 'number') {
      status = rawStatus === 1;
    } else if (typeof rawStatus === 'string') {
      const s = rawStatus.trim().toLowerCase();
      status = s === 'true' || s === '1' || s === 'yes' || s === 'y';
    }

    results.push({
      id: String(normalized.id || idx + 1).trim(),
      docId,
      docTitle,
      unit,
      siteManager,
      email,
      status
    });
  });

  return results;
}

