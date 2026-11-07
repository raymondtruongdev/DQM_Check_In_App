export interface RoleEntry {
  id: string;
  docId: string;
  docTitle?: string;
  unit: string;
  siteManager: string;
  email: string;
  status: boolean;
}

export interface TaskRow {
  id: string;
  taskName: string;
  completionRate?: number;
  quantity?: number;
  unit: string;
  parentId?: string;
  isCustom?: boolean;
  level: number;
}

export interface TaskNode {
  id: string;
  taskName: string;
  completionRate?: number;
  quantity?: number;
  unit: string;
  parentId?: string;
  isCustom?: boolean;
  level: number;
  isLeaf: boolean;
  isTemplateLocked: boolean;
  children: TaskNode[];
}

export interface ProgressDocMetadata {
  docTitle: string;
  docId: string;
  name: string;
  email: string;
  unit: string;
  updateTime: string;
}

export interface ProgressDoc {
  metadata: ProgressDocMetadata;
  tasks: TaskRow[];
  dateStr: string; // YYYY-MM-DD
  isLoadedFromPreviousDay?: boolean;
  previousDayDateStr?: string;
  eTag?: string;
}

export interface DailySummaryCol {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // DD/MM
  fileName: string;
  serverRelativeUrl: string;
}

export interface DailyProgressSummaryItem {
  dateStr: string;
  formattedDate: string;
  rates: Record<string, number | undefined>;
}

export interface ProgressSummaryData {
  docId: string;
  unit: string;
  tasks: TaskRow[];
  columns: DailySummaryCol[];
  dailyData: DailyProgressSummaryItem[];
}
