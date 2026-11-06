export type ViewMode = 'cards' | 'table';

export interface ToastState {
  type: 'success' | 'error';
  text: string;
}
