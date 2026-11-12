/** Date are ISO strings "YYYY-MM-DD"; amounts are euro as numbers. */

/** Fields written by the archive on every save; never edited by hand. */
export interface Tracciato {
  aggiornatoIl?: number;
  modificatoDa?: string;
  /** Soft delete: the document stays in the bin until it is emptied. */
  eliminato?: boolean;
  eliminatoIl?: number;
}

export interface Fornitore {
  id: string;
  nome: string;
  contatto?: string;
  note?: string;
}

/** "materiale" = tools, wood, decorations: tracked only as informal leftovers, not in the food warehouse. */
export type GenereMateria = "consumo" | "materiale";

export interface MateriaPrima {
  id: string;
  codice: string;
  nome: string;
  um: string;
  attiva: boolean;
  genere?: GenereMateria;
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

/**
 * How a fixed cost is spread over the articles it applies to:
 * "pezzo" same amount per piece, "prezzo" proportional to the selling price,
 * "margine" proportional to the margin before fixed costs.
 */
export type MetodoRiparto = "pezzo" | "prezzo" | "margine";

export interface CostoFisso {
  id: string;
  nome: string;
  costoTotale: number;
  baseRiparto: number;
  articoliIds: string[];
  attivo: boolean;
  metodo?: MetodoRiparto;
  note?: string;
}

export type TipoEvento = "festa" | "bosco" | "cammina" | "natale" | "altro";

export interface Evento {
  id: string;
  nome: string;
  tipo: TipoEvento;
  /** Free label from older versions; kept only for display. */
  tipologia?: string;
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
  /** Expiry date of the leftover returned to the warehouse, for food. */
  scadenza?: string;
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

/** Paid admissions: fixed-menu dinners or walk registrations. */
export interface Ingresso {
  prezzo: number;
  previsti: number;
  /** Sold and paid in advance. */
  prevendite: number;
  /** Sold on the day. */
  venditeGiorno: number;
  /** People actually present (may differ from paid tickets). */
  presenze: number;
}

export interface Premio {
  id: string;
  descrizione: string;
  valore: number;
  /** Donated prizes have no cost; their value is shown only for information. */
  donato: boolean;
}

export interface Lotteria {
  prezzoBiglietto: number;
  bigliettiStampati: number;
  vendutiPrevisti: number;
  vendutiReali: number;
  premi: Premio[];
}

/**
 * bar: menu at list prices. servizio: a meal, "carta" at list prices or "fisso" paid by cover.
 * tappa: food offered at a walk stop (cost only). ingressi: registrations only.
 * lotteria: raffle. materiali: tools and decorations. generica: everything allowed.
 */
export type TipoParte = "bar" | "servizio" | "tappa" | "ingressi" | "lotteria" | "materiali" | "generica";
export type FormulaServizio = "carta" | "fisso";

export interface Parte {
  id: string;
  nome: string;
  tipo: TipoParte;
  formula?: FormulaServizio;
  serataId?: string;
  /** Weight for the shared costs when the edition has no evenings. */
  peso: number;
  menu: RigaMenu[];
  acquisti: RigaAcquisto[];
  costiExtra: CostoExtra[];
  ingresso?: Ingresso;
  lotteria?: Lotteria;
  note?: string;
}

export type FormulaSerata = "bar" | "cenaFissa" | "cenaCarta" | "pranzoCena";

export interface Serata {
  id: string;
  nome: string;
  data: string;
  formula: FormulaSerata;
  peso: number;
}

/** Costs or income shared by the whole edition, split over evenings (or parts) by weight. */
export interface VoceComune {
  id: string;
  descrizione: string;
  tipo: "uscita" | "entrata";
  importoPrevisto: number;
  importoReale: number;
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
  parti: Parte[];
  serate?: Serata[];
  comuni: VoceComune[];
  /** Nativity scene variant for Christmas editions. */
  presepe?: "vivente" | "fermo";
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
  /** Unused since event types became fixed; kept so older backups still load. */
  tipologieEvento?: string[];
  categorieArticolo: string[];
  /** Target margin on price used by the analysis traffic lights (0.4 = 40%). */
  margineObiettivo?: number;
  ultimoBackup?: string;
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
  categorieArticolo: ["Bar", "Cucina", "Altro"],
  margineObiettivo: 0.4,
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
