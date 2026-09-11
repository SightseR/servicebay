export type Gearbox = 'AUTO' | 'MANUAL';
export type MotivePower = 'PETROL' | 'DIESEL' | 'GAS' | 'HYBRID' | 'PHEV' | 'HEV';
export type DriveMode = 'FRONT' | 'REAR' | 'FOUR_WD';

export interface VehicleSummary {
  id: string; regNumber: string; brand: string; model: string; year: number | null;
  gearbox: Gearbox | null; motivePower: MotivePower | null; driveMode: DriveMode | null;
  ownerName: string | null; ownerPhone: string | null; ownerEmail: string | null;
}

export interface RecordListItem {
  id: string; servicedAt: string; kilometers: number | null; legacyId: string | null; createdAt: string;
  vehicle: { id: string; regNumber: string; brand: string; model: string; year: number | null; ownerName: string | null };
  createdBy: { id: string; displayName: string } | null;
  valueCount: number;
}

export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number; pages: number }

export interface VehicleDetail extends VehicleSummary {
  createdAt: string; updatedAt: string;
  records: { id: string; servicedAt: string; kilometers: number | null; createdBy: { id: string; displayName: string } | null }[];
}

export interface RecordItem {
  fieldId: string; label: string; type: string; sortOrder: number; showInReport: boolean; value: unknown;
}
export interface RecordSection { id: string; title: string; sortOrder: number; items: RecordItem[] }
export interface RecordDetail {
  id: string; kilometers: number | null; gearbox: Gearbox | null; motivePower: MotivePower | null; driveMode: DriveMode | null;
  servicedAt: string; legacyId: string | null; createdAt: string; updatedAt: string;
  vehicle: VehicleSummary;
  createdBy: { id: string; displayName: string } | null;
  updatedBy: { id: string; displayName: string } | null;
  sections: RecordSection[];
  values: { fieldId: string; value: unknown }[];
}

export interface ReportItem { fieldId: string; label: string; type: string; value: unknown }
export interface ReportSection { id: string; title: string; items: ReportItem[] }
export interface CompanyProfile {
  companyName: string | null; tagline: string | null; addressLine1: string | null; addressLine2: string | null;
  postalCode: string | null; city: string | null; country: string | null; phone: string | null; email: string | null;
  website: string | null; businessId: string | null; vatId: string | null; logoPath: string | null;
}
export interface RecordReport {
  company: CompanyProfile | null;
  vehicle: VehicleSummary;
  record: { id: string; legacyId: string | null; servicedAt: string; kilometers: number | null; gearbox: Gearbox | null; motivePower: MotivePower | null; driveMode: DriveMode | null; createdBy: { id: string; displayName: string } | null; createdAt: string; updatedAt: string };
  sections: ReportSection[];
  generatedAt: string;
}
