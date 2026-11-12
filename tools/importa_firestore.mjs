/**
 * Imports a Gestionale AGS backup JSON into Firestore (merge by document id).
 * Usage: node tools/importa_firestore.mjs ../../_import/ags-da-excel.json
 *        node tools/importa_firestore.mjs ../../_import/ags-demo-anni.json
 *
 * Uses Application Default Credentials from `firebase login` / gcloud, or
 * GOOGLE_APPLICATION_CREDENTIALS. Falls back to the Firebase CLI token.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const file = process.argv[2];
if (!file) {
  console.error("Uso: node tools/importa_firestore.mjs <backup.json>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(resolve(file), "utf8"));
const dati = raw.app === "gestionale-ags" ? raw.dati : raw;
const COLLEZIONI = ["fornitori", "materiePrime", "prezziMP", "articoli", "listini", "costiFissi", "eventi", "edizioni", "movimenti", "inventario"];

if (!getApps().length) {
  try {
    initializeApp({ credential: applicationDefault(), projectId: "gestionale-ags" });
  } catch {
    // firebase-tools stores a refresh token; admin SDK needs a service account for server writes.
    console.error(
      "Serve un account di servizio. Crea un JSON in Firebase Console → Impostazioni progetto → Account di servizio,\n" +
        "poi: $env:GOOGLE_APPLICATION_CREDENTIALS='C:\\path\\sa.json'; node tools/importa_firestore.mjs ...",
    );
    process.exit(1);
  }
}

const db = getFirestore();
let scritti = 0;

async function batchWrite(coll, docs) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const d of docs.slice(i, i + 400)) {
      if (!d?.id) continue;
      const { id, ...resto } = d;
      batch.set(db.collection(coll).doc(id), resto, { merge: true });
      scritti++;
    }
    await batch.commit();
  }
}

for (const coll of COLLEZIONI) {
  if (!Array.isArray(dati[coll]) || !dati[coll].length) continue;
  console.log(`${coll}: ${dati[coll].length}`);
  await batchWrite(coll, dati[coll]);
}

if (dati.impostazioni) {
  const { id, ...resto } = { id: "impostazioni", ...dati.impostazioni };
  // Merge opening balances; do not wipe categories with empty arrays from demo.
  const patch = { ...resto };
  if (Array.isArray(patch.categorieMovimento) && patch.categorieMovimento.length === 0) delete patch.categorieMovimento;
  if (Array.isArray(patch.categorieArticolo) && patch.categorieArticolo.length === 0) delete patch.categorieArticolo;
  await db.collection("config").doc("impostazioni").set(patch, { merge: true });
  scritti++;
  console.log("config/impostazioni: ok");
}
if (dati.accesso) {
  await db.collection("config").doc("accesso").set({ emails: dati.accesso.emails ?? [] }, { merge: true });
  scritti++;
}

console.log(`Fatto: ${scritti} documenti scritti/aggiornati.`);
