import { movimentoSuEdizione, type CalcoloEdizione } from "./calcoli";
import { capacita } from "./modelli";
import type { Dati, Edizione, Movimento, Parte } from "./types";

export type StatoPasso = "ok" | "warn" | "todo";

export interface PassoChecklist {
  id: string;
  etichetta: string;
  stato: StatoPasso;
  scheda: string;
  dettaglio?: string;
}

/** Porzioni of fixed/offered menu vs paying guests; warn if they diverge a lot. */
export function avvisoPorzioniPaganti(ed: Edizione, calc: CalcoloEdizione): string[] {
  const out: string[] = [];
  for (const cp of calc.parti) {
    const p = cp.parte;
    if (capacita(p).menu !== "offerto") continue;
    const porzioni = p.menu.reduce((s, m) => s + (m.qtaReale || m.qtaPrevista || 0), 0);
    const paganti = cp.reale.paganti || cp.previsto.paganti || 0;
    if (!porzioni || !paganti) continue;
    const scarto = Math.abs(porzioni - paganti) / Math.max(porzioni, paganti);
    if (scarto > 0.15)
      out.push(
        `${p.nome}: ${Math.round(porzioni)} porzioni vs ${paganti} paganti (differenza ${Math.round(scarto * 100)}%). È voluto?`,
      );
  }
  return out;
}

function haMenu(ed: Edizione) {
  return ed.parti.some((p) => capacita(p).menu && p.menu.length > 0);
}
function haAcquisti(ed: Edizione) {
  return ed.parti.some((p) => p.acquisti.length > 0);
}
function haRealiMenu(ed: Edizione) {
  return ed.parti.some((p) => p.menu.some((m) => m.qtaReale > 0) || (p.ingresso && (p.ingresso.venditeGiorno > 0 || p.ingresso.prevendite > 0)));
}
function haAvanziOmagazzino(ed: Edizione) {
  return ed.parti.some((p) => p.acquisti.some((a) => a.lottiReali > 0 || a.daMagazzino > 0 || a.rimanenza > 0));
}

export function checklistEdizione(ed: Edizione, calc: CalcoloEdizione, movimenti: Movimento[]): PassoChecklist[] {
  const nMov = movimenti.filter((m) => movimentoSuEdizione(m, ed.id)).length;
  const gapRicavi = Math.abs(calc.quadratura.ricavi);
  const menuOk = !haMenu(ed) || ed.parti.every((p) => !capacita(p).menu || p.menu.length > 0);
  const prezziOk = !calc.avvisi.some((a) => a.toLowerCase().includes("prezzo") || a.toLowerCase().includes("ricetta"));

  return [
    {
      id: "menu",
      etichetta: "Menu",
      scheda: "s:menu",
      stato: !haMenu(ed) ? "ok" : menuOk && prezziOk ? "ok" : prezziOk ? "todo" : "warn",
      dettaglio: !haMenu(ed) ? "Nessun menu (solo materiali/ingressi)" : prezziOk ? undefined : "Prezzi o ricette incompleti",
    },
    {
      id: "spesa",
      etichetta: "Spesa",
      scheda: "s:acquisti",
      stato: !haAcquisti(ed) ? "todo" : calc.avvisi.some((a) => a.toLowerCase().includes("rimanen")) ? "warn" : "ok",
      dettaglio: !haAcquisti(ed) ? "Aggiungi gli acquisti o apri la lista della spesa" : undefined,
    },
    {
      id: "reali",
      etichetta: "Reali",
      scheda: "riepilogo",
      stato: ed.stato === "pianificata" ? "todo" : haRealiMenu(ed) || haAvanziOmagazzino(ed) || calc.haReali ? "ok" : "todo",
      dettaglio: ed.stato === "pianificata" ? "Segna l'edizione conclusa e inserisci le quantità reali" : undefined,
    },
    {
      id: "cassa",
      etichetta: "Cassa",
      scheda: "movimenti",
      stato: nMov === 0 ? "todo" : gapRicavi > 20 ? "warn" : "ok",
      dettaglio:
        nMov === 0
          ? "Registra l'incasso e i pagamenti"
          : gapRicavi > 20
            ? `Incassi e ricavi differiscono di ${Math.round(gapRicavi)} €`
            : undefined,
    },
    {
      id: "chiusura",
      etichetta: "Chiusura",
      scheda: "riepilogo",
      stato: ed.stato === "chiusa" ? "ok" : calc.avvisi.length > 3 ? "warn" : "todo",
      dettaglio: ed.stato === "chiusa" ? "Edizione chiusa" : "Chiudi quando i conti sono a posto",
    },
  ];
}

export function spiegazioneSuggerimento(
  mediaPerPartecipante: number | undefined,
  media: number | undefined,
  partecipantiPrevisti: number | undefined,
  giacenza: number,
  qtaLotto: number | undefined,
): { testo: string; senzaPartecipanti: boolean } | undefined {
  const senzaPartecipanti = !(partecipantiPrevisti && mediaPerPartecipante !== undefined);
  const fabbisogno =
    !senzaPartecipanti && mediaPerPartecipante !== undefined && partecipantiPrevisti
      ? mediaPerPartecipante * partecipantiPrevisti
      : media;
  if (fabbisogno === undefined) return undefined;
  const netto = Math.max(0, fabbisogno - Math.max(0, giacenza));
  const conf = qtaLotto ? Math.ceil(netto / qtaLotto - 1e-9) : undefined;
  if (senzaPartecipanti) {
    return {
      senzaPartecipanti: true,
      testo: `Media storica ${media?.toFixed(1) ?? "–"} − magazzino ${giacenza.toFixed(1)} = ${netto.toFixed(1)}${conf !== undefined ? ` → ${conf} conf.` : ""} (inserisci i partecipanti previsti per un calcolo più preciso)`,
    };
  }
  return {
    senzaPartecipanti: false,
    testo: `${mediaPerPartecipante!.toFixed(2)} × ${partecipantiPrevisti} − ${giacenza.toFixed(1)} in stock = ${netto.toFixed(1)}${conf !== undefined ? ` → ${conf} conf.` : ""}`,
  };
}

export function comuniNetti(ed: Edizione, reale: boolean) {
  let uscite = 0;
  let entrate = 0;
  for (const c of ed.comuni) {
    const v = reale ? c.importoReale : c.importoPrevisto;
    if (c.tipo === "uscita") uscite += v;
    else entrate += v;
  }
  return { uscite, entrate, netti: uscite - entrate };
}

/** Parts of an evening: label as Cena vs Bar when possible. */
export function etichettaParteBreve(p: Parte): string {
  if (p.tipo === "servizio") return "Cena";
  if (p.tipo === "bar") return "Bar";
  if (p.tipo === "lotteria") return "Lotteria";
  if (p.tipo === "materiali") return p.nome;
  if (p.tipo === "ingressi") return "Ingressi";
  return p.nome;
}
