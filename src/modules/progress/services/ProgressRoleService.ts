import { UserRoleResolution } from '../../../core/types';
import { RoleResolutionService } from '../../../core/services';
import { ProgressFileService } from './ProgressFileService';

export type { UserRoleResolution };

export class ProgressRoleService {
  private _fileService: ProgressFileService;

  constructor(fileService: ProgressFileService) {
    this._fileService = fileService;
  }

  /**
   * Load and resolve user role assignments from Projects_Role.xlsx
   */
  public async resolveUserRoles(rawUserEmail: string, isAdmin: boolean): Promise<UserRoleResolution> {
    const buffer = await this._fileService.getRoleFileBuffer();
    return await RoleResolutionService.resolveRolesFromBuffer(buffer, rawUserEmail, isAdmin);
  }
}
