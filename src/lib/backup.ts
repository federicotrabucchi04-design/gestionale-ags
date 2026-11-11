import { annoSociale, calcolaEdizione, costoArticolo, costoUnitario, importoFirmato, oggiISO, prezzoMPAl, saldoInventario } from "./calcoli";
import { COLLEZIONI, IMPOSTAZIONI_DEFAULT, type Dati } from "./types";

export const VERSIONE_BACKUP = 1;

export interface FileBackup {
  app: "gestionale-ags";
  versione: number;
  creato: string;
  dati: Partial<Dati>;
}

function scarica(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function esportaJson(dati: Dati) {
  const file: FileBackup = { app: "gestionale-ags", versione: VERSIONE_BACKUP, creato: new Date().toISOString(), dati };
  scarica(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }), `gestionale-ags-backup-${oggiISO()}.json`);
}

export function leggiBackup(testo: string): Partial<Dati> {
  const json = JSON.parse(testo) as FileBackup | Partial<Dati>;
  const dati = ("app" in json && json.app === "gestionale-ags" ? json.dati : json) as Partial<Dati>;
  const valido = COLLEZIONI.some((c) => Array.isArray(dati[c]));
  if (!valido) throw new Error("Il file non sembra un backup del Gestionale AGS");
  const out: Partial<Dati> = {};
  for (const c of COLLEZIONI) if (Array.isArray(dati[c])) (out as Record<string, unknown>)[c] = dati[c];
  if (dati.impostazioni) out.impostazioni = { ...IMPOSTAZIONI_DEFAULT, ...dati.impostazioni, id: "impostazioni" };
  return out;
}

export async function esportaExcel(dati: Dati) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestionale AGS";
  const euro = '€ #,##0.00;[Red]-€ #,##0.00';
  const oggi = oggiISO();

  const foglio = (nome: string, colonne: { header: string; key: string; width?: number; euro?: boolean }[], righe: Record<string, unknown>[]) => {
    const ws = wb.addWorksheet(nome, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = colonne.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16, style: c.euro ? { numFmt: euro } : undefined }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0FE" } };
    righe.forEach((r) => ws.addRow(r));
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colonne.length } };
  };

  const nomeEd = (id?: string) => dati.edizioni.find((e) => e.id === id)?.nome ?? "";
  const nomeForn = (id?: string) => dati.fornitori.find((f) => f.id === id)?.nome ?? "";
  const nomeMp = (id: string) => dati.materiePrime.find((m) => m.id === id)?.nome ?? "";
  foglio(
    "Movimenti",
    [
      { header: "Data", key: "data", width: 12 },
      { header: "Anno sociale", key: "anno", width: 12 },
      { header: "Descrizione", key: "descrizione", width: 32 },
      { header: "Categoria", key: "categoria" },
      { header: "Tipo", key: "tipo", width: 10 },
      { header: "Stato", key: "stato", width: 12 },
      { header: "Importo", key: "importo", euro: true },
      { header: "Importo firmato", key: "firmato", euro: true },
      { header: "Edizione", key: "edizione", width: 24 },
      { header: "Fornitore", key: "fornitore" },
      { header: "Note", key: "note", width: 30 },
    ],
    [...dati.movimenti]
      .sort((a, b) => (a.data < b.data ? -1 : 1))
      .map((m) => ({
        ...m,
        anno: annoSociale(m.data),
        firmato: importoFirmato(m),
        edizione: nomeEd(m.edizioneId) || "Ordinaria",
        fornitore: nomeForn(m.fornitoreId),
      })),
  );

  foglio(
    "Edizioni",
    [
      { header: "Evento", key: "evento", width: 22 },
      { header: "Edizione", key: "nome", width: 24 },
      { header: "Data", key: "data", width: 12 },
      { header: "Stato", key: "stato", width: 12 },
      { header: "Ricavi previsti", key: "ricaviPrev", euro: true },
      { header: "Ricavi reali", key: "ricaviReali", euro: true },
      { header: "Margine previsto", key: "margPrev", euro: true },
      { header: "Margine reale", key: "margReale", euro: true },
      { header: "Costi extra reali", key: "extra", euro: true },
      { header: "Entrate cassa", key: "entrate", euro: true },
      { header: "Uscite cassa", key: "uscite", euro: true },
      { header: "Netto cassa", key: "netto", euro: true },
    ],
    dati.edizioni.map((e) => {
      const c = calcolaEdizione(e, dati);
      return {
        evento: dati.eventi.find((x) => x.id === e.eventoId)?.nome,
        nome: e.nome,
        data: e.data,
        stato: e.stato,
        ricaviPrev: c.previsto.ricavi,
        ricaviReali: c.reale.ricavi,
        margPrev: c.previsto.margineFinale,
        margReale: c.reale.margineFinale,
        extra: c.reale.extra,
        entrate: c.cassa.entrateUfficiali,
        uscite: c.cassa.usciteUfficiali,
        netto: c.cassa.netto,
      };
    }),
  );

  foglio(
    "Menu edizioni",
    [
      { header: "Edizione", key: "ed", width: 24 },
      { header: "Articolo", key: "art", width: 24 },
      { header: "Prezzo", key: "prezzo", euro: true },
      { header: "Costo vivo", key: "costo", euro: true },
      { header: "Qtà prevista", key: "qp" },
      { header: "Qtà reale", key: "qr" },
      { header: "Ricavo reale", key: "ricavo", euro: true },
      { header: "Margine dopo extra", key: "margine", euro: true },
    ],
    dati.edizioni.flatMap((e) =>
      calcolaEdizione(e, dati).menu.map((m) => ({
        ed: e.nome,
        art: m.articolo?.nome,
        prezzo: m.prezzo,
        costo: m.costoVivo,
        qp: m.riga.qtaPrevista,
        qr: m.riga.qtaReale,
        ricavo: m.reale.ricavo,
        margine: m.reale.margineDopoExtra,
      })),
    ),
  );

  foglio(
    "Acquisti edizioni",
    [
      { header: "Edizione", key: "ed", width: 24 },
      { header: "Materia prima", key: "mp", width: 24 },
      { header: "Lotti previsti", key: "lp" },
      { header: "Lotti comprati", key: "lr" },
      { header: "Dal magazzino", key: "dm" },
      { header: "Avanzato", key: "rim" },
      { header: "Consumo", key: "cons" },
      { header: "Spesa", key: "spesa", euro: true },
      { header: "Costo consumato", key: "cc", euro: true },
    ],
    dati.edizioni.flatMap((e) =>
      calcolaEdizione(e, dati).acquisti.map((a) => ({
        ed: e.nome,
        mp: a.mp?.nome,
        lp: a.riga.lottiPrevisti,
        lr: a.riga.lottiReali,
        dm: a.riga.daMagazzino,
        rim: a.riga.rimanenza,
        cons: a.consumo,
        spesa: a.costoAcquisto,
        cc: a.costoConsumato,
      })),
    ),
  );

  foglio(
    "Articoli",
    [
      { header: "Codice", key: "codice", width: 10 },
      { header: "Articolo", key: "nome", width: 24 },
      { header: "Categoria", key: "categoria" },
      { header: "Costo vivo oggi", key: "costo", euro: true },
      ...[...dati.listini]
        .sort((a, b) => (a.validoDal < b.validoDal ? -1 : 1))
        .map((l) => ({ header: `${l.nome} (${l.validoDal})`, key: `l_${l.id}`, euro: true, width: 18 })),
      { header: "Ricetta", key: "ricetta", width: 50 },
    ],
    dati.articoli.map((a) => {
      const r: Record<string, unknown> = {
        codice: a.codice,
        nome: a.nome,
        categoria: a.categoria,
        costo: costoArticolo(a, oggi, dati).costoVivo,
        ricetta: a.ricetta.map((x) => `${nomeMp(x.mpId)} ${x.qta}`).join("; "),
      };
      dati.listini.forEach((l) => (r[`l_${l.id}`] = l.prezzi[a.id]));
      return r;
    }),
  );

  foglio(
    "Prezzi materie prime",
    [
      { header: "Codice", key: "codice", width: 10 },
      { header: "Materia prima", key: "nome", width: 24 },
      { header: "U.M.", key: "um", width: 8 },
      { header: "Valido dal", key: "dal", width: 12 },
      { header: "Fornitore", key: "forn" },
      { header: "Costo lotto", key: "costo", euro: true },
      { header: "Qtà lotto", key: "qta" },
      { header: "Costo / U.M.", key: "cum", euro: true },
    ],
    dati.prezziMP.map((p) => {
      const m = dati.materiePrime.find((x) => x.id === p.mpId);
      return { codice: m?.codice, nome: m?.nome, um: m?.um, dal: p.validoDal, forn: nomeForn(p.fornitoreId), costo: p.costoLotto, qta: p.qtaLotto, cum: costoUnitario(p) };
    }),
  );

  foglio(
    "Inventario",
    [
      { header: "Codice", key: "codice", width: 10 },
      { header: "Materia prima", key: "nome", width: 24 },
      { header: "Saldo", key: "saldo" },
      { header: "U.M.", key: "um", width: 8 },
      { header: "Valore", key: "valore", euro: true },
    ],
    dati.materiePrime.map((m) => {
      const saldo = saldoInventario(m.id, dati, oggi);
      const cum = costoUnitario(prezzoMPAl(dati.prezziMP, m.id, oggi));
      return { codice: m.codice, nome: m.nome, saldo, um: m.um, valore: cum !== undefined ? saldo * cum : undefined };
    }),
  );

  const buffer = await wb.xlsx.writeBuffer();
  scarica(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `gestionale-ags-${oggi}.xlsx`,
  );
}
