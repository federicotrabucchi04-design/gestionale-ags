/**
 * Exports all Gestionale AGS Firestore data to a backup JSON
 * compatible with Impostazioni → Importa.
 *
 * Usage (local):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\sa.json'
 *   node tools/backup_firestore.mjs
 *
 * In GitHub Actions the workflow writes the secret to /tmp/sa.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT = process.env.FIREBASE_PROJECT_ID || "gestionale-ags";
const COLLEZIONI = [
  "fornitori",
  "materiePrime",
  "prezziMP",
  "articoli",
  "listini",
  "costiFissi",
  "eventi",
  "edizioni",
  "movimenti",
  "inventario",
];

function credenziale() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const json = JSON.parse(raw);
    return cert(json);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  throw new Error(
    "Imposta FIREBASE_SERVICE_ACCOUNT (JSON) oppure GOOGLE_APPLICATION_CREDENTIALS.",
  );
}

if (!getApps().length) {
  initializeApp({ credential: credenziale(), projectId: PROJECT });
}

const db = getFirestore();
const dati = {};

async function leggi(coll) {
  const snap = await db.collection(coll).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

for (const coll of COLLEZIONI) {
  dati[coll] = await leggi(coll);
  console.log(`${coll}: ${dati[coll].length}`);
}

const impostazioni = await db.collection("config").doc("impostazioni").get();
if (impostazioni.exists) dati.impostazioni = { id: "impostazioni", ...impostazioni.data() };

const accesso = await db.collection("config").doc("accesso").get();
if (accesso.exists) dati.accesso = accesso.data();

const oggi = new Date().toISOString().slice(0, 10);
const outDir = join(process.cwd(), "backups");
mkdirSync(outDir, { recursive: true });
const file = {
  app: "gestionale-ags",
  versione: 1,
  creato: new Date().toISOString(),
  dati,
};
const path = join(outDir, `gestionale-ags-${oggi}.json`);
writeFileSync(path, JSON.stringify(file, null, 2));
writeFileSync(join(outDir, "ultimo.txt"), `Ultimo backup: ${file.creato}\nFile: ${path}\n`);
console.log(`Scritto ${path}`);
