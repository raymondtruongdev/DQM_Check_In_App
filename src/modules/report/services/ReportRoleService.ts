import { UserRoleResolution } from '../../../core/types';
import { RoleResolutionService } from '../../../core/services';
import { REPORT_CONFIG } from '../constants/reportConfig';
import { ReportFileService } from './ReportFileService';

export class ReportRoleService {
  private _fileService: ReportFileService;

  constructor(fileService: ReportFileService) {
    this._fileService = fileService;
  }

  /**
   * Load and resolve user role assignments from Report_Role.xlsx
   */
  public async resolveUserRoles(rawUserEmail: string, isAdmin: boolean): Promise<UserRoleResolution> {
    const buffer = await this._fileService.getRoleFileBuffer();
    const resolution = await RoleResolutionService.resolveRolesFromBuffer(buffer, rawUserEmail, isAdmin);

    // Filter only valid DocIDs for report module (DailyReport, WeeklyReport)
    const validDocIds = new Set<string>(REPORT_CONFIG.VALID_DOC_IDS.map((d) => d.toLowerCase()));

    const filteredAssignedRoles = resolution.assignedRoles.filter((r) =>
      validDocIds.has(r.docId.toLowerCase())
    );

    const filteredAllRoles = resolution.allRoles.filter((r) =>
      validDocIds.has(r.docId.toLowerCase())
    );

    return {
      userEmail: resolution.userEmail,
      isAdmin: resolution.isAdmin,
      assignedRoles: filteredAssignedRoles,
      allRoles: filteredAllRoles
    };
  }
}
