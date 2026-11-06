export interface Data_checkinRead {
  ID: number;
  Id?: number;
  Name?: string;
  Check_x0020_in?: string;
  CheckIn?: string;
  Location?: string;
  Note?: string;
  Phone?: string;
  Title?: string;
  // SharePoint internal field names when imported from Excel or created via template:
  field_0?: number; // Id
  field_1?: string; // Name
  field_2?: string; // Check in
  field_3?: string; // Location
  field_4?: string; // Note
  field_5?: string; // Phone
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

