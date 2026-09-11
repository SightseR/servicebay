import { DriveMode, Gearbox, MotivePower } from '@prisma/client';
import { LegacyDoc, mapAll, mapDoc, slug } from './legacy-map';

const base = (over: Partial<LegacyDoc> = {}): LegacyDoc => ({
  legacyId: 'abc', timestamp: '2025-08-01T10:00:00.000Z', regNumber: ' dw 769dn ', brand: 'FIAT ', model: '500',
  year: '2015', kilometers: '123456', gearbox: 'Manual', motivePower: 'Petrol', driveMode: '4 x 4',
  engineServices: [{ type: 'Oil change', done: true, urgent: false, later: false }, { type: 'Belt replacement', done: false, urgent: false, later: false }],
  chassisServices: [{ type: 'Front brake repair', done: false, urgent: true, later: false }],
  vehicleScanning: [{ type: 'fault code erase', done: true, urgent: false, later: false }],
  brakePercentages: { frontLeft: '80', frontRight: '', rearLeft: '75', rearRight: '' },
  additionalInfo: '  needs tyres  ', userId: 'anon1', ...over,
});

describe('legacy-map', () => {
  it('slug matches the seed', () => {
    expect(slug('Wheel bearing replacement - Front Left side')).toBe('wheel_bearing_replacement_front_left_side');
  });

  it('maps a full document', () => {
    const { vehicle, record } = mapDoc(base());
    expect(vehicle).toEqual({ regNumber: 'dw 769dn', brand: 'FIAT', model: '500', year: 2015, gearbox: Gearbox.MANUAL, motivePower: MotivePower.PETROL, driveMode: DriveMode.FOUR_WD });
    expect(record.kilometers).toBe(123456);
    expect(record.legacyUserId).toBe('anon1');
    expect(record.values.map((v) => v.legacyKey)).toEqual([
      'engine.oil_change', 'chassis.front_brake_repair', 'scanning.main', 'brakes.front_left', 'brakes.rear_left', 'notes.additional_info',
    ]);
    expect(record.values.find((v) => v.legacyKey === 'scanning.main')!.value).toEqual({ done: true, urgent: false, later: false, note: 'fault code erase' });
    expect(record.values.find((v) => v.legacyKey === 'notes.additional_info')!.value).toBe('needs tyres');
  });

  it('skips unflagged items, empty brakes, blank notes, missing scanning', () => {
    const { record } = mapDoc(base({ engineServices: [{ type: 'Oil change' }], chassisServices: [], vehicleScanning: undefined, brakePercentages: {}, additionalInfo: '' }));
    expect(record.values).toEqual([]);
  });

  it('rejects bad numbers and unknown enums', () => {
    expect(() => mapDoc(base({ kilometers: '12a' }))).toThrow('not an integer');
    expect(() => mapDoc(base({ driveMode: 'AWD' }))).toThrow('driveMode');
  });

  it('mapAll sorts chronologically', () => {
    const out = mapAll([base({ legacyId: 'b', timestamp: '2025-09-01T00:00:00Z' }), base({ legacyId: 'a', timestamp: '2025-01-01T00:00:00Z' })]);
    expect(out.map((o) => o.record.legacyId)).toEqual(['a', 'b']);
  });
});
