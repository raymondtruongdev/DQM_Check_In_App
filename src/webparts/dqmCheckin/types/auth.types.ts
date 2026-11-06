export interface UserSession {
  username: string;
  displayName: string;
  department?: string;
  role?: string;
  isAdmin?: boolean;
}

export interface AccountRecord {
  ID: number;
  Title?: string;
  Username?: string;
  Password?: string;
  Department?: string;
  DeparmentName?: string;
  Role?: string;
  field_0?: number;
  field_1?: string;
  field_2?: string;
  field_3?: string;
  field_4?: string;
  field_5?: string;
  [key: string]: unknown;
}
