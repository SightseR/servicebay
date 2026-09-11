-- Add new bilingual columns (nullable first, so this is safe on tables with existing rows)
ALTER TABLE "FormSection" ADD COLUMN "titleEn" TEXT;
ALTER TABLE "FormSection" ADD COLUMN "titleIt" TEXT;
ALTER TABLE "FormField" ADD COLUMN "labelEn" TEXT;
ALTER TABLE "FormField" ADD COLUMN "labelIt" TEXT;
ALTER TABLE "FormFieldOption" ADD COLUMN "labelEn" TEXT;
ALTER TABLE "FormFieldOption" ADD COLUMN "labelIt" TEXT;
ALTER TABLE "RecordValue" ADD COLUMN "labelSnapshotEn" TEXT;
ALTER TABLE "RecordValue" ADD COLUMN "labelSnapshotIt" TEXT;

-- Backfill: existing text was English (the legacy app and initial seed were English-only)
UPDATE "FormSection" SET "titleEn" = "title";
UPDATE "FormField" SET "labelEn" = "label";
UPDATE "FormFieldOption" SET "labelEn" = "label";
UPDATE "RecordValue" SET "labelSnapshotEn" = "labelSnapshot";

-- Now that every row has an English value, make it required
ALTER TABLE "FormSection" ALTER COLUMN "titleEn" SET NOT NULL;
ALTER TABLE "FormField" ALTER COLUMN "labelEn" SET NOT NULL;
ALTER TABLE "FormFieldOption" ALTER COLUMN "labelEn" SET NOT NULL;
ALTER TABLE "RecordValue" ALTER COLUMN "labelSnapshotEn" SET NOT NULL;

-- Drop the old single-language columns
ALTER TABLE "FormSection" DROP COLUMN "title";
ALTER TABLE "FormField" DROP COLUMN "label";
ALTER TABLE "FormFieldOption" DROP COLUMN "label";
ALTER TABLE "RecordValue" DROP COLUMN "labelSnapshot";
