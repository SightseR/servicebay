/* eslint-disable no-console */
import { FieldType, PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ------------------------------------------------------------------
// Form definition reproducing the legacy Firebase app. Field "keys" are
// stable identifiers stored in config.legacyKey so the migration script
// can map old records onto these fields regardless of later renames.
// ------------------------------------------------------------------

type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  config?: Record<string, unknown>;
  options?: string[];
  required?: boolean;
};

const ENGINE = [
  'Oil change',
  'Oil filter change',
  'Air filter change',
  'AC filter change',
  'Oil seal replacement',
  'Belt replacement',
  'Water pump replacement',
  'Thermostat replacement',
  'Coolant hose replacement',
  'Drive pulley replacement',
  'Engine mount replacement',
  'Spark plug replacement',
  'Fuel injector repair',
  'Fuel injector replacement',
  'Throttle body repair',
  'Ignition coil replacement',
  'Fuel pump replacement',
  'Timing belt replacement',
  'Timing chain replacement',
];

const CHASSIS = [
  'Shock absorber replacement',
  'Lower arm replacement',
  'Rack end replacement',
  'Ball joint replacement',
  'Front brake repair',
  'Front brake replacement',
  'Rear brake repair',
  'Rear brake replacement',
  'Wheel bearing replacement - Front Left side',
  'Wheel bearing replacement - Front right side',
  'Wheel bearing replacement - Rear right side',
  'Wheel bearing replacement - Rear left side',
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const SECTIONS: { key: string; title: string; fields: FieldDef[] }[] = [
  {
    key: 'engine',
    title: 'Engine services',
    fields: ENGINE.map((label) => ({ key: `engine.${slug(label)}`, label, type: FieldType.CHECKLIST })),
  },
  {
    key: 'chassis',
    title: 'Chassis services',
    fields: CHASSIS.map((label) => ({ key: `chassis.${slug(label)}`, label, type: FieldType.CHECKLIST })),
  },
  {
    key: 'scanning',
    title: 'Vehicle scanning',
    fields: [
      {
        key: 'scanning.main',
        label: 'Vehicle scanning',
        type: FieldType.CHECKLIST,
        config: { allowNote: true, notePlaceholder: 'e.g. fault code erase, oil service reset' },
      },
    ],
  },
  {
    key: 'brakes',
    title: 'Brake wear',
    fields: (['Front left', 'Front right', 'Rear left', 'Rear right'] as const).map((label) => ({
      key: `brakes.${slug(label)}`,
      label,
      type: FieldType.NUMBER,
      config: { unit: '%', min: 0, max: 100 },
    })),
  },
  {
    key: 'notes',
    title: 'Additional information',
    fields: [{ key: 'notes.additional_info', label: 'Additional information', type: FieldType.TEXTAREA }],
  },
];

async function seedFormDefinition() {
  for (const [sIdx, s] of SECTIONS.entries()) {
    // Sections are matched by their legacy key stored on the first field's config;
    // simpler: match by title on first seed, then never touch again.
    let section = await prisma.formSection.findFirst({ where: { title: s.title } });
    if (!section) {
      section = await prisma.formSection.create({ data: { title: s.title, sortOrder: (sIdx + 1) * 10 } });
      console.log(`  + section "${s.title}"`);
    }

    for (const [fIdx, f] of s.fields.entries()) {
      const existing = await prisma.formField.findFirst({
        where: { config: { path: ['legacyKey'], equals: f.key } },
      });
      if (existing) continue;

      const field = await prisma.formField.create({
        data: {
          sectionId: section.id,
          label: f.label,
          type: f.type,
          required: f.required ?? false,
          sortOrder: (fIdx + 1) * 10,
          config: { ...(f.config ?? {}), legacyKey: f.key },
        },
      });
      if (f.options?.length) {
        await prisma.formFieldOption.createMany({
          data: f.options.map((label, i) => ({ fieldId: field.id, label, sortOrder: (i + 1) * 10 })),
        });
      }
    }
  }
}

async function seedManager() {
  const email = (process.env.SEED_MANAGER_EMAIL ?? 'manager@servicebay.local').toLowerCase();
  const password = process.env.SEED_MANAGER_PASSWORD ?? 'ChangeMe123!';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      displayName: process.env.SEED_MANAGER_NAME ?? 'Manager',
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
      approvedAt: new Date(),
    },
  });
  console.log(`  + manager ${email} (password from SEED_MANAGER_PASSWORD${process.env.SEED_MANAGER_PASSWORD ? '' : ' — DEFAULT, change it'})`);
}

async function seedCompanyProfile() {
  await prisma.companyProfile.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
}

async function main() {
  console.log('Seeding ServiceBay…');
  await seedManager();
  await seedFormDefinition();
  await seedCompanyProfile();
  const counts = {
    users: await prisma.user.count(),
    sections: await prisma.formSection.count(),
    fields: await prisma.formField.count(),
  };
  console.log('Done:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
