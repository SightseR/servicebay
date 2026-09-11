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
