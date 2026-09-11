/**
 * Pure mapping from a Firestore export document (migration/vehicleServices.json)
 * to the ServiceBay model. No DB access — unit-tested against synthetic and real data.
 */
import { DriveMode, Gearbox, MotivePower } from '@prisma/client';

export interface LegacyServiceItem { type: string; done?: boolean; urgent?: boolean; later?: boolean }
export interface LegacyDoc {
  legacyId: string;
  path?: string;
  createTime?: string;
  updateTime?: string;
  userId?: string;
  timestamp: string;
  regNumber: string;
  brand?: string;
  model?: string;
  year?: string | number;
  kilometers?: string | number;
  gearbox?: string;
  motivePower?: string;
  driveMode?: string;
  engineServices?: LegacyServiceItem[];
  chassisServices?: LegacyServiceItem[];
  vehicleScanning?: LegacyServiceItem[];
  brakePercentages?: { frontLeft?: string; frontRight?: string; rearLeft?: string; rearRight?: string };
  additionalInfo?: string;
}

export interface MappedVehicle {
  regNumber: string; brand: string; model: string; year: number | null;
  gearbox: Gearbox | null; motivePower: MotivePower | null; driveMode: DriveMode | null;
}
export interface MappedValue { legacyKey: string; value: unknown }
export interface MappedRecord {
  legacyId: string; legacyUserId: string | null; servicedAt: Date; createdAt: Date;
  kilometers: number | null; gearbox: Gearbox | null; motivePower: MotivePower | null; driveMode: DriveMode | null;
  values: MappedValue[];
}

const GEARBOX: Record<string, Gearbox> = { Auto: Gearbox.AUTO, Manual: Gearbox.MANUAL };
const POWER: Record<string, MotivePower> = {
  Petrol: MotivePower.PETROL, Diesel: MotivePower.DIESEL, Gas: MotivePower.GAS,
  Hybrid: MotivePower.HYBRID, PHEV: MotivePower.PHEV, HEV: MotivePower.HEV,
};
const DRIVE: Record<string, DriveMode> = { Front: DriveMode.FRONT, Rear: DriveMode.REAR, '4 x 4': DriveMode.FOUR_WD };

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const trimOrNull = (v: unknown) => { const s = v == null ? '' : String(v).trim(); return s === '' ? null : s; };

const toInt = (v: unknown, what: string, id: string): number | null => {
  const s = trimOrNull(v);
  if (s === null) return null;
  const n = Number(s);
  if (!Number.isInteger(n)) throw new Error(`Record ${id}: ${what} "${v}" is not an integer`);
  return n;
};
const toEnum = <T>(map: Record<string, T>, v: unknown, what: string, id: string): T | null => {
  const s = trimOrNull(v);
  if (s === null) return null;
  if (!(s in map)) throw new Error(`Record ${id}: ${what} "${v}" not in ${Object.keys(map).join('|')}`);
  return map[s];
};

const anyFlag = (i: LegacyServiceItem) => !!(i.done || i.urgent || i.later);

export function mapDoc(doc: LegacyDoc): { vehicle: MappedVehicle; record: MappedRecord } {
  const id = doc.legacyId;
  const regNumber = trimOrNull(doc.regNumber);
  if (!regNumber) throw new Error(`Record ${id}: missing regNumber`);
  if (!doc.timestamp) throw new Error(`Record ${id}: missing timestamp`);

  const spec = {
    gearbox: toEnum(GEARBOX, doc.gearbox, 'gearbox', id),
    motivePower: toEnum(POWER, doc.motivePower, 'motivePower', id),
    driveMode: toEnum(DRIVE, doc.driveMode, 'driveMode', id),
  };

  const values: MappedValue[] = [];
  for (const [prefix, items] of [['engine', doc.engineServices], ['chassis', doc.chassisServices]] as const) {
    for (const item of items ?? []) {
      if (!anyFlag(item)) continue;
      values.push({ legacyKey: `${prefix}.${slug(item.type)}`, value: { done: !!item.done, urgent: !!item.urgent, later: !!item.later } });
    }
  }
  const scan = doc.vehicleScanning?.[0];
  if (scan && (anyFlag(scan) || trimOrNull(scan.type))) {
    values.push({ legacyKey: 'scanning.main', value: { done: !!scan.done, urgent: !!scan.urgent, later: !!scan.later, note: trimOrNull(scan.type) ?? undefined } });
  }
  const bp = doc.brakePercentages ?? {};
  for (const [k, key] of [['frontLeft', 'front_left'], ['frontRight', 'front_right'], ['rearLeft', 'rear_left'], ['rearRight', 'rear_right']] as const) {
    const n = toInt(bp[k], `brake ${k}`, id);
    if (n !== null) values.push({ legacyKey: `brakes.${key}`, value: n });
  }
  const info = trimOrNull(doc.additionalInfo);
  if (info) values.push({ legacyKey: 'notes.additional_info', value: info });

  return {
    vehicle: {
      regNumber,
      brand: trimOrNull(doc.brand) ?? 'Unknown',
      model: trimOrNull(doc.model) ?? 'Unknown',
      year: toInt(doc.year, 'year', id),
      ...spec,
    },
    record: {
      legacyId: id,
      legacyUserId: trimOrNull(doc.userId),
      servicedAt: new Date(doc.timestamp),
      createdAt: new Date(doc.createTime ?? doc.timestamp),
      kilometers: toInt(doc.kilometers, 'kilometers', id),
      ...spec,
      values,
    },
  };
}

/** Sort chronologically so the latest visit's spec wins on the vehicle. */
export const mapAll = (docs: LegacyDoc[]) =>
  [...docs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map(mapDoc);
