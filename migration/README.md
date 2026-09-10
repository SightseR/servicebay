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

## 2. Import
`legacy-import.pg.js` targets the interim flat schema and is kept for reference only.
The Prisma-based importer for the dynamic form model lands in Chunk 5 (`legacy-import.ts`).

`vehicleServices.json` is git-ignored. Keep the raw file as the untouched master until client UAT is complete.
