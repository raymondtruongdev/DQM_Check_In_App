import { DailyProgressSummaryItem, DailySummaryCol, ProgressSummaryData, TaskRow } from '../types/progress.types';
import { parseDataFileName } from '../utils/fileNaming';
import { encodeSummaryExportBuffer, parseProgressDocBuffer } from '../utils/excelCodec';
import { buildTaskTree, flattenTaskTree } from '../utils/taskTree';
import { ProgressFileService } from './ProgressFileService';
import { ProgressTemplateService } from './ProgressTemplateService';

export class ProgressSummaryService {
  private _fileService: ProgressFileService;
  private _templateService: ProgressTemplateService;

  constructor(fileService: ProgressFileService, templateService: ProgressTemplateService) {
    this._fileService = fileService;
    this._templateService = templateService;
  }

  /**
   * Load summary progress data across multiple dates for a DocID and Unit
   */
  public async loadSummary(
    docId: string,
    unit: string,
    fromDateStr?: string,
    toDateStr?: string
  ): Promise<ProgressSummaryData> {
    const files = await this._fileService.listDataFiles(docId);
    const unitClean = unit.trim().toLowerCase();

    // 1. Filter matching files
    const matchingFiles: Array<{
      name: string;
      serverRelativeUrl: string;
      dateStr: string;
      dateYYMMDD: string;
      formattedDate: string;
    }> = [];

    files.forEach((f) => {
      const parsed = parseDataFileName(f.name);
      if (!parsed) return;
      if (parsed.unit.trim().toLowerCase() !== unitClean) return;

      if (fromDateStr && parsed.dateStr < fromDateStr) return;
      if (toDateStr && parsed.dateStr > toDateStr) return;

      const parts = parsed.dateStr.split('-');
      const formattedDate = `${parts[2]}/${parts[1]}`;

      matchingFiles.push({
        name: f.name,
        serverRelativeUrl: f.serverRelativeUrl,
        dateStr: parsed.dateStr,
        dateYYMMDD: parsed.dateYYMMDD,
        formattedDate
      });
    });

    // Sort ascending by date
    matchingFiles.sort((a, b) => a.dateYYMMDD.localeCompare(b.dateYYMMDD));

    // Limit to latest 30 dates if not filtered
    const selectedFiles = matchingFiles.slice(-30);

    const columns: DailySummaryCol[] = selectedFiles.map((f) => ({
      dateStr: f.dateStr,
      formattedDate: f.formattedDate,
      fileName: f.name,
      serverRelativeUrl: f.serverRelativeUrl
    }));

    // 2. Read file contents concurrently in chunks of 4
    const dailyRates: Record<string, Record<string, number | undefined>> = {};
    const taskMap = new Map<string, TaskRow>();

    // Initialise with template tasks first
    try {
      const tpl = await this._templateService.getTemplate(docId, unit);
      tpl.tasks.forEach((t) => taskMap.set(t.id, t));
    } catch {
      // template might not be found yet
    }

    const chunkSize = 4;
    for (let i = 0; i < selectedFiles.length; i += chunkSize) {
      const chunk = selectedFiles.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (f) => {
          try {
            const fileData = await this._fileService.getDataFileWithMeta(docId, f.name);
            if (!fileData) return;
            const doc = await parseProgressDocBuffer(fileData.buffer, f.dateStr, unit);

            const dayRates: Record<string, number | undefined> = {};
            doc.tasks.forEach((t) => {
              dayRates[t.id] = t.completionRate;
              if (!taskMap.has(t.id)) {
                taskMap.set(t.id, t);
              }
            });
            dailyRates[f.dateStr] = dayRates;
          } catch (e) {
            console.error(`Error reading summary file ${f.name}:`, e);
          }
        })
      );
    }

    // 3. Assemble tasks in tree order
    const rawTasks = Array.from(taskMap.values());
    const tree = buildTaskTree(rawTasks);
    const sortedTasks = flattenTaskTree(tree);

    // 4. Build dailyData items
    const dailyData: DailyProgressSummaryItem[] = columns.map((col) => ({
      dateStr: col.dateStr,
      formattedDate: col.formattedDate,
      rates: dailyRates[col.dateStr] || {}
    }));

    return {
      docId,
      unit,
      tasks: sortedTasks,
      columns,
      dailyData
    };
  }

  /**
   * Export summary report to Excel file ArrayBuffer
   */
  public async exportSummaryToExcel(summary: ProgressSummaryData): Promise<ArrayBuffer> {
    const dailyRatesMap: Record<string, Record<string, number | undefined>> = {};
    summary.dailyData.forEach((d) => {
      dailyRatesMap[d.dateStr] = d.rates;
    });

    return await encodeSummaryExportBuffer(
      summary.docId,
      summary.unit,
      summary.tasks,
      summary.columns,
      dailyRatesMap
    );
  }
}
