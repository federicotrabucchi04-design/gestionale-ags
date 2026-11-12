import type {
  Dati,
  Edizione,
  Evento,
  FormulaSerata,
  Ingresso,
  Lotteria,
  MateriaPrima,
  Parte,
  RigaAcquisto,
  RigaMenu,
  Serata,
  TipoEvento,
  TipoParte,
  CostoExtra,
  VoceComune,
} from "./types";

function id(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Macrogruppi di evento
// ---------------------------------------------------------------------------

export const TIPI_EVENTO: Record<TipoEvento, { etichetta: string; descrizione: string }> = {
  festa: { etichetta: "Festa con bar e musica", descrizione: "Bar con menu a listino, acquisti e costi della serata" },
  bosco: {
    etichetta: "Festa del Bosco",
    descrizione: "Più serate (solo bar, cena a menu fisso o alla carta, pranzo e cena), lotteria e costi comuni ripartiti a pesi",
  },
  cammina: { etichetta: "Cammina e Spizzigola", descrizione: "Quota d'iscrizione unica, tappe con menu offerto e bar" },
  natale: { etichetta: "Natale/Capodanno", descrizione: "Presepe (vivente o fermo), albero e capodanno" },
  altro: { etichetta: "Altri eventi", descrizione: "Struttura libera: vendite, acquisti, ingressi e movimenti" },
};

export const ORDINE_TIPI_EVENTO: TipoEvento[] = ["festa", "bosco", "cammina", "natale", "altro"];

export function tipoDaTipologia(tipologia: string | undefined, nome = ""): TipoEvento {
  const t = `${tipologia ?? ""} ${nome}`.toLowerCase();
  if (t.includes("bosco")) return "bosco";
  if (t.includes("cammin") || t.includes("spizz") || t.includes("spizig")) return "cammina";
  if (t.includes("natal") || t.includes("capodanno") || t.includes("presepe")) return "natale";
  if (t.includes("festa") || t.includes("bar")) return "festa";
  return "altro";
}

// ---------------------------------------------------------------------------
// Parti
// ---------------------------------------------------------------------------

export const TIPI_PARTE: Record<TipoParte, { etichetta: string; descrizione: string }> = {
  bar: { etichetta: "Bar", descrizione: "Vendite a listino" },
  servizio: { etichetta: "Servizio pasto", descrizione: "Pranzo o cena, alla carta o a menu fisso con prevendite" },
  tappa: { etichetta: "Tappa", descrizione: "Menu offerto ai partecipanti: conta solo il costo" },
  ingressi: { etichetta: "Iscrizioni", descrizione: "Quote d'iscrizione o biglietti d'ingresso" },
  lotteria: { etichetta: "Lotteria", descrizione: "Biglietti venduti e premi" },
  materiali: { etichetta: "Materiali", descrizione: "Attrezzi, legno, addobbi: costi, utilizzo e avanzi informali" },
  generica: { etichetta: "Generica", descrizione: "Vendite, acquisti, ingressi e costi liberi" },
};

export interface Capacita {
  /** "listino": priced from the price list; "offerto": cost only; null: no menu. */
  menu: "listino" | "offerto" | null;
  acquisti: boolean;
  ingresso: boolean;
  lotteria: boolean;
}

export function capacita(p: Pick<Parte, "tipo" | "formula" | "ingresso">): Capacita {
  switch (p.tipo) {
    case "bar":
      return { menu: "listino", acquisti: true, ingresso: false, lotteria: false };
    case "servizio":
      return p.formula === "fisso"
        ? { menu: "offerto", acquisti: true, ingresso: true, lotteria: false }
        : { menu: "listino", acquisti: true, ingresso: false, lotteria: false };
    case "tappa":
      return { menu: "offerto", acquisti: true, ingresso: false, lotteria: false };
    case "ingressi":
      return { menu: null, acquisti: false, ingresso: true, lotteria: false };
    case "lotteria":
      return { menu: null, acquisti: false, ingresso: false, lotteria: true };
    case "materiali":
      return { menu: null, acquisti: true, ingresso: false, lotteria: false };
    default:
      return { menu: "listino", acquisti: true, ingresso: true, lotteria: false };
  }
}

export const FORMULE_SERATA: Record<FormulaSerata, string> = {
  bar: "Solo bar e musica",
  cenaFissa: "Cena a menu fisso + bar",
  cenaCarta: "Cena alla carta + bar",
  pranzoCena: "Pranzo e cena alla carta + bar",
};

export function ingressoVuoto(prezzo = 0): Ingresso {
  return { prezzo, previsti: 0, prevendite: 0, venditeGiorno: 0, presenze: 0 };
}

export function lotteriaVuota(): Lotteria {
  return { prezzoBiglietto: 1, bigliettiStampati: 0, vendutiPrevisti: 0, vendutiReali: 0, premi: [] };
}

export function nuovaParte(tipo: TipoParte, nome: string, extra: Partial<Parte> = {}): Parte {
  const p: Parte = { id: id(), nome, tipo, peso: 1, menu: [], acquisti: [], costiExtra: [], ...extra };
  if (capacita(p).ingresso && !p.ingresso && tipo !== "generica") p.ingresso = ingressoVuoto();
  if (tipo === "lotteria" && !p.lotteria) p.lotteria = lotteriaVuota();
  return p;
}

export function partiSerata(s: Serata): Parte[] {
  const conSerata = (p: Parte) => ({ ...p, serataId: s.id });
  switch (s.formula) {
    case "cenaFissa":
      return [nuovaParte("servizio", "Cena a menu fisso", { formula: "fisso" }), nuovaParte("bar", "Bar dopo cena")].map(conSerata);
    case "cenaCarta":
      return [nuovaParte("servizio", "Cena alla carta", { formula: "carta" }), nuovaParte("bar", "Bar dopo cena")].map(conSerata);
    case "pranzoCena":
      return [
        nuovaParte("servizio", "Pranzo alla carta", { formula: "carta" }),
        nuovaParte("servizio", "Cena alla carta", { formula: "carta" }),
        nuovaParte("bar", "Bar"),
      ].map(conSerata);
    default:
      return [nuovaParte("bar", "Bar e musica")].map(conSerata);
  }
}

function aggiungiGiorni(data: string, giorni: number): string {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
}

export interface OpzioniStruttura {
  serate?: { nome: string; data: string; formula: FormulaSerata }[];
  tappe?: number;
  presepe?: "vivente" | "fermo";
  lotteria?: boolean;
}

export function serateDefault(data: string): NonNullable<OpzioniStruttura["serate"]> {
  return [
    { nome: "Venerdì", data, formula: "bar" },
    { nome: "Sabato", data: aggiungiGiorni(data, 1), formula: "cenaFissa" },
    { nome: "Domenica", data: aggiungiGiorni(data, 2), formula: "pranzoCena" },
    { nome: "Lunedì", data: aggiungiGiorni(data, 3), formula: "cenaCarta" },
  ];
}

/** Typical structure of a brand new edition, used when there is no previous edition to copy. */
export function strutturaBase(tipo: TipoEvento, data: string, op: OpzioniStruttura = {}): Pick<Edizione, "parti" | "serate" | "presepe"> {
  switch (tipo) {
    case "bosco": {
      const serate: Serata[] = (op.serate ?? serateDefault(data)).map((s) => ({ id: id(), peso: 1, ...s }));
      const parti = serate.flatMap(partiSerata);
      if (op.lotteria !== false) parti.push(nuovaParte("lotteria", "Lotteria", { peso: 0 }));
      return { parti, serate };
    }
    case "cammina": {
      const n = Math.max(1, op.tappe ?? 5);
      return {
        parti: [
          nuovaParte("ingressi", "Iscrizioni", { peso: 0 }),
          ...Array.from({ length: n }, (_, i) => nuovaParte("tappa", `Tappa ${i + 1}`)),
          nuovaParte("bar", "Bar"),
        ],
      };
    }
    case "natale":
      return {
        presepe: op.presepe ?? "fermo",
        parti: [nuovaParte("materiali", "Presepe"), nuovaParte("materiali", "Albero di Natale"), nuovaParte("generica", "Capodanno")],
      };
    case "altro":
      return { parti: [nuovaParte("generica", "Generale")] };
    default:
      return { parti: [nuovaParte("bar", "Bar")] };
  }
}

// ---------------------------------------------------------------------------
// Copia dell'edizione precedente
// ---------------------------------------------------------------------------

export interface OpzioniCopia {
  menu: boolean;
  acquisti: boolean;
  extra: boolean;
}

function giorniTra(da: string, a: string): number {
  return Math.round((new Date(`${a}T12:00:00`).getTime() - new Date(`${da}T12:00:00`).getTime()) / 86400000);
}

/**
 * Copies structure and plans of a previous edition: last real quantities become the new forecasts,
 * real values are cleared, evening dates move with the edition date.
 */
export function copiaStruttura(prec: Edizione, nuovaData: string, op: OpzioniCopia): Pick<Edizione, "parti" | "serate" | "comuni" | "presepe"> {
  const spost = giorniTra(prec.data, nuovaData);
  const mappaSerate = new Map<string, string>();
  const serate = prec.serate?.map((s) => {
    const nuovoId = id();
    mappaSerate.set(s.id, nuovoId);
    return { ...s, id: nuovoId, data: s.data ? aggiungiGiorni(s.data, spost) : nuovaData };
  });
  const menu = (r: RigaMenu): RigaMenu => ({ id: id(), articoloId: r.articoloId, qtaPrevista: r.qtaReale || r.qtaPrevista || 0, qtaReale: 0 });
  const acq = (r: RigaAcquisto): RigaAcquisto => ({
    id: id(),
    mpId: r.mpId,
    lottiPrevisti: r.lottiReali || r.lottiPrevisti || 0,
    lottiReali: 0,
    daMagazzino: 0,
    rimanenza: 0,
  });
  const extra = (c: CostoExtra): CostoExtra => ({
    id: id(),
    descrizione: c.descrizione,
    importoPrevisto: c.importoReale || c.importoPrevisto || 0,
    importoReale: 0,
    ripartisci: c.ripartisci,
  });
  const parti = prec.parti.map((p): Parte => ({
    ...p,
    id: id(),
    serataId: p.serataId ? mappaSerate.get(p.serataId) : undefined,
    menu: op.menu ? p.menu.map(menu) : [],
    acquisti: op.acquisti ? p.acquisti.map(acq) : [],
    costiExtra: op.extra ? p.costiExtra.map(extra) : [],
    ingresso: p.ingresso
      ? { ...ingressoVuoto(p.ingresso.prezzo), previsti: p.ingresso.prevendite + p.ingresso.venditeGiorno || p.ingresso.previsti }
      : undefined,
    lotteria: p.lotteria
      ? {
          ...p.lotteria,
          vendutiPrevisti: p.lotteria.vendutiReali || p.lotteria.vendutiPrevisti,
          vendutiReali: 0,
          premi: p.lotteria.premi.map((x) => ({ ...x, id: id() })),
        }
      : undefined,
  }));
  const comuni: VoceComune[] = op.extra
    ? prec.comuni.map((c) => ({ ...c, id: id(), importoPrevisto: c.importoReale || c.importoPrevisto, importoReale: 0 }))
    : [];
  return { parti, serate, comuni, presepe: prec.presepe };
}

// ---------------------------------------------------------------------------
// Normalizzazione dei dati salvati con versioni precedenti
// ---------------------------------------------------------------------------

type EdizioneVecchia = Partial<Edizione> & { menu?: RigaMenu[]; acquisti?: RigaAcquisto[]; costiExtra?: CostoExtra[] };

export function normalizzaParte(p: Partial<Parte>, i: number, edId: string): Parte {
  return {
    ...p,
    id: p.id ?? `${edId}-p${i + 1}`,
    nome: p.nome ?? "Parte",
    tipo: p.tipo ?? "bar",
    peso: typeof p.peso === "number" ? p.peso : 1,
    menu: p.menu ?? [],
    acquisti: p.acquisti ?? [],
    costiExtra: p.costiExtra ?? [],
  } as Parte;
}

/** Older editions had a single menu, purchase list and extra costs: they become one "Bar" part. */
export function normalizzaEdizione(raw: EdizioneVecchia): Edizione {
  const { menu, acquisti, costiExtra, ...resto } = raw;
  const edId = raw.id ?? "ed";
  const parti = Array.isArray(raw.parti)
    ? raw.parti.map((p, i) => normalizzaParte(p, i, edId))
    : [normalizzaParte({ nome: "Bar", tipo: "bar", menu, acquisti, costiExtra }, 0, edId)];
  return { stato: "pianificata", ...resto, parti, comuni: raw.comuni ?? [] } as Edizione;
}

export function normalizzaEvento(raw: Partial<Evento>): Evento {
  return { ...raw, tipo: raw.tipo ?? tipoDaTipologia(raw.tipologia, raw.nome) } as Evento;
}

export function normalizzaMateria(raw: MateriaPrima): MateriaPrima {
  return raw.genere ? raw : { ...raw, genere: "consumo" };
}

/** Brings documents of any collection, as read from storage or a backup, to the current shape. */
export function normalizzaCollezione(coll: string, docs: unknown[]): never[] {
  if (coll === "edizioni") return docs.map((d) => normalizzaEdizione(d as EdizioneVecchia)) as never[];
  if (coll === "eventi") return docs.map((d) => normalizzaEvento(d as Partial<Evento>)) as never[];
  if (coll === "materiePrime") return docs.map((d) => normalizzaMateria(d as MateriaPrima)) as never[];
  return docs as never[];
}

export function normalizzaDati<T extends Partial<Dati>>(d: T): T {
  const out = { ...d } as Record<string, unknown>;
  for (const k of ["edizioni", "eventi", "materiePrime"] as const) {
    if (Array.isArray(d[k])) out[k] = normalizzaCollezione(k, d[k]);
  }
  return out as T;
}

// ---------------------------------------------------------------------------
// Accesso comodo a righe di tutte le parti
// ---------------------------------------------------------------------------

export function righeMenu(ed: Pick<Edizione, "parti">): RigaMenu[] {
  return ed.parti.flatMap((p) => p.menu);
}

export function righeAcquisto(ed: Pick<Edizione, "parti">): (RigaAcquisto & { parteId: string; parteNome: string })[] {
  return ed.parti.flatMap((p) => p.acquisti.map((a) => ({ ...a, parteId: p.id, parteNome: p.nome })));
}

/** Screens of an edition: one per evening (grouping its parts) plus one per part outside evenings. */
export interface Schermata {
  id: string;
  nome: string;
  serata?: Serata;
  parti: Parte[];
}

export function schermate(ed: Pick<Edizione, "parti" | "serate">): Schermata[] {
  const out: Schermata[] = [];
  for (const s of ed.serate ?? []) out.push({ id: s.id, nome: s.nome, serata: s, parti: ed.parti.filter((p) => p.serataId === s.id) });
  for (const p of ed.parti) if (!p.serataId || !ed.serate?.some((s) => s.id === p.serataId)) out.push({ id: p.id, nome: p.nome, parti: [p] });
  return out;
}
