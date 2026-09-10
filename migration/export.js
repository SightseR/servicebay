// Run in Google Cloud Shell on project vehicle-service-app-1995 (see migration/README.md)
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const fs = require('fs');

initializeApp({ projectId: 'vehicle-service-app-1995' });
const db = getFirestore();

const toPlain = (v) => {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(toPlain);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = toPlain(val);
    return o;
  }
  return v;
};

(async () => {
  const snap = await db.collectionGroup('vehicleServices').get();
  const docs = snap.docs.map((d) => ({
    legacyId: d.id,
    path: d.ref.path,
    createTime: d.createTime.toDate().toISOString(),
    updateTime: d.updateTime.toDate().toISOString(),
    ...toPlain(d.data()),
  }));
  fs.writeFileSync('vehicleServices.json', JSON.stringify(docs, null, 2));
  console.log(`Exported ${docs.length} records`);
  console.log('Paths seen:', [...new Set(docs.map((d) => d.path.replace(/\/[^/]+$/, '')))]);
})();
