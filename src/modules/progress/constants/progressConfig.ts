export const PROGRESS_CONFIG = {
  LIBRARY_NAME: 'CapNhatCongViec',
  TEMPLATE_FOLDER: '_template',
  TEMPLATE_FALLBACK_FOLDER: 'template',
  DATA_FOLDER: 'data',
  ROLE_FILE_NAME: 'Projects_Role.xlsx',
  ROLE_TABLE_NAME: 'tb_role',
  ROLE_SHEET_NAME: 'Role',
  TASK_TABLE_NAME: 'tb_thongtin',
  DEFAULT_HEADERS: {
    DOC_TITLE: 'DocTile',
    DOC_ID: 'Doc_ID',
    NAME: 'Name',
    EMAIL: 'Email',
    UNIT: 'Unit',
    UPDATE_TIME: 'UpdateTime'
  }
} as const;

