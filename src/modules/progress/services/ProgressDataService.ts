import { ProgressDoc, TaskRow } from '../types/progress.types';
import {
  buildDataFileName,
  formatDateToYYYYMMDD,
  formatDateToYYMMDD,
  parseDataFileName,
  parseYYYYMMDD
} from '../utils/fileNaming';
import { buildTaskTree, flattenTaskTree } from '../utils/taskTree';
import { encodeProgressDocBuffer, parseProgressDocBuffer } from '../utils/excelCodec';
import { ProgressFileService } from './ProgressFileService';
import { ProgressTemplateService } from './ProgressTemplateService';

export class ProgressDataService {
  private _fileService: ProgressFileService;
  private _templateService: ProgressTemplateService;

  constructor(fileService: ProgressFileService, templateService: ProgressTemplateService) {
    this._fileService = fileService;
    this._templateService = templateService;
  }

  /**
   * Open or initialize a progress document for a given date, docId, and unit.
   */
  public async openDoc(docId: string, unit: string, targetDate: Date): Promise<ProgressDoc> {
    const targetDateStr = formatDateToYYYYMMDD(targetDate);
    const fileName = buildDataFileName(targetDate, docId, unit);

    // 1. Try reading existing daily file
    const existingFile = await this._fileService.getDataFileWithMeta(docId, fileName);
    if (existingFile) {
      const doc = await parseProgressDocBuffer(existingFile.buffer, targetDateStr, unit);
      doc.eTag = existingFile.eTag;
      doc.dateStr = targetDateStr;

      // Re-align with template: ensure template tasks are preserved
      try {
        const template = await this._templateService.getTemplate(docId, unit);
        doc.tasks = this._mergeWithTemplate(template.tasks, doc.tasks);
      } catch {
        // template missing or error, proceed with existing doc tasks
      }

      // Recompute parent rates
      const tree = buildTaskTree(doc.tasks);
      doc.tasks = flattenTaskTree(tree);
      return doc;
    }

    // 2. File doesn't exist for targetDate -> Load base template
    const templateDoc = await this._templateService.getTemplate(docId, unit);
    templateDoc.dateStr = targetDateStr;

    // 3. Find most recent file before this date for same unit
    const previousFileInfo = await this._findMostRecentFileBefore(docId, unit, targetDate);

    if (previousFileInfo) {
      const prevFile = await this._fileService.getDataFileWithMeta(docId, previousFileInfo.fileName);
      if (prevFile) {
        const prevDoc = await parseProgressDocBuffer(prevFile.buffer, previousFileInfo.dateStr, unit);

        // Prefill template tasks with previous values & bring over level 3 custom tasks
        templateDoc.tasks = this._prefillFromPrevious(templateDoc.tasks, prevDoc.tasks);
        templateDoc.isLoadedFromPreviousDay = true;
        templateDoc.previousDayDateStr = previousFileInfo.dateStr;
      }
    }

    // Recompute parent rates
    const tree = buildTaskTree(templateDoc.tasks);
    templateDoc.tasks = flattenTaskTree(tree);
    return templateDoc;
  }

  /**
   * Save progress document
   */
  public async saveDoc(
    doc: ProgressDoc,
    userDisplayName: string,
    userEmail: string,
    isAdmin: boolean
  ): Promise<{ fileName: string; serverRelativeUrl: string; eTag?: string }> {
    const targetDate = parseYYYYMMDD(doc.dateStr);
    const todayStr = formatDateToYYYYMMDD(new Date());

    // Check permission: user can only edit today, admin can edit any date
    const canEdit = isAdmin || doc.dateStr === todayStr;
    if (!canEdit) {
      throw new Error(`Bạn không có quyền chỉnh sửa dữ liệu của ngày cũ (${doc.dateStr}). Chỉ Admin mới có quyền này.`);
    }

    // Calculate rates across entire tree bottom-up
    const tree = buildTaskTree(doc.tasks);
    doc.tasks = flattenTaskTree(tree);

    // Update metadata
    doc.metadata.name = userDisplayName;
    doc.metadata.email = userEmail;
    doc.metadata.updateTime = new Date().toLocaleString('vi-VN');

    // Encode to xlsx buffer
    const buffer = await encodeProgressDocBuffer(doc);
    const fileName = buildDataFileName(targetDate, doc.metadata.docId, doc.metadata.unit);

    const result = await this._fileService.saveDailyDataFile(
      doc.metadata.docId,
      fileName,
      buffer,
      doc.eTag
    );

    return {
      fileName,
      serverRelativeUrl: result.serverRelativeUrl,
      eTag: result.eTag
    };
  }

  /**
   * Find most recent daily file strictly before targetDate for the given unit
   */
  private async _findMostRecentFileBefore(
    docId: string,
    unit: string,
    targetDate: Date
  ): Promise<{ fileName: string; dateStr: string; dateYYMMDD: string } | null> {
    const files = await this._fileService.listDataFiles(docId);
    if (!files || files.length === 0) return null;

    const targetYYMMDD = formatDateToYYMMDD(targetDate);
    const targetUnitClean = unit.trim().toLowerCase();

    const candidates: Array<{ fileName: string; dateStr: string; dateYYMMDD: string }> = [];

    files.forEach((f) => {
      const parsed = parseDataFileName(f.name);
      if (!parsed) return;
      if (parsed.unit.trim().toLowerCase() !== targetUnitClean) return;
      // Must be strictly earlier than target date
      if (parsed.dateYYMMDD < targetYYMMDD) {
        candidates.push({
          fileName: f.name,
          dateStr: parsed.dateStr,
          dateYYMMDD: parsed.dateYYMMDD
        });
      }
    });

    if (candidates.length === 0) return null;

    // Sort descending by dateYYMMDD
    candidates.sort((a, b) => b.dateYYMMDD.localeCompare(a.dateYYMMDD));
    return candidates[0];
  }

  /**
   * Merge saved tasks with template: template tasks are truth for level 1 & 2 names
   */
  private _mergeWithTemplate(templateTasks: TaskRow[], savedTasks: TaskRow[]): TaskRow[] {
    const savedMap = new Map<string, TaskRow>();
    savedTasks.forEach((t) => savedMap.set(t.id, t));

    const result: TaskRow[] = [];

    // 1. All template tasks
    templateTasks.forEach((tpl) => {
      const saved = savedMap.get(tpl.id);
      if (saved) {
        result.push({
          ...tpl,
          completionRate: saved.completionRate,
          quantity: saved.quantity,
          unit: saved.unit || tpl.unit,
          isCustom: false
        });
        savedMap.delete(tpl.id);
      } else {
        result.push({ ...tpl, isCustom: false });
      }
    });

    // 2. Any additional custom tasks (level 3+)
    savedMap.forEach((customTask) => {
      if (customTask.level >= 3 || customTask.isCustom) {
        result.push({
          ...customTask,
          isCustom: true
        });
      }
    });

    return result;
  }

  /**
   * Prefill template tasks with previous day values and append custom tasks
   */
  private _prefillFromPrevious(templateTasks: TaskRow[], prevTasks: TaskRow[]): TaskRow[] {
    const prevMap = new Map<string, TaskRow>();
    prevTasks.forEach((t) => prevMap.set(t.id, t));

    const result: TaskRow[] = [];

    // 1. Template tasks filled with previous values
    templateTasks.forEach((tpl) => {
      const prev = prevMap.get(tpl.id);
      if (prev) {
        result.push({
          ...tpl,
          completionRate: prev.completionRate,
          quantity: prev.quantity,
          unit: prev.unit || tpl.unit,
          isCustom: false
        });
        prevMap.delete(tpl.id);
      } else {
        result.push({ ...tpl, isCustom: false });
      }
    });

    // 2. Custom tasks from previous day
    prevMap.forEach((prevCustom) => {
      if (prevCustom.level >= 3 || prevCustom.isCustom) {
        result.push({
          ...prevCustom,
          isCustom: true
        });
      }
    });

    return result;
  }
}
