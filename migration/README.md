# Legacy data migration (Firebase → ServiceBay)

## 1. Export (Google Cloud Shell, project vehicle-service-app-1995)
```
mkdir export && cd export && npm init -y && npm i firebase-admin
npm install-scripts approve @firebase/util protobufjs && npm rebuild
# paste export.js
gcloud auth application-default login          # Cloud Shell VM token is rejected by Firestore
GOOGLE_APPLICATION_CREDENTIALS=<path printed by gcloud> node export.js
cloudshell download vehicleServices.json
gcloud auth application-default revoke
```
Last export: 2026-09-09, 49 records, single path `artifacts/default-app-id/public/data/vehicleServices`.

## 2. Import (Chunk 5)
Runs on the host against the compose Postgres (port 5433). Seed must have run first (form fields are matched by `config.legacyKey`).
```
cd backend
DATABASE_URL=postgresql://servicebay:servicebay@localhost:5433/servicebay_db npm run legacy:import -- ../migration/vehicleServices.json --dry-run
DATABASE_URL=postgresql://servicebay:servicebay@localhost:5433/servicebay_db npm run legacy:import -- ../migration/vehicleServices.json
```
Idempotent by `legacyId`; re-run for the cutover delta. Values are normalised by the same code the API uses (`src/records/record-values.ts`).
Expected for the 2026-09-09 export: 49 records, 24 vehicles, 156 values.

`legacy-import.pg.js` targeted the interim flat schema and is kept for reference only.

`vehicleServices.json` is git-ignored. Keep the raw file as the untouched master until client UAT is complete.
