# ServiceBay — Design lock (v1, 2026-09-10)

Replacement for the client's Firebase "vehicle-service-app". Single garage, multi-user.

## Requirements from the legacy app
- R1 Register an inspection: reg number, km, brand, model, year, gearbox, motive power, drive mode
- R2 Engine checklist (19) and chassis checklist (12), each line Done / Urgent / Later
- R3 Free-text vehicle-scanning line with the same flags
- R4 Four brake-wear percentages (optional)
- R5 Additional info free text
- R6 Records list newest-first; edit; delete with confirmation
- R7 Print one record as A4 report showing only marked items
- R8 Export all records as CSV

## Added requirements
- R9 Login + create account (JWT); new accounts PENDING until a manager approves
- R10 Vehicle history by reg number; vehicle carries owner name / phone / email
- R11 Search & filter records (reg, owner, phone, brand, date)
- R12 Admin form builder: services are data, not code (checklist, single choice, dropdown, multi choice, text, textarea, number)
- R13 Company profile (identity / contact / legal / logo) rendered as the report header
- R14 MANAGER role with full CRUD over everything, ADMIN role for daily work
- R15 Legacy Firestore IDs preserved on imported records

## Design decisions
- D1 Stack: NestJS 10 + Prisma 5 + PostgreSQL 16 · React 19 + Vite + TS + RTK Query + shadcn/ui · Docker Compose + Nginx · Traefik edge on a shared Hetzner box. Dark garage-industrial theme.
- D2 Roles: MANAGER = everything. ADMIN = records (create; view/edit all; delete own), form builder, company profile. Records store createdBy/updatedBy.
- D3 Dynamic form: FormSection → FormField(type, config JSON) → FormFieldOption. Answers in RecordValue(recordId, fieldId, value JSON, labelSnapshot). Fields are deactivated, never deleted; type change blocked once values exist. Vehicle identity columns stay fixed on ServiceRecord/Vehicle.
- D4 Report: sections in order, fields with showInReport and a "selected" value; header from CompanyProfile (blank sections omitted).
- D5 Auth: JWT access (15m) + refresh (7d, hashed in DB), global JwtAuthGuard + RolesGuard, single-flight refresh in RTK Query.
- D6 Repo: backend/ frontend/ infra/ migration/ docs/. Domain lives only in .env / proxy labels.
- D7 Workflow: numbered chunks → tsc + tests + smoke on Kasun's machine → explicit staging → push on authorization → Hetzner after local pass.

## Chunks
1 scaffold+schema+seed · 2 auth+users · 3 form-builder API · 4 vehicles+records+report DTO · 5 legacy import · 6 frontend shell+theme+auth · 7 records table+search+history · 8 inspection form · 9 view/edit/print · 10 admin UIs · 11 CSV, smoke, prod compose, Hetzner runbook
