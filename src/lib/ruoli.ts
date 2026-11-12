import { EMAIL_PROPRIETARIO, type Accesso, type NomeCollezione, type Ruolo } from "./types";

export const ETICHETTE_RUOLO: Record<Ruolo, string> = {
  lettura: "Solo lettura",
  cassa: "Cassa ed eventi",
  admin: "Amministratore",
};

export function normalizzaEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Soft role for the signed-in user. Owner is always admin. */
export function ruoloDi(email: string | undefined | null, accesso: Accesso): Ruolo {
  if (!email) return "lettura";
  const e = normalizzaEmail(email);
  if (e === EMAIL_PROPRIETARIO) return "admin";
  const esplicito = accesso.ruoli?.[e];
  if (esplicito) return esplicito;
  if (accesso.emails.map(normalizzaEmail).includes(e)) return "cassa";
  return "lettura";
}

const COLLEZIONI_CASSA: NomeCollezione[] = ["movimenti", "edizioni", "inventario", "eventi"];

export function puoScrivereCollezione(ruolo: Ruolo, coll: NomeCollezione): boolean {
  if (ruolo === "admin") return true;
  if (ruolo === "lettura") return false;
  return COLLEZIONI_CASSA.includes(coll);
}

export function puoGestireImpostazioni(ruolo: Ruolo) {
  return ruolo === "admin";
}

export function puoGestireUtenti(ruolo: Ruolo) {
  return ruolo === "admin";
}
