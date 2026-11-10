export const REPORT_CONFIG = {
  LIBRARY_NAME: 'CapNhatCongViec',
  ROLE_FILE_NAME: 'Report_Role.xlsx',
  ROLE_SHEET_NAME: 'Role',
  TEMPLATE_FOLDER: '_template',
  DATA_FOLDER: 'data',
  VALID_DOC_IDS: ['DailyReport', 'WeeklyReport'] as const,
  DEFAULT_HEADERS: {
    DOC_TITLE: 'DocTile',
    SUB_TITLE: 'SubTile',
    DOC_CODE: 'DocCode',
    LOCATION: 'Location',
    REPORT_NO: 'ReportNo',
    SHIFT: 'Shift',
    EMAIL: 'Email',
    UPDATE_TIME: 'UpdateTime'
  }
} as const;

