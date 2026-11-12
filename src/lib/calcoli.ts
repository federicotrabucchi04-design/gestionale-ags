import { capacita, righeMenu, schermate } from "./modelli";
import type {
  Articolo,
  CostoFisso,
  Dati,
  Edizione,
  Impostazioni,
  Listino,
  MateriaPrima,
  MetodoRiparto,
  Movimento,
  Parte,
  PrezzoMP,
  RigaAcquisto,
  RigaMenu,
  VoceInventario,
} from "./types";

// ---------------------------------------------------------------------------
// Anno sociale: 1 ottobre - 30 settembre
// ---------------------------------------------------------------------------

export function oggiISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

export function annoSociale(data: string): string {
  const y = Number(data.slice(0, 4));
  const m = Number(data.slice(5, 7));
  const inizio = m >= 10 ? y : y - 1;
  return `${inizio}/${String((inizio + 1) % 100).padStart(2, "0")}`;
}

export function inizioAnno(anno: string): number {
  return Number(anno.slice(0, 4));
}

export function intervalloAnno(anno: string): { da: string; a: string } {
  const y = inizioAnno(anno);
  return { da: `${y}-10-01`, a: `${y + 1}-09-30` };
}

export function annoPrecedente(anno: string): string {
  const y = inizioAnno(anno) - 1;
  return `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
}

export function nelAnno(data: string, anno: string): boolean {
  const { da, a } = intervalloAnno(anno);
  return data >= da && data <= a;
}

/** Months of the social year, October first, as "YYYY-MM". */
export function mesiAnno(anno: string): string[] {
  const y = inizioAnno(anno);
  const mesi: string[] = [];
  for (let i = 0; i < 12; i++) {
    const m = ((9 + i) % 12) + 1;
    const anno = m >= 10 ? y : y + 1;
    mesi.push(`${anno}-${String(m).padStart(2, "0")}`);
  }
  return mesi;
}

export function anniDisponibili(dati: Pick<Dati, "movimenti" | "edizioni" | "impostazioni">): string[] {
  const set = new Set<string>([annoSociale(oggiISO())]);
  dati.movimenti.forEach((m) => m.data && set.add(annoSociale(m.data)));
  dati.edizioni.forEach((e) => e.data && set.add(annoSociale(e.data)));
  Object.keys(dati.impostazioni.saldiApertura).forEach((a) => set.add(a));
  return [...set].sort().reverse();
}

// ---------------------------------------------------------------------------
// Prezzi datati
// ---------------------------------------------------------------------------

export function ultimoValidoAl<T extends { validoDal: string }>(voci: T[], data: string): T | undefined {
  let migliore: T | undefined;
  for (const v of voci) {
    if (v.validoDal <= data && (!migliore || v.validoDal >= migliore.validoDal)) migliore = v;
  }
  return migliore;
}

export function prezzoMPAl(prezzi: PrezzoMP[], mpId: string, data: string): PrezzoMP | undefined {
  return ultimoValidoAl(
    prezzi.filter((p) => p.mpId === mpId),
    data,
  );
}

export function costoUnitario(p: PrezzoMP | undefined): number | undefined {
  if (!p || !(p.qtaLotto > 0)) return undefined;
  return p.costoLotto / p.qtaLotto;
}

export function listinoAl(listini: Listino[], data: string): Listino | undefined {
  return ultimoValidoAl(listini, data);
}

export function listinoEdizione(listini: Listino[], ed: Pick<Edizione, "listinoId" | "data">): Listino | undefined {
  if (ed.listinoId) {
    const scelto = listini.find((l) => l.id === ed.listinoId);
    if (scelto) return scelto;
  }
  return listinoAl(listini, ed.data);
}

// ---------------------------------------------------------------------------
// Composizione del costo di un articolo
// ---------------------------------------------------------------------------

export interface RigaCosto {
  mpId: string;
  mp?: MateriaPrima;
  qta: number;
  costoUM?: number;
  costo: number;
  fornitoreId?: string;
}

export interface QuotaFissa {
  costoFissoId: string;
  nome: string;
  metodo: MetodoRiparto;
  quota: number;
  /** The share this article would get with each method, for comparison. */
  alternative: Record<MetodoRiparto, number>;
}

export interface CostoArticolo {
  righe: RigaCosto[];
  materie: number;
  quoteFisse: QuotaFissa[];
  quotaFissi: number;
  costoVivo: number;
  completo: boolean;
  avvisi: string[];
}

type CtxCosto = {
  materiePrime: MateriaPrima[];
  prezziMP: PrezzoMP[];
  costiFissi: CostoFisso[];
  listini?: Listino[];
  articoli?: Articolo[];
  edizioni?: Edizione[];
};

export const METODI_RIPARTO: Record<MetodoRiparto, { etichetta: string; spiegazione: string }> = {
  pezzo: { etichetta: "Per pezzo", spiegazione: "Stesso importo su ogni pezzo venduto. Adatto a costi legati all'uso, come il gas della piastra." },
  prezzo: {
    etichetta: "In proporzione al prezzo",
    spiegazione: "Ogni articolo paga la stessa percentuale del suo prezzo. Neutro e semplice: adatto ai costi generali.",
  },
  margine: {
    etichetta: "In proporzione al margine",
    spiegazione: "Ogni articolo cede la stessa percentuale del suo margine. Non cambia la classifica di convenienza.",
  },
};

/** Base share per piece of a fixed cost (cost / pieces). */
export function quotaCostoFisso(c: CostoFisso): number {
  if (!c.attivo || !(c.baseRiparto > 0)) return 0;
  return c.costoTotale / c.baseRiparto;
}

function materieArticolo(a: Articolo, data: string, ctx: CtxCosto): number {
  return a.ricetta.reduce((s, r) => s + (costoUnitario(prezzoMPAl(ctx.prezziMP, r.mpId, data)) ?? 0) * (r.qta || 0), 0);
}

/** Pieces sold of each article in the latest edition that had any of them: the mix used to weigh shares. */
function mixPezzi(ids: string[], edizioni: Edizione[] | undefined, data: string): Map<string, number> {
  const mix = new Map<string, number>();
  const passate = [...(edizioni ?? [])].filter((e) => e.data <= data).sort((a, b) => (a.data < b.data ? 1 : -1));
  for (const ed of passate) {
    const righe = righeMenu(ed).filter((r) => ids.includes(r.articoloId));
    if (!righe.length) continue;
    for (const r of righe) mix.set(r.articoloId, (mix.get(r.articoloId) ?? 0) + (r.qtaReale || r.qtaPrevista || 0));
    if ([...mix.values()].some((v) => v > 0)) break;
    mix.clear();
  }
  return mix;
}

/**
 * Share of a fixed cost for every article it applies to, with all three methods.
 * "prezzo" and "margine" weigh pieces with the latest sales mix, so the shares still add up to the cost.
 */
export function quoteCostoFisso(c: CostoFisso, data: string, ctx: CtxCosto): Map<string, Record<MetodoRiparto, number>> {
  const base = quotaCostoFisso(c);
  const out = new Map<string, Record<MetodoRiparto, number>>();
  const listino = ctx.listini ? listinoAl(ctx.listini, data) : undefined;
  const articoli = c.articoliIds.map((id) => ctx.articoli?.find((a) => a.id === id)).filter((a): a is Articolo => !!a);
  const mix = mixPezzi(c.articoliIds, ctx.edizioni, data);
  const peso = (id: string) => (mix.size ? (mix.get(id) ?? 0) : 1);

  const prezzi = new Map(articoli.map((a) => [a.id, listino?.prezzi[a.id]]));
  const margini = new Map(articoli.map((a) => [a.id, Math.max(0, (prezzi.get(a.id) ?? 0) - materieArticolo(a, data, ctx))]));
  const media = (val: Map<string, number | undefined>) => {
    let num = 0;
    let den = 0;
    for (const a of articoli) {
      const v = val.get(a.id);
      if (v === undefined) continue;
      num += peso(a.id) * v;
      den += peso(a.id);
    }
    return den > 0 ? num / den : 0;
  };
  const mediaPrezzo = media(prezzi);
  const mediaMargine = media(margini);

  for (const id of c.articoliIds) {
    const p = prezzi.get(id);
    const m = margini.get(id);
    out.set(id, {
      pezzo: base,
      prezzo: p !== undefined && mediaPrezzo > 0 ? (base * p) / mediaPrezzo : base,
      margine: m !== undefined && mediaMargine > 0 ? (base * m) / mediaMargine : base,
    });
  }
  return out;
}

export function costoArticolo(articolo: Articolo, data: string, ctx: CtxCosto): CostoArticolo {
  const avvisi: string[] = [];
  if (articolo.ricetta.length === 0) avvisi.push("Ricetta vuota");

  const righe: RigaCosto[] = articolo.ricetta.map((r) => {
    const mp = ctx.materiePrime.find((m) => m.id === r.mpId);
    const prezzo = prezzoMPAl(ctx.prezziMP, r.mpId, data);
    const costoUM = costoUnitario(prezzo);
    if (!mp) avvisi.push("Materia prima eliminata nella ricetta");
    else if (costoUM === undefined) avvisi.push(`Manca il prezzo di ${mp.nome} a questa data`);
    if (!(r.qta > 0)) avvisi.push(`Quantità mancante per ${mp?.nome ?? "una riga"}`);
    return {
      mpId: r.mpId,
      mp,
      qta: r.qta,
      costoUM,
      costo: costoUM !== undefined ? costoUM * r.qta : 0,
      fornitoreId: prezzo?.fornitoreId,
    };
  });

  const quoteFisse: QuotaFissa[] = ctx.costiFissi
    .filter((c) => c.attivo && c.articoliIds.includes(articolo.id))
    .map((c) => {
      if (!(c.baseRiparto > 0)) avvisi.push(`Costo fisso "${c.nome}" senza base di riparto`);
      const metodo = c.metodo ?? "pezzo";
      const alternative = quoteCostoFisso(c, data, ctx).get(articolo.id) ?? { pezzo: 0, prezzo: 0, margine: 0 };
      return { costoFissoId: c.id, nome: c.nome, metodo, quota: alternative[metodo], alternative };
    });

  const materie = righe.reduce((s, r) => s + r.costo, 0);
  const quotaFissi = quoteFisse.reduce((s, q) => s + q.quota, 0);
  return {
    righe,
    materie,
    quoteFisse,
    quotaFissi,
    costoVivo: materie + quotaFissi,
    completo: avvisi.length === 0,
    avvisi,
  };
}

// ---------------------------------------------------------------------------
// Edizione: parti, previsto e reale
// ---------------------------------------------------------------------------

export interface ValoriScenario {
  qta: number;
  ricavo: number;
  costo: number;
  margine: number;
  quotaExtra: number;
  costoPieno: number;
  margineDopoExtra: number;
}

export interface RigaMenuCalc {
  riga: RigaMenu;
  parteId: string;
  /** Offered food (walk stops, fixed menus): only the cost counts. */
  offerto: boolean;
  articolo?: Articolo;
  prezzo?: number;
  costoVivo?: number;
  costo?: CostoArticolo;
  previsto: ValoriScenario;
  reale: ValoriScenario;
  avvisi: string[];
}

export interface RigaAcquistoCalc {
  riga: RigaAcquisto;
  parteId: string;
  mp?: MateriaPrima;
  prezzo?: PrezzoMP;
  costoUM?: number;
  qtaLotto: number;
  acquistatoPrevisto: number;
  costoPrevisto: number;
  acquistato: number;
  costoAcquisto: number;
  disponibile: number;
  consumo: number;
  costoConsumato: number;
  /** Value of the leftover returned to the warehouse. */
  valoreAvanzo: number;
  percentualeConsumo?: number;
  /** Effect on the warehouse balance: leftover returned minus quantity taken. */
  nettoMagazzino: number;
}

export interface TotaliScenario {
  pezzi: number;
  ricaviMenu: number;
  ingressi: number;
  lotteria: number;
  ricavi: number;
  costoMenu: number;
  /**
   * Purchases not covered by the menu recipes (materials, decorations, ice...).
   * Planned: planned spend. Real: only what was used, net of leftovers returned to stock.
   */
  costoMateriali: number;
  margineMenu: number;
  extraRipartiti: number;
  extraNonRipartiti: number;
  premi: number;
  /** Net shared costs (costs minus shared income). */
  comuni: number;
  extra: number;
  margineFinale: number;
  marginePct?: number;
  costoAcquisti: number;
  /** Paid admissions (fixed-menu covers, registrations). */
  paganti: number;
}

export interface TotaliReali extends TotaliScenario {
  costoConsumato: number;
  margineSuAcquisti: number;
}

export interface CalcoloParte {
  parte: Parte;
  menu: RigaMenuCalc[];
  acquisti: RigaAcquistoCalc[];
  previsto: TotaliScenario;
  reale: TotaliReali;
}

export interface CalcoloUnita {
  id: string;
  nome: string;
  data?: string;
  peso: number;
  partiIds: string[];
  previsto: { ricavi: number; costi: number; comuni: number; margine: number; paganti: number };
  reale: { ricavi: number; costi: number; comuni: number; margine: number; paganti: number };
}

export interface CassaEdizione {
  entrateUfficiali: number;
  usciteUfficiali: number;
  entratePreviste: number;
  uscitePreviste: number;
  netto: number;
  nettoPrudente: number;
}

export interface CalcoloEdizione {
  listino?: Listino;
  parti: CalcoloParte[];
  /** Evenings (or parts when there are none) that share the common costs. */
  unita: CalcoloUnita[];
  menu: RigaMenuCalc[];
  acquisti: RigaAcquistoCalc[];
  previsto: TotaliScenario;
  reale: TotaliReali;
  haReali: boolean;
  cassa: CassaEdizione;
  quadratura: { ricavi: number; costi: number };
  avvisi: string[];
}

type CtxEdizione = Pick<Dati, "articoli" | "listini" | "materiePrime" | "prezziMP" | "costiFissi" | "movimenti"> & { edizioni?: Edizione[] };

function scenario(prezzo: number, costoVivo: number, qta: number, quotaExtra: number): ValoriScenario {
  const ricavo = prezzo * qta;
  const costo = costoVivo * qta;
  const costoPieno = (costoVivo + quotaExtra) * qta;
  return { qta, ricavo, costo, margine: ricavo - costo, quotaExtra, costoPieno, margineDopoExtra: ricavo - costoPieno };
}

export function calcolaAcquisto(
  riga: RigaAcquisto,
  data: string,
  ctx: { materiePrime: MateriaPrima[]; prezziMP: PrezzoMP[] },
  parteId = "",
): RigaAcquistoCalc {
  const mp = ctx.materiePrime.find((m) => m.id === riga.mpId);
  const prezzo = prezzoMPAl(ctx.prezziMP, riga.mpId, data);
  const costoUM = costoUnitario(prezzo);
  const qtaLotto = prezzo?.qtaLotto ?? 0;
  const acquistato = (riga.lottiReali || 0) * qtaLotto;
  const disponibile = acquistato + (riga.daMagazzino || 0);
  const consumo = disponibile - (riga.rimanenza || 0);
  return {
    riga,
    parteId,
    mp,
    prezzo,
    costoUM,
    qtaLotto,
    acquistatoPrevisto: (riga.lottiPrevisti || 0) * qtaLotto,
    costoPrevisto: (riga.lottiPrevisti || 0) * (prezzo?.costoLotto ?? 0),
    acquistato,
    costoAcquisto: (riga.lottiReali || 0) * (prezzo?.costoLotto ?? 0),
    disponibile,
    consumo,
    costoConsumato: costoUM !== undefined ? consumo * costoUM : 0,
    valoreAvanzo: costoUM !== undefined ? (riga.rimanenza || 0) * costoUM : 0,
    percentualeConsumo: disponibile > 0 ? consumo / disponibile : undefined,
    nettoMagazzino: (riga.rimanenza || 0) - (riga.daMagazzino || 0),
  };
}

export function cassaEdizione(movimenti: Movimento[], edizioneId: string): CassaEdizione {
  const c = { entrateUfficiali: 0, usciteUfficiali: 0, entratePreviste: 0, uscitePreviste: 0 };
  for (const m of movimenti) {
    const quota = importoSuEdizione(m, edizioneId);
    if (!quota) continue;
    if (m.tipo === "entrata") {
      if (m.stato === "ufficiale") c.entrateUfficiali += quota;
      else c.entratePreviste += quota;
    } else if (m.stato === "ufficiale") c.usciteUfficiali += quota;
    else c.uscitePreviste += quota;
  }
  const netto = c.entrateUfficiali - c.usciteUfficiali;
  return { ...c, netto, nettoPrudente: netto - c.uscitePreviste };
}

function totaleVuoto(): TotaliScenario {
  return {
    pezzi: 0,
    ricaviMenu: 0,
    ingressi: 0,
    lotteria: 0,
    ricavi: 0,
    costoMenu: 0,
    costoMateriali: 0,
    margineMenu: 0,
    extraRipartiti: 0,
    extraNonRipartiti: 0,
    premi: 0,
    comuni: 0,
    extra: 0,
    margineFinale: 0,
    costoAcquisti: 0,
    paganti: 0,
  };
}

function calcolaParte(parte: Parte, ed: Edizione, listino: Listino | undefined, ctx: CtxEdizione, avvisi: string[]): CalcoloParte {
  const cap = capacita(parte);
  const offerto = cap.menu === "offerto";
  const menuRighe = cap.menu ? parte.menu : [];
  const extra = parte.costiExtra;
  const somma = (rip: boolean, k: "importoPrevisto" | "importoReale") =>
    extra.filter((c) => c.ripartisci === rip).reduce((s, c) => s + (c[k] || 0), 0);
  const pezziPrev = menuRighe.reduce((s, r) => s + (r.qtaPrevista || 0), 0);
  const pezziReali = menuRighe.reduce((s, r) => s + (r.qtaReale || 0), 0);
  const ripPrev = somma(true, "importoPrevisto");
  const ripReale = somma(true, "importoReale");
  const quotaPrev = pezziPrev > 0 ? ripPrev / pezziPrev : 0;
  const quotaReale = pezziReali > 0 ? ripReale / pezziReali : 0;

  const menu: RigaMenuCalc[] = menuRighe.map((riga) => {
    const articolo = ctx.articoli.find((a) => a.id === riga.articoloId);
    const avvisiRiga: string[] = [];
    let prezzo = offerto ? 0 : riga.prezzoFissato;
    let costoVivo = riga.costoFissato;
    let costo: CostoArticolo | undefined;
    if (articolo) {
      if (prezzo === undefined) {
        prezzo = listino?.prezzi[articolo.id];
        if (prezzo === undefined) avvisiRiga.push(`${articolo.nome}: prezzo mancante nel listino`);
      }
      costo = costoArticolo(articolo, ed.data, ctx);
      if (costoVivo === undefined) {
        costoVivo = costo.costoVivo;
        costo.avvisi.forEach((a) => avvisiRiga.push(`${articolo.nome}: ${a}`));
      }
    } else avvisiRiga.push("Articolo eliminato");
    avvisi.push(...avvisiRiga);
    return {
      riga,
      parteId: parte.id,
      offerto,
      articolo,
      prezzo,
      costoVivo,
      costo,
      previsto: scenario(prezzo ?? 0, costoVivo ?? 0, riga.qtaPrevista || 0, quotaPrev),
      reale: scenario(prezzo ?? 0, costoVivo ?? 0, riga.qtaReale || 0, quotaReale),
      avvisi: avvisiRiga,
    };
  });

  const acquisti = (cap.acquisti ? parte.acquisti : []).map((r) => {
    const calc = calcolaAcquisto(r, ed.data, ctx, parte.id);
    if (calc.mp && !calc.prezzo) avvisi.push(`${calc.mp.nome}: manca il prezzo a questa data`);
    if (calc.consumo < 0) avvisi.push(`${calc.mp?.nome ?? "Acquisto"}: riportato in magazzino più di quanto disponibile`);
    return calc;
  });
  const inRicetta = new Set(menu.flatMap((m) => m.articolo?.ricetta.map((r) => r.mpId) ?? []));
  const fuoriRicetta = acquisti.filter((a) => !inRicetta.has(a.riga.mpId));

  const ing = cap.ingresso ? parte.ingresso : undefined;
  const lot = cap.lotteria ? parte.lotteria : undefined;
  const premi = lot ? lot.premi.filter((p) => !p.donato).reduce((s, p) => s + (p.valore || 0), 0) : 0;

  const totale = (k: "previsto" | "reale"): TotaliScenario => {
    const t = totaleVuoto();
    t.pezzi = menu.reduce((s, r) => s + r[k].qta, 0);
    t.ricaviMenu = menu.reduce((s, r) => s + r[k].ricavo, 0);
    t.costoMenu = menu.reduce((s, r) => s + r[k].costo, 0);
    if (ing) {
      t.paganti = k === "previsto" ? ing.previsti || 0 : (ing.prevendite || 0) + (ing.venditeGiorno || 0);
      t.ingressi = (ing.prezzo || 0) * t.paganti;
    }
    if (lot) t.lotteria = (lot.prezzoBiglietto || 0) * ((k === "previsto" ? lot.vendutiPrevisti : lot.vendutiReali) || 0);
    t.ricavi = t.ricaviMenu + t.ingressi + t.lotteria;
    t.margineMenu = t.ricaviMenu - t.costoMenu;
    t.extraRipartiti = k === "previsto" ? ripPrev : ripReale;
    t.extraNonRipartiti = somma(false, k === "previsto" ? "importoPrevisto" : "importoReale");
    t.premi = premi;
    t.extra = t.extraRipartiti + t.extraNonRipartiti + t.premi;
    t.costoMateriali = fuoriRicetta.reduce((s, a) => s + (k === "previsto" ? a.costoPrevisto : a.costoConsumato), 0);
    t.margineFinale = t.ricavi - t.costoMenu - t.costoMateriali - t.extra;
    t.marginePct = t.ricavi > 0 ? t.margineFinale / t.ricavi : undefined;
    t.costoAcquisti = acquisti.reduce((s, a) => s + (k === "previsto" ? a.costoPrevisto : a.costoAcquisto), 0);
    return t;
  };

  const reale = totale("reale");
  const costoConsumato = acquisti.reduce((s, a) => s + a.costoConsumato, 0);
  return {
    parte,
    menu,
    acquisti,
    previsto: totale("previsto"),
    reale: { ...reale, costoConsumato, margineSuAcquisti: reale.ricavi - costoConsumato - reale.extra },
  };
}

function sommaTotali(lista: TotaliScenario[]): TotaliScenario {
  const t = totaleVuoto();
  for (const x of lista) {
    for (const k of Object.keys(t) as (keyof TotaliScenario)[]) {
      if (k === "marginePct") continue;
      (t[k] as number) += (x[k] as number) || 0;
    }
  }
  return t;
}

export function calcolaEdizione(ed: Edizione, ctx: CtxEdizione): CalcoloEdizione {
  const listino = listinoEdizione(ctx.listini, ed);
  const avvisi: string[] = [];
  const parti = ed.parti.map((p) => calcolaParte(p, ed, listino, ctx, avvisi));
  if (!listino && parti.some((p) => p.menu.some((m) => !m.offerto))) avvisi.push("Nessun listino valido alla data dell'edizione");

  const comuniNetti = (k: "importoPrevisto" | "importoReale") =>
    ed.comuni.reduce((s, c) => s + (c.tipo === "uscita" ? 1 : -1) * (c[k] || 0), 0);

  const chiudi = (base: TotaliScenario, comuni: number): TotaliScenario => {
    const t = { ...base, comuni, extra: base.extra + comuni, margineFinale: base.margineFinale - comuni };
    t.marginePct = t.ricavi > 0 ? t.margineFinale / t.ricavi : undefined;
    return t;
  };
  const previsto = chiudi(
    sommaTotali(parti.map((p) => p.previsto)),
    comuniNetti("importoPrevisto"),
  );
  const baseReale = chiudi(
    sommaTotali(parti.map((p) => p.reale)),
    comuniNetti("importoReale"),
  );
  const costoConsumato = parti.reduce((s, p) => s + p.reale.costoConsumato, 0);
  const reale: TotaliReali = { ...baseReale, costoConsumato, margineSuAcquisti: baseReale.ricavi - costoConsumato - baseReale.extra };

  const gruppi = schermate(ed);
  const pesoTot = gruppi.reduce((s, g) => s + (g.serata ? g.serata.peso : (g.parti[0]?.peso ?? 0)), 0);
  const unita: CalcoloUnita[] = gruppi.map((g) => {
    const peso = g.serata ? g.serata.peso : (g.parti[0]?.peso ?? 0);
    const quota = pesoTot > 0 ? peso / pesoTot : 0;
    const mie = parti.filter((p) => g.parti.some((x) => x.id === p.parte.id));
    const val = (k: "previsto" | "reale") => {
      const ricavi = mie.reduce((s, p) => s + p[k].ricavi, 0);
      const costi = mie.reduce((s, p) => s + p[k].costoMenu + p[k].costoMateriali + p[k].extra, 0);
      const comuni = (k === "previsto" ? previsto.comuni : reale.comuni) * quota;
      return { ricavi, costi, comuni, margine: ricavi - costi - comuni, paganti: mie.reduce((s, p) => s + p[k].paganti, 0) };
    };
    return { id: g.id, nome: g.nome, data: g.serata?.data, peso, partiIds: g.parti.map((p) => p.id), previsto: val("previsto"), reale: val("reale") };
  });

  const cassa = cassaEdizione(ctx.movimenti, ed.id);
  const comuniUsciteReali = ed.comuni.filter((c) => c.tipo === "uscita").reduce((s, c) => s + (c.importoReale || 0), 0);
  const comuniEntrateReali = ed.comuni.filter((c) => c.tipo === "entrata").reduce((s, c) => s + (c.importoReale || 0), 0);
  const haReali = reale.pezzi > 0 || reale.paganti > 0 || reale.lotteria > 0 || reale.costoAcquisti > 0;
  return {
    listino,
    parti,
    unita,
    menu: parti.flatMap((p) => p.menu),
    acquisti: parti.flatMap((p) => p.acquisti),
    previsto,
    reale,
    haReali,
    cassa,
    quadratura: {
      ricavi: cassa.entrateUfficiali - reale.ricavi - comuniEntrateReali,
      costi: cassa.usciteUfficiali - (reale.costoAcquisti + reale.extra - reale.comuni + comuniUsciteReali),
    },
    avvisi: [...new Set(avvisi)],
  };
}

/** Freezes price and cost on each menu row of every part (used when closing an edition). */
export function fissaValori(ed: Edizione, ctx: CtxEdizione): Parte[] {
  const calc = calcolaEdizione({ ...ed, parti: sbloccaValori(ed.parti) }, ctx);
  return ed.parti.map((p) => {
    const cp = calc.parti.find((x) => x.parte.id === p.id);
    return {
      ...p,
      menu: p.menu.map((r) => {
        const m = cp?.menu.find((x) => x.riga.id === r.id);
        return m ? { ...r, prezzoFissato: m.prezzo ?? 0, costoFissato: m.costoVivo ?? 0 } : r;
      }),
    };
  });
}

export function sbloccaValori(parti: Parte[]): Parte[] {
  return parti.map((p) => ({ ...p, menu: p.menu.map(({ prezzoFissato, costoFissato, ...r }) => r) }));
}

// ---------------------------------------------------------------------------
// Storico: quanto si è venduto e usato nelle edizioni precedenti
// ---------------------------------------------------------------------------

export interface DatoStorico {
  edizioni: { id: string; nome: string; data: string; valore: number; partecipanti?: number }[];
  media?: number;
  /** Average per participant, when the editions record participants. */
  mediaPerPartecipante?: number;
}

function precedentiStesseEvento(ed: Pick<Edizione, "id" | "eventoId" | "data">, edizioni: Edizione[], n: number): Edizione[] {
  return edizioni
    .filter((e) => e.eventoId === ed.eventoId && e.id !== ed.id && e.data < ed.data && e.stato !== "pianificata")
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, n);
}

function riassumi(righe: DatoStorico["edizioni"]): DatoStorico {
  if (!righe.length) return { edizioni: [] };
  const media = righe.reduce((s, r) => s + r.valore, 0) / righe.length;
  const conPart = righe.filter((r) => r.partecipanti && r.partecipanti > 0);
  const mediaPerPartecipante = conPart.length ? conPart.reduce((s, r) => s + r.valore / r.partecipanti!, 0) / conPart.length : undefined;
  return { edizioni: righe, media, mediaPerPartecipante };
}

/** Consumption of a raw material in the last editions of the same event (same part name when possible). */
export function usoStorico(
  mpId: string,
  ed: Pick<Edizione, "id" | "eventoId" | "data">,
  ctx: Pick<Dati, "edizioni" | "materiePrime" | "prezziMP">,
  parteNome?: string,
  n = 3,
): DatoStorico {
  const righe: DatoStorico["edizioni"] = [];
  for (const e of precedentiStesseEvento(ed, ctx.edizioni, n)) {
    const parti = e.parti.filter((p) => p.acquisti.some((a) => a.mpId === mpId));
    const stesse = parteNome ? parti.filter((p) => p.nome === parteNome) : [];
    const usate = stesse.length ? stesse : parti;
    if (!usate.length) continue;
    const valore = usate.flatMap((p) => p.acquisti.filter((a) => a.mpId === mpId)).reduce((s, a) => s + calcolaAcquisto(a, e.data, ctx).consumo, 0);
    righe.push({ id: e.id, nome: e.nome, data: e.data, valore, partecipanti: e.partecipantiReali });
  }
  return riassumi(righe);
}

/** Pieces sold of an article in the last editions of the same event. */
export function venditeStoriche(articoloId: string, ed: Pick<Edizione, "id" | "eventoId" | "data">, edizioni: Edizione[], parteNome?: string, n = 3): DatoStorico {
  const righe: DatoStorico["edizioni"] = [];
  for (const e of precedentiStesseEvento(ed, edizioni, n)) {
    const parti = e.parti.filter((p) => p.menu.some((m) => m.articoloId === articoloId));
    const stesse = parteNome ? parti.filter((p) => p.nome === parteNome) : [];
    const usate = stesse.length ? stesse : parti;
    if (!usate.length) continue;
    const valore = usate.flatMap((p) => p.menu.filter((m) => m.articoloId === articoloId)).reduce((s, m) => s + (m.qtaReale || 0), 0);
    righe.push({ id: e.id, nome: e.nome, data: e.data, valore, partecipanti: e.partecipantiReali });
  }
  return riassumi(righe);
}

/** Any per-part figure (paid covers, tickets sold...) in the last editions of the same event, matched by part name. */
export function storicoParte(
  ed: Pick<Edizione, "id" | "eventoId" | "data">,
  edizioni: Edizione[],
  parteNome: string,
  valore: (p: Parte) => number | undefined,
  n = 3,
): DatoStorico {
  const righe: DatoStorico["edizioni"] = [];
  for (const e of precedentiStesseEvento(ed, edizioni, n)) {
    const p = e.parti.find((x) => x.nome === parteNome);
    const v = p ? valore(p) : undefined;
    if (v !== undefined) righe.push({ id: e.id, nome: e.nome, data: e.data, valore: v, partecipanti: e.partecipantiReali });
  }
  return riassumi(righe);
}

/** Suggested quantity to buy: historical use (scaled on expected participants when known) minus what is in stock. */
export function suggerimentoAcquisto(storico: DatoStorico, partecipantiPrevisti: number | undefined, giacenza: number): number | undefined {
  const fabbisogno =
    storico.mediaPerPartecipante !== undefined && partecipantiPrevisti ? storico.mediaPerPartecipante * partecipantiPrevisti : storico.media;
  if (fabbisogno === undefined) return undefined;
  return Math.max(0, fabbisogno - Math.max(0, giacenza));
}

// ---------------------------------------------------------------------------
// Cassa dell'anno sociale
// ---------------------------------------------------------------------------

export interface RiepilogoCassa {
  anno: string;
  apertura: number;
  entrateUfficiali: number;
  usciteUfficiali: number;
  cassa: number;
  spesePrevisteOrdinarie: number;
  spesePrevisteEventi: number;
  entratePreviste: number;
  disponibilitaNetta: number;
}

export function importoFirmato(m: Pick<Movimento, "tipo" | "importo">): number {
  return m.tipo === "entrata" ? m.importo : -m.importo;
}

/** Competence split of a movimento; falls back to the legacy single edizioneId. */
export function quoteMovimento(m: Pick<Movimento, "importo" | "edizioneId" | "quote">): { edizioneId: string; importo: number }[] {
  if (m.quote?.length) return m.quote.filter((q) => q.edizioneId && q.importo);
  if (m.edizioneId) return [{ edizioneId: m.edizioneId, importo: m.importo }];
  return [];
}

export function edizioniDelMovimento(m: Pick<Movimento, "importo" | "edizioneId" | "quote">): string[] {
  return [...new Set(quoteMovimento(m).map((q) => q.edizioneId))];
}

export function movimentoSuEdizione(m: Pick<Movimento, "importo" | "edizioneId" | "quote">, edizioneId: string): boolean {
  return edizioniDelMovimento(m).includes(edizioneId);
}

export function importoSuEdizione(m: Pick<Movimento, "importo" | "edizioneId" | "quote">, edizioneId: string): number {
  return quoteMovimento(m)
    .filter((q) => q.edizioneId === edizioneId)
    .reduce((s, q) => s + q.importo, 0);
}

export function movimentoOrdinario(m: Pick<Movimento, "importo" | "edizioneId" | "quote">): boolean {
  return quoteMovimento(m).length === 0;
}

/** Persist-ready shape: syncs edizioneId with quote (1 → id, many → clear id). */
export function normalizzaQuoteMovimento(m: Movimento): Movimento {
  const quote = (m.quote ?? []).filter((q) => q.edizioneId && q.importo > 0);
  if (quote.length === 0) {
    if (m.edizioneId) return { ...m, quote: undefined };
    const { quote: _tolta, ...resto } = m;
    return { ...resto, edizioneId: undefined };
  }
  if (quote.length === 1) return { ...m, quote, edizioneId: quote[0].edizioneId };
  return { ...m, quote, edizioneId: undefined };
}

export function aperturaAnno(anno: string, impostazioni: Impostazioni, movimenti: Movimento[], profondita = 0): number {
  const forzata = impostazioni.saldiApertura[anno];
  if (forzata !== undefined && forzata !== null) return forzata;
  const prec = annoPrecedente(anno);
  const haStoria =
    profondita < 30 &&
    (Object.keys(impostazioni.saldiApertura).some((a) => a <= prec) || movimenti.some((m) => m.data < intervalloAnno(anno).da));
  if (!haStoria) return 0;
  const aperturaPrec = aperturaAnno(prec, impostazioni, movimenti, profondita + 1);
  const nettoPrec = movimenti
    .filter((m) => m.stato === "ufficiale" && nelAnno(m.data, prec))
    .reduce((s, m) => s + importoFirmato(m), 0);
  return aperturaPrec + nettoPrec;
}

export function riepilogoCassa(anno: string, impostazioni: Impostazioni, movimenti: Movimento[]): RiepilogoCassa {
  const apertura = aperturaAnno(anno, impostazioni, movimenti);
  let entrateUfficiali = 0;
  let usciteUfficiali = 0;
  let spesePrevisteOrdinarie = 0;
  let spesePrevisteEventi = 0;
  let entratePreviste = 0;
  for (const m of movimenti) {
    if (!nelAnno(m.data, anno)) continue;
    if (m.stato === "ufficiale") {
      if (m.tipo === "entrata") entrateUfficiali += m.importo;
      else usciteUfficiali += m.importo;
    } else if (m.tipo === "uscita") {
      if (movimentoOrdinario(m)) spesePrevisteOrdinarie += m.importo;
      else spesePrevisteEventi += m.importo;
    } else entratePreviste += m.importo;
  }
  const cassa = apertura + entrateUfficiali - usciteUfficiali;
  return {
    anno,
    apertura,
    entrateUfficiali,
    usciteUfficiali,
    cassa,
    spesePrevisteOrdinarie,
    spesePrevisteEventi,
    entratePreviste,
    disponibilitaNetta: cassa - spesePrevisteOrdinarie - spesePrevisteEventi,
  };
}

export interface FlussoMese {
  mese: string;
  entrate: number;
  uscite: number;
  saldo: number;
}

export function flussiMensili(anno: string, apertura: number, movimenti: Movimento[]): FlussoMese[] {
  let saldo = apertura;
  return mesiAnno(anno).map((mese) => {
    let entrate = 0;
    let uscite = 0;
    for (const m of movimenti) {
      if (m.stato !== "ufficiale" || !m.data.startsWith(mese)) continue;
      if (m.tipo === "entrata") entrate += m.importo;
      else uscite += m.importo;
    }
    saldo += entrate - uscite;
    return { mese, entrate, uscite, saldo };
  });
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export interface PuntoInventario {
  data: string;
  descrizione: string;
  variazione: number;
  saldo: number;
  conteggio?: { calcolato: number; differenza: number };
  voceId?: string;
  edizioneId?: string;
  scadenza?: string;
}

export function edizioneMuoveMagazzino(ed: Edizione, oggi = oggiISO()): boolean {
  return ed.stato !== "pianificata" || ed.data <= oggi;
}

/** Stock timeline for one raw material: event leftovers, manual loads/unloads, counts that reset the balance. */
export function storicoInventario(
  mpId: string,
  ctx: Pick<Dati, "edizioni" | "inventario" | "materiePrime" | "prezziMP" | "eventi">,
  oggi = oggiISO(),
): PuntoInventario[] {
  type Passo = { data: string; ordine: number; fn: (saldo: number) => PuntoInventario };
  const lista: Passo[] = [];

  for (const ed of ctx.edizioni) {
    if (!edizioneMuoveMagazzino(ed, oggi)) continue;
    const multi = ed.parti.length > 1;
    for (const parte of ed.parti) {
      for (const r of parte.acquisti) {
        if (r.mpId !== mpId) continue;
        const variazione = calcolaAcquisto(r, ed.data, ctx).nettoMagazzino;
        const descrizione = multi ? `Edizione ${ed.nome} · ${parte.nome}` : `Edizione ${ed.nome}`;
        lista.push({
          data: ed.data,
          ordine: 0,
          fn: (saldo) => ({ data: ed.data, descrizione, variazione, saldo: saldo + variazione, edizioneId: ed.id, scadenza: r.rimanenza > 0 ? r.scadenza : undefined }),
        });
      }
    }
  }

  for (const v of ctx.inventario) {
    if (v.mpId !== mpId) continue;
    if (v.tipo === "conteggio") {
      lista.push({
        data: v.data,
        ordine: 1,
        fn: (saldo) => ({
          data: v.data,
          descrizione: v.note ? `Conteggio - ${v.note}` : "Conteggio",
          variazione: v.quantita - saldo,
          saldo: v.quantita,
          conteggio: { calcolato: saldo, differenza: v.quantita - saldo },
          voceId: v.id,
        }),
      });
    } else {
      const variazione = v.tipo === "carico" ? v.quantita : -v.quantita;
      const descr = v.tipo === "carico" ? "Carico" : "Scarico";
      lista.push({
        data: v.data,
        ordine: 0,
        fn: (saldo) => ({
          data: v.data,
          descrizione: v.note ? `${descr} - ${v.note}` : descr,
          variazione,
          saldo: saldo + variazione,
          voceId: v.id,
        }),
      });
    }
  }

  lista.sort((a, b) => (a.data === b.data ? a.ordine - b.ordine : a.data < b.data ? -1 : 1));
  const punti: PuntoInventario[] = [];
  let saldo = 0;
  for (const e of lista) {
    const p = e.fn(saldo);
    saldo = p.saldo;
    punti.push(p);
  }
  return punti;
}

export function saldoInventario(mpId: string, ctx: Parameters<typeof storicoInventario>[1], oggi = oggiISO()): number {
  const punti = storicoInventario(mpId, ctx, oggi);
  return punti.length ? punti[punti.length - 1].saldo : 0;
}

/** Expiry of the most recent leftover still relevant (after the last count), if any. */
export function scadenzaGiacenza(mpId: string, ctx: Parameters<typeof storicoInventario>[1], oggi = oggiISO()): string | undefined {
  const punti = storicoInventario(mpId, ctx, oggi);
  if (!punti.length || punti[punti.length - 1].saldo <= 0) return undefined;
  for (let i = punti.length - 1; i >= 0; i--) {
    if (punti[i].scadenza) return punti[i].scadenza;
    if (punti[i].conteggio) return undefined;
  }
  return undefined;
}

export function ultimoConteggio(inventario: VoceInventario[], mpId: string): VoceInventario | undefined {
  return inventario
    .filter((v) => v.mpId === mpId && v.tipo === "conteggio")
    .sort((a, b) => (a.data < b.data ? 1 : -1))[0];
}

// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------

export function prossimoCodice(prefisso: string, codici: string[]): string {
  let max = 0;
  for (const c of codici) {
    const m = c.match(/(\d+)\s*$/);
    if (c.startsWith(prefisso) && m) max = Math.max(max, Number(m[1]));
  }
  return `${prefisso}${String(max + 1).padStart(2, "0")}`;
}

export function nuovoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
