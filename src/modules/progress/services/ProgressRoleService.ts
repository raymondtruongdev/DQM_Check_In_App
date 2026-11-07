import { extractCleanEmail } from '../../../core/auth';
import { RoleEntry } from '../types/progress.types';
import { parseRoleBuffer } from '../utils/excelCodec';
import { ProgressFileService } from './ProgressFileService';

export interface UserRoleResolution {
  userEmail: string;
  isAdmin: boolean;
  assignedRoles: RoleEntry[];
  allRoles: RoleEntry[];
}

export class ProgressRoleService {
  private _fileService: ProgressFileService;

  constructor(fileService: ProgressFileService) {
    this._fileService = fileService;
  }

  /**
   * Load and resolve user role assignments from Projects_Role.xlsx
   */
  public async resolveUserRoles(rawUserEmail: string, isAdmin: boolean): Promise<UserRoleResolution> {
    const cleanEmail = extractCleanEmail(rawUserEmail).toLowerCase();
    const buffer = await this._fileService.getRoleFileBuffer();

    if (!buffer) {
      return {
        userEmail: cleanEmail,
        isAdmin,
        assignedRoles: [],
        allRoles: []
      };
    }

    const allRoles = await parseRoleBuffer(buffer);

    // Active roles (Status == true)
    const activeRoles = allRoles.filter((r) => r.status);

    let assignedRoles: RoleEntry[];
    if (isAdmin) {
      // Admin gets all active assignments
      assignedRoles = activeRoles;
    } else {
      // Normal user matches clean email
      assignedRoles = activeRoles.filter((r) => {
        const entryEmail = extractCleanEmail(r.email).toLowerCase();
        return entryEmail === cleanEmail;
      });
    }

    return {
      userEmail: cleanEmail,
      isAdmin,
      assignedRoles,
      allRoles
    };
  }
}

