/** Date are ISO strings "YYYY-MM-DD"; amounts are euro as numbers. */

export interface Fornitore {
  id: string;
  nome: string;
  contatto?: string;
  note?: string;
}

export interface MateriaPrima {
  id: string;
  codice: string;
  nome: string;
  um: string;
  attiva: boolean;
  note?: string;
}

/** Cost of a raw material from a given date onwards. The latest validoDal <= date wins. */
export interface PrezzoMP {
  id: string;
  mpId: string;
  fornitoreId?: string;
  validoDal: string;
  costoLotto: number;
  qtaLotto: number;
  note?: string;
}

export interface RigaRicetta {
  mpId: string;
  qta: number;
  note?: string;
}

export interface Articolo {
  id: string;
  codice: string;
  nome: string;
  categoria: string;
  um: string;
  attivo: boolean;
  ricetta: RigaRicetta[];
  note?: string;
}

export interface Listino {
  id: string;
  nome: string;
  validoDal: string;
  prezzi: Record<string, number>;
  note?: string;
}

export interface CostoFisso {
  id: string;
  nome: string;
  costoTotale: number;
  baseRiparto: number;
  articoliIds: string[];
  attivo: boolean;
  note?: string;
}

export interface Evento {
  id: string;
  nome: string;
  tipologia: string;
  descrizione?: string;
  archiviato?: boolean;
}

export type StatoEdizione = "pianificata" | "conclusa" | "chiusa";

export interface RigaMenu {
  id: string;
  articoloId: string;
  qtaPrevista: number;
  qtaReale: number;
  /** Set when the edition is closed, so later recipe or price edits do not change history. */
  prezzoFissato?: number;
  costoFissato?: number;
}

export interface RigaAcquisto {
  id: string;
  mpId: string;
  lottiPrevisti: number;
  lottiReali: number;
  /** Quantity (in the raw material unit) taken from the warehouse. */
  daMagazzino: number;
  /** Leftover quantity returned to the warehouse. */
  rimanenza: number;
  note?: string;
}

export interface CostoExtra {
  id: string;
  descrizione: string;
  importoPrevisto: number;
  importoReale: number;
  /** Spread over the pieces sold; otherwise counted only in the edition total. */
  ripartisci: boolean;
}

export interface Edizione {
  id: string;
  eventoId: string;
  nome: string;
  data: string;
  listinoId?: string;
  partecipantiPrevisti?: number;
  partecipantiReali?: number;
  stato: StatoEdizione;
  note?: string;
  menu: RigaMenu[];
  acquisti: RigaAcquisto[];
  costiExtra: CostoExtra[];
}

export type TipoMovimento = "entrata" | "uscita";
export type StatoMovimento = "previsto" | "ufficiale";

export interface Movimento {
  id: string;
  data: string;
  descrizione: string;
  tipo: TipoMovimento;
  importo: number;
  stato: StatoMovimento;
  categoria: string;
  edizioneId?: string;
  fornitoreId?: string;
  note?: string;
}

export type TipoInventario = "conteggio" | "carico" | "scarico";

export interface VoceInventario {
  id: string;
  mpId: string;
  data: string;
  tipo: TipoInventario;
  quantita: number;
  note?: string;
}

export interface Impostazioni {
  id: "impostazioni";
  /** Opening cash balance forced for a social year, e.g. { "2026/27": 11 }. */
  saldiApertura: Record<string, number>;
  categorieMovimento: string[];
  tipologieEvento: string[];
  categorieArticolo: string[];
}

export interface Accesso {
  id: "accesso";
  emails: string[];
}

export interface Dati {
  fornitori: Fornitore[];
  materiePrime: MateriaPrima[];
  prezziMP: PrezzoMP[];
  articoli: Articolo[];
  listini: Listino[];
  costiFissi: CostoFisso[];
  eventi: Evento[];
  edizioni: Edizione[];
  movimenti: Movimento[];
  inventario: VoceInventario[];
  impostazioni: Impostazioni;
  accesso: Accesso;
}

export type NomeCollezione = Exclude<keyof Dati, "impostazioni" | "accesso">;

export const COLLEZIONI: NomeCollezione[] = [
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

export const EMAIL_PROPRIETARIO = "federico.trabucchi04@gmail.com";

export const IMPOSTAZIONI_DEFAULT: Impostazioni = {
  id: "impostazioni",
  saldiApertura: {},
  categorieMovimento: [
    "Incassi evento",
    "Fornitori",
    "Musica e servizi",
    "Bollette",
    "Fondo sede",
    "Tesseramento",
    "Pulizie",
    "Entrate straordinarie",
    "Altro",
  ],
  tipologieEvento: ["Festa con bar", "Cena e musica", "Camminata", "Altro"],
  categorieArticolo: ["Bar", "Cucina", "Altro"],
};

export const ACCESSO_DEFAULT: Accesso = { id: "accesso", emails: [EMAIL_PROPRIETARIO] };

export const DATI_VUOTI: Dati = {
  fornitori: [],
  materiePrime: [],
  prezziMP: [],
  articoli: [],
  listini: [],
  costiFissi: [],
  eventi: [],
  edizioni: [],
  movimenti: [],
  inventario: [],
  impostazioni: IMPOSTAZIONI_DEFAULT,
  accesso: ACCESSO_DEFAULT,
};
