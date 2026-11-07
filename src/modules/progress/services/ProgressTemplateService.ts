import { ProgressDoc } from '../types/progress.types';
import { parseProgressDocBuffer } from '../utils/excelCodec';
import { ProgressFileService } from './ProgressFileService';

export class ProgressTemplateService {
  private _fileService: ProgressFileService;

  constructor(fileService: ProgressFileService) {
    this._fileService = fileService;
  }

  /**
   * Load the base template for a DocID and Unit
   */
  public async getTemplate(docId: string, unit: string): Promise<ProgressDoc> {
    const buffer = await this._fileService.getTemplateBuffer(docId, unit);
    if (!buffer) {
      throw new Error(`Không tìm thấy template cho dự án ${docId}, vị trí ${unit} trong thư mục template`);
    }

    const doc = await parseProgressDocBuffer(buffer, '', unit);
    // Ensure metadata docId and unit are populated
    doc.metadata.docId = doc.metadata.docId || docId;
    doc.metadata.unit = doc.metadata.unit || unit;

    // Reset values in template so they are blank
    doc.tasks = doc.tasks.map((t) => ({
      ...t,
      completionRate: undefined,
      quantity: undefined
    }));

    return doc;
  }
}
