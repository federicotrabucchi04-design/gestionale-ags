import {
  calcolaEdizione,
  costoArticolo,
  costoUnitario,
  listinoAl,
  nelAnno,
  prezzoMPAl,
  saldoInventario,
  type CalcoloEdizione,
} from "./calcoli";
import { TIPI_EVENTO } from "./modelli";
import type { Dati, Edizione, Evento, MateriaPrima } from "./types";

export type Semaforo = "verde" | "giallo" | "rosso" | "neutro";

export function semaforoMargine(marginePct: number | undefined, obiettivo: number): Semaforo {
  if (marginePct === undefined) return "neutro";
  if (marginePct >= obiettivo) return "verde";
  if (marginePct >= obiettivo / 2) return "giallo";
  return "rosso";
}

export interface PuntoEvento {
  edizione: Edizione;
  evento: Evento;
  calc: CalcoloEdizione;
  ricavi: number;
  margine: number;
  marginePct?: number;
  nettoCassa: number;
  spesa: number;
}

export function puntiEventiAnno(anno: string, dati: Dati): PuntoEvento[] {
  return dati.edizioni
    .filter((e) => nelAnno(e.data, anno))
    .sort((a, b) => (a.data < b.data ? -1 : 1))
    .map((edizione) => {
      const evento = dati.eventi.find((e) => e.id === edizione.eventoId)!;
      const calc = calcolaEdizione(edizione, dati);
      const t = calc.haReali ? calc.reale : calc.previsto;
      return {
        edizione,
        evento,
        calc,
        ricavi: t.ricavi,
        margine: t.margineFinale,
        marginePct: t.marginePct,
        nettoCassa: calc.cassa.netto,
        spesa: calc.haReali ? calc.reale.costoAcquisti + calc.reale.extra : calc.previsto.costoAcquisti + calc.previsto.extra,
      };
    })
    .filter((p) => p.evento);
}

export interface PrezzoAnalisi {
  articoloId: string;
  nome: string;
  categoria: string;
  prezzo?: number;
  costoVivo?: number;
  margine?: number;
  marginePct?: number;
  semaforo: Semaforo;
  pezziAnno: number;
}

export function analisiPrezzi(anno: string, dati: Dati, oggi: string): PrezzoAnalisi[] {
  const obiettivo = dati.impostazioni.margineObiettivo ?? 0.4;
  const listino = listinoAl(dati.listini, oggi);
  const pezzi = new Map<string, number>();
  for (const ed of dati.edizioni.filter((e) => nelAnno(e.data, anno))) {
    for (const m of calcolaEdizione(ed, dati).menu) {
      if (m.offerto) continue;
      pezzi.set(m.riga.articoloId, (pezzi.get(m.riga.articoloId) ?? 0) + (m.reale.qta || m.previsto.qta || 0));
    }
  }
  return dati.articoli
    .filter((a) => a.attivo)
    .map((a) => {
      const prezzo = listino?.prezzi[a.id];
      const costo = costoArticolo(a, oggi, dati);
      const margine = prezzo !== undefined ? prezzo - costo.costoVivo : undefined;
      const marginePct = prezzo && prezzo > 0 && margine !== undefined ? margine / prezzo : undefined;
      return {
        articoloId: a.id,
        nome: a.nome,
        categoria: a.categoria,
        prezzo,
        costoVivo: costo.costoVivo,
        margine,
        marginePct,
        semaforo: semaforoMargine(marginePct, obiettivo),
        pezziAnno: pezzi.get(a.id) ?? 0,
      };
    })
    .sort((a, b) => (a.marginePct ?? 99) - (b.marginePct ?? 99));
}

export interface Anomalia {
  tipo: "spesa" | "utilizzo" | "margine" | "quadratura";
  titolo: string;
  dettaglio: string;
  href?: string;
  tono: "attenzione" | "negativo";
}

/** Flags odd cases: spending way above previous editions, very low use %, negative margins, cash mismatch. */
export function anomalie(anno: string, dati: Dati): Anomalia[] {
  const out: Anomalia[] = [];
  const punti = puntiEventiAnno(anno, dati);
  for (const p of punti) {
    const href = `/eventi/${p.evento.id}/${p.edizione.id}`;
    if (p.calc.haReali && p.margine < 0)
      out.push({ tipo: "margine", titolo: `${p.edizione.nome}: margine negativo`, dettaglio: `Perdita di ${Math.round(-p.margine)} €`, href, tono: "negativo" });
    if (Math.abs(p.calc.quadratura.ricavi) > 50 || Math.abs(p.calc.quadratura.costi) > 50)
      out.push({
        tipo: "quadratura",
        titolo: `${p.edizione.nome}: cassa non quadra`,
        dettaglio: `Differenza ricavi ${Math.round(p.calc.quadratura.ricavi)} €, costi ${Math.round(p.calc.quadratura.costi)} €`,
        href,
        tono: "attenzione",
      });
    for (const a of p.calc.acquisti) {
      if (a.percentualeConsumo !== undefined && a.disponibile > 0 && a.percentualeConsumo < 0.4 && a.costoAcquisto > 20)
        out.push({
          tipo: "utilizzo",
          titolo: `${a.mp?.nome ?? "Acquisto"} poco usato a ${p.edizione.nome}`,
          dettaglio: `Usato solo il ${Math.round(a.percentualeConsumo * 100)}% di quanto disponibile`,
          href: `${href}?tab=acquisti`,
          tono: "attenzione",
        });
    }
    const sorelle = dati.edizioni
      .filter((e) => e.eventoId === p.evento.id && e.id !== p.edizione.id && e.stato !== "pianificata" && e.data < p.edizione.data)
      .slice(-3);
    if (sorelle.length && p.calc.haReali) {
      const media = sorelle.reduce((s, e) => s + calcolaEdizione(e, dati).reale.costoAcquisti + calcolaEdizione(e, dati).reale.extra, 0) / sorelle.length;
      if (media > 0 && p.spesa > media * 1.5)
        out.push({
          tipo: "spesa",
          titolo: `${p.edizione.nome}: spesa molto sopra la media`,
          dettaglio: `${Math.round(p.spesa)} € contro una media storica di ${Math.round(media)} €`,
          href,
          tono: "attenzione",
        });
    }
  }
  return out.slice(0, 40);
}

export interface VoceFornitore {
  mp: MateriaPrima;
  pagatoNellAnno: number;
  consumatoNellAnno: number;
  giacenza: number;
  valoreGiacenza: number;
  eventi: { edizione: string; eventoId: string; edizioneId: string; consumato: number; pagato: number }[];
}

export interface AnalisiFornitore {
  fornitoreId: string;
  nome: string;
  pagato: number;
  consumato: number;
  giacenzaValore: number;
  voci: VoceFornitore[];
}

/**
 * Supplier report: cash paid this year vs what was actually used this year,
 * and stock still left that was bought earlier (e.g. panettoni lasting across years).
 */
export function analisiFornitori(anno: string, dati: Dati, oggi: string): AnalisiFornitore[] {
  const mappa = new Map<string, AnalisiFornitore>();
  const get = (fornitoreId: string | undefined): AnalisiFornitore => {
    const id = fornitoreId ?? "";
    if (!mappa.has(id)) {
      mappa.set(id, {
        fornitoreId: id,
        nome: dati.fornitori.find((f) => f.id === id)?.nome ?? "Senza fornitore",
        pagato: 0,
        consumato: 0,
        giacenzaValore: 0,
        voci: [],
      });
    }
    return mappa.get(id)!;
  };

  for (const mp of dati.materiePrime) {
    const prezzo = prezzoMPAl(dati.prezziMP, mp.id, oggi);
    const fornitoreId = prezzo?.fornitoreId;
    const a = get(fornitoreId);
    const cum = costoUnitario(prezzo) ?? 0;
    let pagato = 0;
    let consumato = 0;
    const eventi: VoceFornitore["eventi"] = [];
    for (const ed of dati.edizioni.filter((e) => nelAnno(e.data, anno))) {
      const calc = calcolaEdizione(ed, dati);
      for (const r of calc.acquisti.filter((x) => x.riga.mpId === mp.id)) {
        pagato += r.costoAcquisto;
        consumato += r.costoConsumato;
        if (r.costoAcquisto || r.costoConsumato)
          eventi.push({ edizione: ed.nome, eventoId: ed.eventoId, edizioneId: ed.id, consumato: r.costoConsumato, pagato: r.costoAcquisto });
      }
    }
    for (const m of dati.movimenti.filter((x) => nelAnno(x.data, anno) && x.fornitoreId === fornitoreId && x.tipo === "uscita" && x.stato === "ufficiale" && !x.edizioneId)) {
      // Ordinary supplier payments without an edition stay on the supplier total only.
      a.pagato += m.importo;
    }
    const giacenza = saldoInventario(mp.id, dati, oggi);
    if (pagato || consumato || Math.abs(giacenza) > 0.01) {
      a.pagato += pagato;
      a.consumato += consumato;
      a.giacenzaValore += Math.max(0, giacenza) * cum;
      a.voci.push({ mp, pagatoNellAnno: pagato, consumatoNellAnno: consumato, giacenza, valoreGiacenza: Math.max(0, giacenza) * cum, eventi });
    }
  }
  return [...mappa.values()].filter((f) => f.pagato || f.consumato || f.giacenzaValore).sort((a, b) => b.pagato - a.pagato);
}

export function etichettaTipo(tipo: Evento["tipo"]) {
  return TIPI_EVENTO[tipo]?.etichetta ?? tipo;
}
