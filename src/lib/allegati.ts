import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { firebaseConfigurato, firebaseStorage } from "./firebase";
import type { AllegatoMovimento } from "./types";

const MAX_LOCALE = 450_000; // ~450 KB as data URL stays under Firestore doc limits
const MAX_CLOUD = 8_000_000; // 8 MB

function sanitizzaNome(nome: string) {
  return nome.replace(/[^\w.\- ()àèéìòù]+/gi, "_").slice(0, 120) || "scontrino";
}

async function comeDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Lettura file non riuscita"));
    r.readAsDataURL(file);
  });
}

/** Uploads a receipt to Firebase Storage, or embeds a small file locally when offline / local mode. */
export async function caricaAllegato(file: File, movimentoId: string): Promise<AllegatoMovimento> {
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    throw new Error("Usa una foto (JPG/PNG) o un PDF dello scontrino");
  }
  if (file.size > MAX_CLOUD) throw new Error("File troppo grande (max 8 MB)");

  const nome = sanitizzaNome(file.name);

  if (firebaseConfigurato) {
    try {
      const path = `movimenti/${movimentoId}/${Date.now()}-${nome}`;
      const r = ref(firebaseStorage(), path);
      await uploadBytes(r, file, { contentType: file.type });
      const url = await getDownloadURL(r);
      return { nome, contentType: file.type, size: file.size, path, url };
    } catch {
      // Fall through to data URL when Storage is unavailable (rules not deployed, local).
    }
  }

  if (file.size > MAX_LOCALE) {
    throw new Error("In modalità locale lo scontrino deve essere sotto i 450 KB (comprimi la foto)");
  }
  const url = await comeDataUrl(file);
  return { nome, contentType: file.type, size: file.size, url };
}

export async function eliminaAllegatoStorage(a: AllegatoMovimento | undefined) {
  if (!a?.path || !firebaseConfigurato) return;
  try {
    await deleteObject(ref(firebaseStorage(), a.path));
  } catch {
    /* already gone */
  }
}
