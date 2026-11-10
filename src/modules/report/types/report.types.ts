import { RoleEntry } from '../../../core/types';

export type ReportRoleAssignment = RoleEntry;

export interface ReportMetadata {
  docTitle: string; // e.g. "BÁO CÁO NGÀY" or "BÁO CÁO TUẦN"
  subTitle: string; // e.g. "DAILY REPORT Tuyến Metro số 2..."
  docCode: string;  // e.g. "HCM2_1-23_CS-MAUR_..."
  location: string; // e.g. "ST01"
  reportNo: string; // e.g. "01"
  shift: string;    // e.g. "Ca ngày"
  email: string;    // User email
  updateTime: string; // ISO 8601 or formatted string
}

export interface ReportTaskRow {
  id: string; // "1", "1.1", "1.2", "2", etc.
  taskName: string;
  completionRate?: number; // 0 - 100
  quantity?: number;
  unit: string;
  parentId?: string;
  level: number;
  isLeaf: boolean;
}

export interface ReportTaskNode extends ReportTaskRow {
  children: ReportTaskNode[];
}

export interface ReportDoc {
  docId: string;    // "DailyReport" | "WeeklyReport"
  unit: string;     // e.g. "ST01"
  dateStr: string;  // "YYYY-MM-DD"
  metadata: ReportMetadata;
  tasks: ReportTaskRow[];
  eTag?: string;
  isExisting?: boolean;
}

