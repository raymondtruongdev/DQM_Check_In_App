export interface Data_checkinRead {
  ID: number;
  Title?: string;
  field_0?: number;
  field_2?: string;
  field_3?: string;
  field_4?: string;
  Phone?: string;
  Created?: string;
  Modified?: string;
  Author?: {
    Title?: string;
    EMail?: string;
  };
  Editor?: {
    Title?: string;
    EMail?: string;
  };
  [key: string]: unknown;
}

export type Data_checkinWrite = Partial<Data_checkinRead>;

