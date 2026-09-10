/**
 * Import Firestore export (vehicleServices.json) into the new Postgres schema.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/vehicle_service node import.js vehicleServices.json
 *   DRY_RUN=1 DATABASE_URL=... node import.js vehicleServices.json   # rolls back at the end
 *
 * Idempotent: records already imported (matched by legacy_id) are skipped,
 * so it is safe to re-run for the cutover delta export.
 */
const fs = require('fs');

// ---------- Pure transform helpers (also used by the test) ----------

const trimOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const toInt = (v, field, legacyId) => {
  const s = trimOrNull(v);
  if (s === null) return null;
  const n = Number(s);
  if (!Number.isInteger(n)) throw new Error(`Record ${legacyId}: ${field} "${v}" is not an integer`);
  return n;
};

const toPct = (v, field, legacyId) => {
  const n = toInt(v, field, legacyId);
  if (n !== null && (n < 0 || n > 100)) throw new Error(`Record ${legacyId}: ${field} ${n} out of 0-100`);
  return n;
};

const ENUMS = {
  gearbox: ['Auto', 'Manual'],
  motivePower: ['Petrol', 'Diesel', 'Gas', 'Hybrid', 'PHEV', 'HEV'],
  driveMode: ['Front', 'Rear', '4 x 4'],
};
const toEnum = (v, field, legacyId) => {
  const s = trimOrNull(v);
  if (s === null) return null;
  if (!ENUMS[field].includes(s)) throw new Error(`Record ${legacyId}: ${field} "${v}" not in ${ENUMS[field]}`);
  return s;
};

const regKey = (reg) => String(reg).toUpperCase().replace(/\s+/g, '');

/** Normalise one Firestore document into { vehicle, record, items } */
function transformRecord(doc) {
  const id = doc.legacyId;
  const scan = Array.isArray(doc.vehicleScanning) && doc.vehicleScanning[0]
    ? doc.vehicleScanning[0]
    : { type: '', done: false, urgent: false, later: false };
  const bp = doc.brakePercentages || {};

  const regNumber = trimOrNull(doc.regNumber);
  if (!regNumber) throw new Error(`Record ${id}: missing regNumber`);
  if (!doc.timestamp) throw new Error(`Record ${id}: missing timestamp`);

  const spec = {
    gearbox: toEnum(doc.gearbox, 'gearbox', id),
    motive_power: toEnum(doc.motivePower, 'motivePower', id),
    drive_mode: toEnum(doc.driveMode, 'driveMode', id),
  };

  return {
    vehicle: {
      reg_number: regNumber,
      reg_key: regKey(regNumber),
      brand: trimOrNull(doc.brand) || 'Unknown',
      model: trimOrNull(doc.model) || 'Unknown',
      year: toInt(doc.year, 'year', id),
      ...spec,
    },
    record: {
      legacy_id: id,
      legacy_user_id: doc.userId || null,
      serviced_at: new Date(doc.timestamp),
      kilometers: toInt(doc.kilometers, 'kilometers', id),
      ...spec,
      brake_front_left:  toPct(bp.frontLeft,  'brake frontLeft',  id),
      brake_front_right: toPct(bp.frontRight, 'brake frontRight', id),
      brake_rear_left:   toPct(bp.rearLeft,   'brake rearLeft',   id),
      brake_rear_right:  toPct(bp.rearRight,  'brake rearRight',  id),
      scanning_type:   trimOrNull(scan.type),
      scanning_done:   !!scan.done,
      scanning_urgent: !!scan.urgent,
      scanning_later:  !!scan.later,
      additional_info: trimOrNull(doc.additionalInfo),
    },
    items: [
      ...(doc.engineServices  || []).map((s) => ({ category: 'engine',  ...s })),
      ...(doc.chassisServices || []).map((s) => ({ category: 'chassis', ...s })),
    ].map((s) => ({
      category: s.category,
      name: String(s.type).trim(),
      done: !!s.done,
      urgent: !!s.urgent,
      later: !!s.later,
    })),
  };
}

// ---------- Loader ----------

/**
 * @param {{query: (sql: string, params?: any[]) => Promise<{rows: any[]}>}} db  pg Client or PGlite
 * @param {object[]} docs  parsed vehicleServices.json
 */
async function importDocs(db, docs, { log = console.log } = {}) {
  const sorted = [...docs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const transformed = sorted.map(transformRecord); // fail fast on bad data before touching the DB

  // service type name -> id
  const { rows: typeRows } = await db.query('SELECT id, category, name FROM service_types');
  const typeId = new Map(typeRows.map((t) => [`${t.category}|${t.name}`, t.id]));
  for (const t of transformed) for (const it of t.items) {
    if (!typeId.has(`${it.category}|${it.name}`))
      throw new Error(`Record ${t.record.legacy_id}: unknown service type "${it.name}" (${it.category}) — add it to service_types first`);
  }

  const { rows: existing } = await db.query('SELECT legacy_id FROM service_records WHERE legacy_id IS NOT NULL');
  const already = new Set(existing.map((r) => r.legacy_id));

  const stats = { vehiclesInserted: 0, vehiclesUpdated: 0, recordsInserted: 0, recordsSkipped: 0, itemsInserted: 0 };

  for (const t of transformed) {
    if (already.has(t.record.legacy_id)) { stats.recordsSkipped++; continue; }

    // Upsert vehicle: processing in chronological order means the latest record's spec wins.
    const v = t.vehicle;
    const { rows: vrows } = await db.query(
      `INSERT INTO vehicles (reg_number, brand, model, year, gearbox, motive_power, drive_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (reg_key) DO UPDATE SET
         brand = EXCLUDED.brand, model = EXCLUDED.model, year = EXCLUDED.year,
         gearbox = EXCLUDED.gearbox, motive_power = EXCLUDED.motive_power, drive_mode = EXCLUDED.drive_mode,
         updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [v.reg_number, v.brand, v.model, v.year, v.gearbox, v.motive_power, v.drive_mode],
    );
    const vehicleId = vrows[0].id;
    if (vrows[0].inserted) stats.vehiclesInserted++; else stats.vehiclesUpdated++;

    const r = t.record;
    const { rows: rrows } = await db.query(
      `INSERT INTO service_records (
         vehicle_id, kilometers, gearbox, motive_power, drive_mode,
         brake_front_left, brake_front_right, brake_rear_left, brake_rear_right,
         scanning_type, scanning_done, scanning_urgent, scanning_later,
         additional_info, serviced_at, legacy_id, legacy_user_id, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$15,$15)
       RETURNING id`,
      [vehicleId, r.kilometers, r.gearbox, r.motive_power, r.drive_mode,
       r.brake_front_left, r.brake_front_right, r.brake_rear_left, r.brake_rear_right,
       r.scanning_type, r.scanning_done, r.scanning_urgent, r.scanning_later,
       r.additional_info, r.serviced_at, r.legacy_id, r.legacy_user_id],
    );
    const recordId = rrows[0].id;
    stats.recordsInserted++;

    for (const it of t.items) {
      await db.query(
        `INSERT INTO service_items (service_record_id, service_type_id, done, urgent, later)
         VALUES ($1, $2, $3, $4, $5)`,
        [recordId, typeId.get(`${it.category}|${it.name}`), it.done, it.urgent, it.later],
      );
      stats.itemsInserted++;
    }
  }

  log('Import stats:', stats);
  return stats;
}

// ---------- CLI ----------

async function main() {
  const file = process.argv[2] || 'vehicleServices.json';
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('Set DATABASE_URL'); process.exit(1); }

  const docs = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Loaded ${docs.length} documents from ${file}`);

  const { Client } = require('pg');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    await importDocs(client, docs);
    if (process.env.DRY_RUN) {
      await client.query('ROLLBACK');
      console.log('DRY_RUN set — rolled back.');
    } else {
      await client.query('COMMIT');
      console.log('Committed.');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Import failed, rolled back:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

module.exports = { transformRecord, importDocs, regKey };
if (require.main === module) main();
