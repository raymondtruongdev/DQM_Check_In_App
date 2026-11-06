export interface UserSession {
  username: string;
  displayName: string;
  department?: string;
  role?: string;
  isAdmin?: boolean;
}

export interface AccountRecord {
  id: number | string;
  username: string;
  password: string;
  departmentCode?: string;
  departmentName?: string;
  role: string;
}

