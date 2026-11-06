export type ViewMode = 'cards' | 'table';

export type SortField = 'Id' | 'Name' | 'Phone' | 'Check_x0020_in' | 'Location' | 'Note';

export type SortDirection = 'asc' | 'desc';

export type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

export interface ToastState {
  type: 'success' | 'error';
  text: string;
}
