/* eslint-disable no-console */
/**
 * Legacy import: Firestore export → ServiceBay (dynamic form model).
 *
 *   cd backend
 *   DATABASE_URL=postgresql://servicebay:servicebay@localhost:5433/servicebay_db \
 *     npx ts-node --transpile-only prisma/legacy-import.ts ../migration/vehicleServices.json [--dry-run]
 *
 * - Idempotent: records already present (by legacyId) are skipped, so the cutover delta re-runs safely.
 * - Values go through the same normaliser the API uses, so imported data is byte-identical in shape.
 * - Field lookup is by config.legacyKey (set by the seed), so renames in the form builder don't break it.
 * - Whole import runs in one transaction; any bad document aborts everything.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import { normaliseValue, FieldDef } from '../src/records/record-values';
import { regKey } from '../src/common/reg-key';
import { LegacyDoc, mapAll } from './legacy-map';

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!file) { console.error('usage: legacy-import.ts <vehicleServices.json> [--dry-run]'); process.exit(1); }

  const docs: LegacyDoc[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Loaded ${docs.length} legacy documents from ${file}${dryRun ? ' (DRY RUN)' : ''}`);

  const mapped = mapAll(docs); // throws on bad data before touching the DB

  // field lookup by legacyKey
  const fields = await prisma.formField.findMany({
    select: { id: true, label: true, type: true, required: true, active: true, config: true, options: { select: { id: true, label: true, active: true } } },
  });
  const byKey = new Map<string, FieldDef>();
  for (const f of fields) {
    const key = (f.config as { legacyKey?: string })?.legacyKey;
    if (key) byKey.set(key, f as unknown as FieldDef);
  }
  const missing = new Set<string>();
  for (const m of mapped) for (const v of m.record.values) if (!byKey.has(v.legacyKey)) missing.add(v.legacyKey);
  if (missing.size) throw new Error(`No form field for legacy keys (run the seed first?): ${[...missing].join(', ')}`);

  const existing = new Set((await prisma.serviceRecord.findMany({ where: { legacyId: { not: null } }, select: { legacyId: true } })).map((r) => r.legacyId!));

  const stats = { vehiclesCreated: 0, vehiclesUpdated: 0, recordsInserted: 0, recordsSkipped: 0, valuesInserted: 0 };
  let expectedValues = 0;

  await prisma.$transaction(async (tx) => {
    for (const { vehicle, record } of mapped) {
      if (existing.has(record.legacyId)) { stats.recordsSkipped++; continue; }

      const key = regKey(vehicle.regNumber);
      const found = await tx.vehicle.findUnique({ where: { regKey: key }, select: { id: true } });
      const v = found
        ? await tx.vehicle.update({ where: { id: found.id }, data: { ...vehicle, regKey: key } })
        : await tx.vehicle.create({ data: { ...vehicle, regKey: key } });
      found ? stats.vehiclesUpdated++ : stats.vehiclesCreated++;

      const values = record.values.map(({ legacyKey, value }) => {
        const field = byKey.get(legacyKey)!;
        const norm = normaliseValue(field, value); // same rules as the API
        if (norm === null) throw new Error(`Record ${record.legacyId}: value for ${legacyKey} normalised to empty`);
        return { fieldId: field.id, value: norm as unknown as Prisma.InputJsonObject, labelSnapshot: field.label };
      });
      expectedValues += values.length;

      await tx.serviceRecord.create({
        data: {
          vehicleId: v.id,
          kilometers: record.kilometers,
          gearbox: record.gearbox, motivePower: record.motivePower, driveMode: record.driveMode,
          servicedAt: record.servicedAt,
          createdAt: record.createdAt,
          legacyId: record.legacyId,
          legacyUserId: record.legacyUserId,
          values: { create: values },
        },
      });
      stats.recordsInserted++;
      stats.valuesInserted += values.length;
    }
    if (dryRun) throw new DryRunRollback();
  }, { timeout: 120_000 }).catch((e) => { if (!(e instanceof DryRunRollback)) throw e; console.log('Dry run — rolled back.'); });

  console.log('Stats:', stats);

  // verification against the source file
  const inDb = await prisma.serviceRecord.count({ where: { legacyId: { in: docs.map((d) => d.legacyId) } } });
  const valuesInDb = await prisma.recordValue.count({ where: { record: { legacyId: { in: docs.map((d) => d.legacyId) } } } });
  const expectedRecords = dryRun ? 0 : docs.length;
  console.log(`Verify: legacy records in DB ${inDb}/${docs.length}, values ${valuesInDb} (this run inserted ${stats.valuesInserted}, expected ${expectedValues})`);
  if (!dryRun && (inDb !== expectedRecords)) { console.error('MISMATCH'); process.exitCode = 2; }
}

class DryRunRollback extends Error {}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
