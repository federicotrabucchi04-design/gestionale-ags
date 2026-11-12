/**
 * Adds an authorized domain to Firebase Authentication (Identity Toolkit).
 * Usage: node tools/aggiungi_dominio_auth.mjs gestionale-ags.vercel.app
 *
 * Needs Application Default Credentials with cloud-platform or firebase scope:
 *   gcloud auth application-default login
 * or GOOGLE_APPLICATION_CREDENTIALS pointing at a service account JSON.
 */
import { GoogleAuth } from "google-auth-library";
import { createRequire } from "node:module";

const domain = process.argv[2];
const projectId = process.argv[3] || "gestionale-ags";
if (!domain) {
  console.error("Uso: node tools/aggiungi_dominio_auth.mjs <dominio> [projectId]");
  process.exit(1);
}

async function bearer() {
  try {
    const auth = new GoogleAuth({
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/firebase",
        "https://www.googleapis.com/auth/identitytoolkit",
      ],
    });
    const client = await auth.getClient();
    const tok = await client.getAccessToken();
    if (tok?.token) return tok.token;
  } catch {
    /* fall through to firebase-tools login */
  }
  try {
    const require = createRequire(import.meta.url);
    const { getAccessToken } = require("firebase-tools/lib/auth");
    const token = await getAccessToken();
    if (token) return token;
  } catch (e) {
    console.error("Nessuna credenziale ADC/gcloud né login firebase-tools:", e.message);
  }
  console.error(
    "Esegui prima: gcloud auth application-default login\n" +
      "oppure: npx firebase login\n" +
      "oppure imposta GOOGLE_APPLICATION_CREDENTIALS su un service account.",
  );
  process.exit(1);
}

const token = await bearer();
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "x-goog-user-project": projectId,
};
const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
const get = await fetch(url, { headers });
if (!get.ok) {
  console.error(`GET config fallito: ${get.status} ${await get.text()}`);
  process.exit(1);
}
const cfg = await get.json();
const existing = cfg.authorizedDomains ?? [];
if (existing.includes(domain)) {
  console.log(`Già presente: ${domain}`);
  console.log(existing.join("\n"));
  process.exit(0);
}
const authorizedDomains = [...existing, domain];
const patch = await fetch(`${url}?updateMask=authorizedDomains`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ authorizedDomains }),
});
if (!patch.ok) {
  console.error(`PATCH fallito: ${patch.status} ${await patch.text()}`);
  process.exit(1);
}
const updated = await patch.json();
console.log("Aggiornato:");
console.log((updated.authorizedDomains ?? authorizedDomains).join("\n"));
