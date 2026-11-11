import type {
  Articolo,
  CostoFisso,
  Dati,
  Edizione,
  Impostazioni,
  Listino,
  MateriaPrima,
  Movimento,
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
  quota: number;
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

export function quotaCostoFisso(c: CostoFisso): number {
  if (!c.attivo || !(c.baseRiparto > 0)) return 0;
  return c.costoTotale / c.baseRiparto;
}

export function costoArticolo(
  articolo: Articolo,
  data: string,
  ctx: { materiePrime: MateriaPrima[]; prezziMP: PrezzoMP[]; costiFissi: CostoFisso[] },
): CostoArticolo {
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
      return { costoFissoId: c.id, nome: c.nome, quota: quotaCostoFisso(c) };
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
// Edizione: previsto e reale
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
  percentualeConsumo?: number;
  /** Effect on the warehouse balance: leftover returned minus quantity taken. */
  nettoMagazzino: number;
}

export interface TotaliScenario {
  pezzi: number;
  ricavi: number;
  costoMenu: number;
  margineMenu: number;
  extraRipartiti: number;
  extraNonRipartiti: number;
  extra: number;
  margineFinale: number;
  marginePct?: number;
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
  menu: RigaMenuCalc[];
  acquisti: RigaAcquistoCalc[];
  previsto: TotaliScenario & { costoAcquisti: number };
  reale: TotaliScenario & { costoAcquisti: number; costoConsumato: number; margineSuAcquisti: number };
  cassa: CassaEdizione;
  quadratura: { ricavi: number; costi: number };
  avvisi: string[];
}

function scenario(prezzo: number, costoVivo: number, qta: number, quotaExtra: number): ValoriScenario {
  const ricavo = prezzo * qta;
  const costo = costoVivo * qta;
  const costoPieno = (costoVivo + quotaExtra) * qta;
  return {
    qta,
    ricavo,
    costo,
    margine: ricavo - costo,
    quotaExtra,
    costoPieno,
    margineDopoExtra: ricavo - costoPieno,
  };
}

export function calcolaAcquisto(
  riga: RigaAcquisto,
  data: string,
  ctx: { materiePrime: MateriaPrima[]; prezziMP: PrezzoMP[] },
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
    percentualeConsumo: disponibile > 0 ? consumo / disponibile : undefined,
    nettoMagazzino: (riga.rimanenza || 0) - (riga.daMagazzino || 0),
  };
}

export function cassaEdizione(movimenti: Movimento[], edizioneId: string): CassaEdizione {
  const c = { entrateUfficiali: 0, usciteUfficiali: 0, entratePreviste: 0, uscitePreviste: 0 };
  for (const m of movimenti) {
    if (m.edizioneId !== edizioneId) continue;
    if (m.tipo === "entrata") {
      if (m.stato === "ufficiale") c.entrateUfficiali += m.importo;
      else c.entratePreviste += m.importo;
    } else if (m.stato === "ufficiale") c.usciteUfficiali += m.importo;
    else c.uscitePreviste += m.importo;
  }
  const netto = c.entrateUfficiali - c.usciteUfficiali;
  return { ...c, netto, nettoPrudente: netto - c.uscitePreviste };
}

export function calcolaEdizione(
  ed: Edizione,
  ctx: Pick<Dati, "articoli" | "listini" | "materiePrime" | "prezziMP" | "costiFissi" | "movimenti">,
): CalcoloEdizione {
  const listino = listinoEdizione(ctx.listini, ed);
  const avvisi: string[] = [];
  if (!listino) avvisi.push("Nessun listino valido alla data dell'edizione");

  const pezziPrevisti = ed.menu.reduce((s, r) => s + (r.qtaPrevista || 0), 0);
  const pezziReali = ed.menu.reduce((s, r) => s + (r.qtaReale || 0), 0);
  const extraRipPrev = ed.costiExtra.filter((c) => c.ripartisci).reduce((s, c) => s + (c.importoPrevisto || 0), 0);
  const extraRipReale = ed.costiExtra.filter((c) => c.ripartisci).reduce((s, c) => s + (c.importoReale || 0), 0);
  const extraAltriPrev = ed.costiExtra.filter((c) => !c.ripartisci).reduce((s, c) => s + (c.importoPrevisto || 0), 0);
  const extraAltriReale = ed.costiExtra.filter((c) => !c.ripartisci).reduce((s, c) => s + (c.importoReale || 0), 0);
  const quotaPrev = pezziPrevisti > 0 ? extraRipPrev / pezziPrevisti : 0;
  const quotaReale = pezziReali > 0 ? extraRipReale / pezziReali : 0;

  const menu: RigaMenuCalc[] = ed.menu.map((riga) => {
    const articolo = ctx.articoli.find((a) => a.id === riga.articoloId);
    const avvisiRiga: string[] = [];
    let prezzo = riga.prezzoFissato;
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
      articolo,
      prezzo,
      costoVivo,
      costo,
      previsto: scenario(prezzo ?? 0, costoVivo ?? 0, riga.qtaPrevista || 0, quotaPrev),
      reale: scenario(prezzo ?? 0, costoVivo ?? 0, riga.qtaReale || 0, quotaReale),
      avvisi: avvisiRiga,
    };
  });

  const acquisti = ed.acquisti.map((r) => {
    const calc = calcolaAcquisto(r, ed.data, ctx);
    if (calc.mp && !calc.prezzo) avvisi.push(`${calc.mp.nome}: manca il prezzo a questa data`);
    return calc;
  });

  const totale = (k: "previsto" | "reale", extraRip: number, extraAltri: number): TotaliScenario => {
    const pezzi = menu.reduce((s, r) => s + r[k].qta, 0);
    const ricavi = menu.reduce((s, r) => s + r[k].ricavo, 0);
    const costoMenu = menu.reduce((s, r) => s + r[k].costo, 0);
    const extra = extraRip + extraAltri;
    const margineFinale = ricavi - costoMenu - extra;
    return {
      pezzi,
      ricavi,
      costoMenu,
      margineMenu: ricavi - costoMenu,
      extraRipartiti: extraRip,
      extraNonRipartiti: extraAltri,
      extra,
      margineFinale,
      marginePct: ricavi > 0 ? margineFinale / ricavi : undefined,
    };
  };

  const previsto = {
    ...totale("previsto", extraRipPrev, extraAltriPrev),
    costoAcquisti: acquisti.reduce((s, a) => s + a.costoPrevisto, 0),
  };
  const baseReale = totale("reale", extraRipReale, extraAltriReale);
  const costoConsumato = acquisti.reduce((s, a) => s + a.costoConsumato, 0);
  const reale = {
    ...baseReale,
    costoAcquisti: acquisti.reduce((s, a) => s + a.costoAcquisto, 0),
    costoConsumato,
    margineSuAcquisti: baseReale.ricavi - costoConsumato - baseReale.extra,
  };

  const cassa = cassaEdizione(ctx.movimenti, ed.id);
  return {
    listino,
    menu,
    acquisti,
    previsto,
    reale,
    cassa,
    quadratura: {
      ricavi: cassa.entrateUfficiali - reale.ricavi,
      costi: cassa.usciteUfficiali - (reale.costoAcquisti + reale.extra),
    },
    avvisi: [...new Set(avvisi)],
  };
}

/** Freezes price and cost on each menu row (used when closing an edition). */
export function fissaValoriMenu(
  ed: Edizione,
  ctx: Pick<Dati, "articoli" | "listini" | "materiePrime" | "prezziMP" | "costiFissi" | "movimenti">,
): RigaMenu[] {
  const calc = calcolaEdizione({ ...ed, menu: ed.menu.map(({ prezzoFissato, costoFissato, ...r }) => r) }, ctx);
  return calc.menu.map((m) => ({ ...m.riga, prezzoFissato: m.prezzo ?? 0, costoFissato: m.costoVivo ?? 0 }));
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
      if (m.edizioneId) spesePrevisteEventi += m.importo;
      else spesePrevisteOrdinarie += m.importo;
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
  type Passo = { data: string; ordine: number; descrizione: string; fn: (saldo: number) => PuntoInventario };
  const lista: Passo[] = [];

  for (const ed of ctx.edizioni) {
    if (!edizioneMuoveMagazzino(ed, oggi)) continue;
    for (const r of ed.acquisti) {
      if (r.mpId !== mpId) continue;
      const calc = calcolaAcquisto(r, ed.data, ctx);
      const variazione = calc.nettoMagazzino;
      lista.push({
        data: ed.data,
        ordine: 0,
        descrizione: `Edizione ${ed.nome}`,
        fn: (saldo) => ({ data: ed.data, descrizione: `Edizione ${ed.nome}`, variazione, saldo: saldo + variazione, edizioneId: ed.id }),
      });
    }
  }

  for (const v of ctx.inventario) {
    if (v.mpId !== mpId) continue;
    if (v.tipo === "conteggio") {
      lista.push({
        data: v.data,
        ordine: 1,
        descrizione: "Conteggio",
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
        descrizione: descr,
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
