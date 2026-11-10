export interface RoleEntry {
  id: string;
  docId: string;
  docTitle?: string;
  unit: string;
  siteManager: string;
  email: string;
  status: boolean;
}

export interface UserRoleResolution<T = RoleEntry> {
  userEmail: string;
  isAdmin: boolean;
  assignedRoles: T[];
  allRoles: T[];
}

