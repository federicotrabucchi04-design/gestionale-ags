import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { firebaseConfigurato, firestore } from "./firebase";
import { COLLEZIONI, type NomeCollezione } from "./types";

/** "config" holds the singleton documents "impostazioni" and "accesso". */
export type Collezione = NomeCollezione | "config";

type Documento = { id: string } & Record<string, unknown>;
type Ascoltatore = (docs: Documento[]) => void;

export interface Archivio {
  locale: boolean;
  ascolta(coll: Collezione, cb: Ascoltatore, errore: (e: Error) => void): () => void;
  salva(coll: Collezione, d: Documento): Promise<void>;
  elimina(coll: Collezione, id: string): Promise<void>;
  sostituisciTutto(dati: Partial<Record<Collezione, Documento[]>>): Promise<void>;
}

function pulisci<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const archivioFirebase: Archivio = {
  locale: false,
  ascolta(coll, cb, errore) {
    return onSnapshot(
      collection(firestore(), coll),
      (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      errore,
    );
  },
  async salva(coll, d) {
    const { id, ...resto } = pulisci(d);
    await setDoc(doc(firestore(), coll, id), resto);
  },
  async elimina(coll, id) {
    await deleteDoc(doc(firestore(), coll, id));
  },
  async sostituisciTutto(dati) {
    const db = firestore();
    const operazioni: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
    for (const [coll, docs] of Object.entries(dati) as [Collezione, Documento[]][]) {
      for (const d of docs) {
        const { id, ...resto } = pulisci(d);
        operazioni.push((b) => b.set(doc(db, coll, id), resto));
      }
    }
    for (let i = 0; i < operazioni.length; i += 400) {
      const batch = writeBatch(db);
      operazioni.slice(i, i + 400).forEach((op) => op(batch));
      await batch.commit();
    }
  },
};

const CHIAVE = "gestionale-ags:";
const ascoltatoriLocali = new Map<Collezione, Set<Ascoltatore>>();

function leggiLocale(coll: Collezione): Documento[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CHIAVE + coll) ?? "[]") as Documento[];
  } catch {
    return [];
  }
}

function scriviLocale(coll: Collezione, docs: Documento[]) {
  localStorage.setItem(CHIAVE + coll, JSON.stringify(docs));
  ascoltatoriLocali.get(coll)?.forEach((cb) => cb(docs));
}

const archivioLocale: Archivio = {
  locale: true,
  ascolta(coll, cb) {
    if (!ascoltatoriLocali.has(coll)) ascoltatoriLocali.set(coll, new Set());
    ascoltatoriLocali.get(coll)!.add(cb);
    cb(leggiLocale(coll));
    return () => ascoltatoriLocali.get(coll)?.delete(cb);
  },
  async salva(coll, d) {
    const docs = leggiLocale(coll).filter((x) => x.id !== d.id);
    scriviLocale(coll, [...docs, pulisci(d)]);
  },
  async elimina(coll, id) {
    scriviLocale(
      coll,
      leggiLocale(coll).filter((x) => x.id !== id),
    );
  },
  async sostituisciTutto(dati) {
    for (const [coll, docs] of Object.entries(dati) as [Collezione, Documento[]][]) {
      const esistenti = leggiLocale(coll).filter((x) => !docs.some((d) => d.id === x.id));
      scriviLocale(coll, [...esistenti, ...docs.map(pulisci)]);
    }
  },
};

export const archivio: Archivio = firebaseConfigurato ? archivioFirebase : archivioLocale;

export const TUTTE_LE_COLLEZIONI: Collezione[] = [...COLLEZIONI, "config"];
