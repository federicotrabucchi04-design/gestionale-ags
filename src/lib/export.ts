import type { Workbook } from "exceljs";
import { scarica } from "./backup";
import type { CalcoloEdizione } from "./calcoli";
import { edizioniDelMovimento, importoSuEdizione, movimentoSuEdizione, quoteMovimento } from "./calcoli";
import { bilancioAnno, contoEconomico } from "./report";
import type { Dati, Edizione } from "./types";

const EURO = "€ #,##0.00;[Red]-€ #,##0.00";

interface Colonna {
  header: string;
  key: string;
  width?: number;
  euro?: boolean;
  pct?: boolean;
}

function foglio(wb: Workbook, nome: string, colonne: Colonna[], righe: Record<string, unknown>[], titolo?: string) {
  const ws = wb.addWorksheet(nome.slice(0, 31));
  if (titolo) {
    ws.addRow([titolo]).font = { bold: true, size: 14 };
    ws.addRow([]);
  }
  const inizio = ws.rowCount + 1;
  ws.columns = colonne.map((c) => ({ key: c.key, width: c.width ?? 16, style: c.euro ? { numFmt: EURO } : c.pct ? { numFmt: "0.0%" } : undefined }));
  const testa = ws.getRow(inizio);
  colonne.forEach((c, i) => (testa.getCell(i + 1).value = c.header));
  testa.font = { bold: true };
  testa.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0FE" } };
  for (const r of righe) {
    const row = ws.addRow(colonne.map((c) => r[c.key] as never));
    if (r._forte) row.font = { bold: true };
  }
  ws.views = [{ state: "frozen", ySplit: inizio }];
}

async function nuovoWorkbook(): Promise<Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestionale AGS";
  return wb;
}

async function salvaWorkbook(wb: Workbook, nome: string) {
  const buffer = await wb.xlsx.writeBuffer();
  scarica(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), nome);
}

const nomeFile = (s: string) => s.replace(/[^\w\- ]+/g, "-").replace(/\s+/g, "_");

/** Edition balance in Excel. The reduced version keeps only the profit and loss and the evenings. */
export async function esportaEdizioneExcel(ed: Edizione, calc: CalcoloEdizione, dati: Dati, completo = true) {
  const wb = await nuovoWorkbook();
  foglio(
    wb,
    "Conto economico",
    [
      { header: "Voce", key: "voce", width: 34 },
      { header: "Previsto", key: "previsto", euro: true },
      { header: "Reale", key: "reale", euro: true },
      { header: "Differenza", key: "diff", euro: true },
    ],
    contoEconomico(calc).map((r) =>
      r.pct
        ? { voce: r.voce, previsto: r.previsto !== undefined ? `${Math.round(r.previsto * 100)}%` : "", reale: r.reale !== undefined ? `${Math.round(r.reale * 100)}%` : "" }
        : { voce: r.voce, previsto: r.previsto, reale: r.reale, diff: r.previsto !== undefined && r.reale !== undefined ? r.reale - r.previsto : undefined, _forte: r.forte },
    ),
    `${ed.nome} - ${ed.data}`,
  );
  if (calc.unita.length > 1)
    foglio(
      wb,
      "Serate e parti",
      [
        { header: "Serata / parte", key: "nome", width: 26 },
        { header: "Ricavi previsti", key: "rp", euro: true },
        { header: "Margine previsto", key: "mp", euro: true },
        { header: "Ricavi reali", key: "rr", euro: true },
        { header: "Costi reali", key: "cr", euro: true },
        { header: "Quota comuni", key: "qc", euro: true },
        { header: "Margine reale", key: "mr", euro: true },
        { header: "Paganti", key: "pag" },
      ],
      calc.unita.map((u) => ({
        nome: u.nome,
        rp: u.previsto.ricavi,
        mp: u.previsto.margine,
        rr: u.reale.ricavi,
        cr: u.reale.costi,
        qc: u.reale.comuni,
        mr: u.reale.margine,
        pag: u.reale.paganti || undefined,
      })),
    );
  if (completo) {
    const parte = (id: string) => ed.parti.find((p) => p.id === id)?.nome ?? "";
    foglio(
      wb,
      "Menu",
      [
        { header: "Parte", key: "parte", width: 20 },
        { header: "Articolo", key: "art", width: 26 },
        { header: "Prezzo", key: "prezzo", euro: true },
        { header: "Costo vivo", key: "costo", euro: true },
        { header: "Qtà prevista", key: "qp" },
        { header: "Qtà reale", key: "qr" },
        { header: "Ricavo reale", key: "ricavo", euro: true },
        { header: "Margine dopo extra", key: "marg", euro: true },
      ],
      calc.menu.map((m) => ({
        parte: parte(m.parteId),
        art: m.articolo?.nome,
        prezzo: m.offerto ? undefined : m.prezzo,
        costo: m.costoVivo,
        qp: m.riga.qtaPrevista,
        qr: m.riga.qtaReale,
        ricavo: m.reale.ricavo,
        marg: m.reale.margineDopoExtra,
      })),
    );
    foglio(
      wb,
      "Acquisti",
      [
        { header: "Parte", key: "parte", width: 20 },
        { header: "Voce", key: "mp", width: 26 },
        { header: "Conf. previste", key: "lp" },
        { header: "Conf. comprate", key: "lr" },
        { header: "Presi dal magazzino", key: "dm" },
        { header: "Riportati", key: "rim" },
        { header: "Usati", key: "cons" },
        { header: "% uso", key: "pct", pct: true },
        { header: "Spesa", key: "spesa", euro: true },
        { header: "Costo usato", key: "cc", euro: true },
      ],
      calc.acquisti.map((a) => ({
        parte: parte(a.parteId),
        mp: a.mp?.nome,
        lp: a.riga.lottiPrevisti,
        lr: a.riga.lottiReali,
        dm: a.riga.daMagazzino,
        rim: a.riga.rimanenza,
        cons: a.consumo,
        pct: a.percentualeConsumo,
        spesa: a.costoAcquisto,
        cc: a.costoConsumato,
      })),
    );
    foglio(
      wb,
      "Costi extra e comuni",
      [
        { header: "Parte", key: "parte", width: 20 },
        { header: "Descrizione", key: "desc", width: 30 },
        { header: "Previsto", key: "p", euro: true },
        { header: "Reale", key: "r", euro: true },
      ],
      [
        ...ed.parti.flatMap((p) => p.costiExtra.map((c) => ({ parte: p.nome, desc: c.descrizione, p: c.importoPrevisto, r: c.importoReale }))),
        ...ed.comuni.map((c) => ({
          parte: "Comune",
          desc: `${c.descrizione}${c.tipo === "entrata" ? " (entrata)" : ""}`,
          p: c.tipo === "entrata" ? -c.importoPrevisto : c.importoPrevisto,
          r: c.tipo === "entrata" ? -c.importoReale : c.importoReale,
        })),
      ],
    );
    foglio(
      wb,
      "Movimenti",
      [
        { header: "Data", key: "data", width: 12 },
        { header: "Descrizione", key: "descrizione", width: 34 },
        { header: "Categoria", key: "categoria" },
        { header: "Stato", key: "stato", width: 11 },
        { header: "Importo", key: "firmato", euro: true },
      ],
      dati.movimenti
        .filter((m) => movimentoSuEdizione(m, ed.id))
        .sort((a, b) => (a.data < b.data ? -1 : 1))
        .map((m) => {
          const quota = importoSuEdizione(m, ed.id);
          return { ...m, firmato: m.tipo === "entrata" ? quota : -quota };
        }),
    );
  }
  await salvaWorkbook(wb, `${nomeFile(ed.nome)}${completo ? "" : "_sintesi"}.xlsx`);
}

/** Social-year balance in Excel: summary, categories, events, and (complete version) every movement. */
export async function esportaAnnoExcel(anno: string, dati: Dati, completo = true) {
  const b = bilancioAnno(anno, dati);
  const wb = await nuovoWorkbook();
  const c = b.cassa;
  foglio(
    wb,
    "Bilancio",
    [
      { header: "Voce", key: "voce", width: 36 },
      { header: "Importo", key: "v", euro: true },
    ],
    [
      { voce: "Cassa di apertura", v: c.apertura },
      { voce: "Entrate ufficiali", v: c.entrateUfficiali },
      { voce: "Uscite ufficiali", v: -c.usciteUfficiali },
      { voce: "Cassa attuale", v: c.cassa, _forte: true },
      { voce: "di cui gestione ordinaria (entrate − uscite)", v: b.ordinaria.entrate - b.ordinaria.uscite },
      { voce: "di cui eventi (netto di cassa)", v: b.eventi.reduce((s, e) => s + e.calc.cassa.netto, 0) },
      { voce: "Spese ordinarie ancora previste", v: -c.spesePrevisteOrdinarie },
      { voce: "Spese eventi ancora previste", v: -c.spesePrevisteEventi },
      { voce: "Entrate ancora previste", v: c.entratePreviste },
      { voce: "Disponibilità netta", v: c.disponibilitaNetta, _forte: true },
    ],
    `Bilancio anno sociale ${anno}`,
  );
  foglio(
    wb,
    "Per categoria",
    [
      { header: "Categoria", key: "categoria", width: 28 },
      { header: "Entrate", key: "entrate", euro: true },
      { header: "Uscite", key: "uscite", euro: true },
      { header: "Netto", key: "netto", euro: true },
    ],
    b.categorie.map((x) => ({ ...x, netto: x.entrate - x.uscite })),
  );
  foglio(
    wb,
    "Eventi",
    [
      { header: "Data", key: "data", width: 12 },
      { header: "Tipo", key: "tipo", width: 22 },
      { header: "Edizione", key: "nome", width: 26 },
      { header: "Stato", key: "stato", width: 11 },
      { header: "Ricavi", key: "ricavi", euro: true },
      { header: "Margine", key: "margine", euro: true },
      { header: "Margine %", key: "pct", pct: true },
      { header: "Entrate cassa", key: "entrate", euro: true },
      { header: "Uscite cassa", key: "uscite", euro: true },
      { header: "Netto cassa", key: "netto", euro: true },
    ],
    b.eventi.map((e) => {
      const t = e.calc.haReali ? e.calc.reale : e.calc.previsto;
      return {
        data: e.edizione.data,
        tipo: e.tipo,
        nome: e.edizione.nome,
        stato: e.edizione.stato,
        ricavi: t.ricavi,
        margine: t.margineFinale,
        pct: t.marginePct,
        entrate: e.calc.cassa.entrateUfficiali,
        uscite: e.calc.cassa.usciteUfficiali,
        netto: e.calc.cassa.netto,
      };
    }),
  );
  if (completo) {
    const nomeEd = (id: string) => dati.edizioni.find((e) => e.id === id)?.nome ?? id;
    const etichettaEd = (m: (typeof b.movimenti)[number]) => {
      const ids = edizioniDelMovimento(m);
      if (!ids.length) return "Ordinaria";
      return quoteMovimento(m)
        .map((q) => `${nomeEd(q.edizioneId)} (${q.importo})`)
        .join(" · ");
    };
    foglio(
      wb,
      "Movimenti",
      [
        { header: "Data", key: "data", width: 12 },
        { header: "Descrizione", key: "descrizione", width: 34 },
        { header: "Categoria", key: "categoria", width: 20 },
        { header: "Edizione / riparto", key: "ed", width: 36 },
        { header: "Stato", key: "stato", width: 11 },
        { header: "Importo", key: "firmato", euro: true },
      ],
      b.movimenti.map((m) => ({ ...m, ed: etichettaEd(m), firmato: m.tipo === "entrata" ? m.importo : -m.importo })),
    );
  }
  await salvaWorkbook(wb, `Bilancio_${anno.replace("/", "-")}${completo ? "" : "_sintesi"}.xlsx`);
}
