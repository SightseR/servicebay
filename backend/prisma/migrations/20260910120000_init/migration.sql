-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "Gearbox" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "MotivePower" AS ENUM ('PETROL', 'DIESEL', 'GAS', 'HYBRID', 'PHEV', 'HEV');

-- CreateEnum
CREATE TYPE "DriveMode" AS ENUM ('FRONT', 'REAR', 'FOUR_WD');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('CHECKLIST', 'SINGLE_CHOICE', 'DROPDOWN', 'MULTI_CHOICE', 'TEXT', 'TEXTAREA', 'NUMBER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "refreshTokenHash" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "regNumber" TEXT NOT NULL,
    "regKey" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "gearbox" "Gearbox",
    "motivePower" "MotivePower",
    "driveMode" "DriveMode",
    "ownerName" TEXT,
    "ownerPhone" TEXT,
    "ownerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "showInReport" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormFieldOption" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FormFieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kilometers" INTEGER,
    "gearbox" "Gearbox",
    "motivePower" "MotivePower",
    "driveMode" "DriveMode",
    "servicedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedById" TEXT,
    "legacyId" TEXT,
    "legacyUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordValue" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "labelSnapshot" TEXT NOT NULL,

    CONSTRAINT "RecordValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT,
    "tagline" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "businessId" TEXT,
    "vatId" TEXT,
    "logoPath" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_regKey_key" ON "Vehicle"("regKey");

-- CreateIndex
CREATE INDEX "Vehicle_ownerName_idx" ON "Vehicle"("ownerName");

-- CreateIndex
CREATE INDEX "Vehicle_ownerPhone_idx" ON "Vehicle"("ownerPhone");

-- CreateIndex
CREATE INDEX "Vehicle_brand_idx" ON "Vehicle"("brand");

-- CreateIndex
CREATE INDEX "FormSection_sortOrder_idx" ON "FormSection"("sortOrder");

-- CreateIndex
CREATE INDEX "FormField_sectionId_sortOrder_idx" ON "FormField"("sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "FormFieldOption_fieldId_sortOrder_idx" ON "FormFieldOption"("fieldId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRecord_legacyId_key" ON "ServiceRecord"("legacyId");

-- CreateIndex
CREATE INDEX "ServiceRecord_vehicleId_servicedAt_idx" ON "ServiceRecord"("vehicleId", "servicedAt" DESC);

-- CreateIndex
CREATE INDEX "ServiceRecord_servicedAt_idx" ON "ServiceRecord"("servicedAt" DESC);

-- CreateIndex
CREATE INDEX "RecordValue_fieldId_idx" ON "RecordValue"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordValue_recordId_fieldId_key" ON "RecordValue"("recordId", "fieldId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "FormSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldOption" ADD CONSTRAINT "FormFieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordValue" ADD CONSTRAINT "RecordValue_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ServiceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordValue" ADD CONSTRAINT "RecordValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
