import {
  calcolaEdizione,
  movimentoOrdinario,
  nelAnno,
  riepilogoCassa,
  type CalcoloEdizione,
  type RiepilogoCassa,
  type TotaliScenario,
} from "./calcoli";
import { TIPI_EVENTO } from "./modelli";
import type { Dati, Edizione, Movimento } from "./types";

export interface RigaConto {
  voce: string;
  previsto?: number;
  reale?: number;
  forte?: boolean;
  pct?: boolean;
}

/** Profit and loss rows of an edition, shared by the print page and the Excel export. */
export function contoEconomico(calc: CalcoloEdizione): RigaConto[] {
  const { previsto: p, reale: r } = calc;
  const altri = (t: TotaliScenario) => t.extra - t.premi - t.comuni;
  const se = (cond: number, riga: RigaConto) => (cond ? [riga] : []);
  return [
    ...se(p.ricaviMenu || r.ricaviMenu, { voce: "Ricavi menu", previsto: p.ricaviMenu, reale: r.ricaviMenu }),
    ...se(p.ingressi || r.ingressi, { voce: "Coperti e iscrizioni", previsto: p.ingressi, reale: r.ingressi }),
    ...se(p.lotteria || r.lotteria, { voce: "Lotteria", previsto: p.lotteria, reale: r.lotteria }),
    { voce: "Ricavi totali", previsto: p.ricavi, reale: r.ricavi, forte: true },
    { voce: "Costo cibo (ricette)", previsto: -p.costoMenu, reale: -r.costoMenu },
    ...se(p.costoMateriali || r.costoMateriali, { voce: "Materiali usati (netto avanzi)", previsto: -p.costoMateriali, reale: -r.costoMateriali }),
    { voce: "Costi extra", previsto: -altri(p), reale: -altri(r) },
    ...se(p.premi || r.premi, { voce: "Premi lotteria", previsto: -p.premi, reale: -r.premi }),
    ...se(p.comuni || r.comuni, { voce: "Costi comuni (netti)", previsto: -p.comuni, reale: -r.comuni }),
    { voce: "Margine finale", previsto: p.margineFinale, reale: r.margineFinale, forte: true },
    { voce: "Margine %", previsto: p.marginePct, reale: r.marginePct, pct: true },
    { voce: "Spesa acquisti", previsto: -p.costoAcquisti, reale: -r.costoAcquisti },
    { voce: "Avanzi riportati in magazzino", reale: r.costoAcquisti - r.costoConsumato },
  ];
}

export interface RigaEventoAnno {
  edizione: Edizione;
  evento: string;
  tipo: string;
  calc: CalcoloEdizione;
}

export interface BilancioAnno {
  anno: string;
  cassa: RiepilogoCassa;
  categorie: { categoria: string; entrate: number; uscite: number }[];
  eventi: RigaEventoAnno[];
  ordinaria: { entrate: number; uscite: number };
  movimenti: Movimento[];
}

/** Social-year balance: cash summary, totals by category, one row per edition. */
export function bilancioAnno(anno: string, dati: Dati): BilancioAnno {
  const movimenti = dati.movimenti.filter((m) => nelAnno(m.data, anno)).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  const cat = new Map<string, { entrate: number; uscite: number }>();
  const ordinaria = { entrate: 0, uscite: 0 };
  for (const m of movimenti) {
    if (m.stato !== "ufficiale") continue;
    const c = cat.get(m.categoria) ?? { entrate: 0, uscite: 0 };
    if (m.tipo === "entrata") c.entrate += m.importo;
    else c.uscite += m.importo;
    cat.set(m.categoria, c);
    if (movimentoOrdinario(m)) {
      if (m.tipo === "entrata") ordinaria.entrate += m.importo;
      else ordinaria.uscite += m.importo;
    }
  }
  const eventi = dati.edizioni
    .filter((e) => nelAnno(e.data, anno))
    .sort((a, b) => (a.data < b.data ? -1 : 1))
    .map((e) => {
      const ev = dati.eventi.find((x) => x.id === e.eventoId);
      return { edizione: e, evento: ev?.nome ?? "", tipo: ev ? TIPI_EVENTO[ev.tipo]?.etichetta : "", calc: calcolaEdizione(e, dati) };
    });
  return {
    anno,
    cassa: riepilogoCassa(anno, dati.impostazioni, dati.movimenti),
    categorie: [...cat.entries()].map(([categoria, v]) => ({ categoria, ...v })).sort((a, b) => b.entrate + b.uscite - (a.entrate + a.uscite)),
    eventi,
    ordinaria,
    movimenti,
  };
}
