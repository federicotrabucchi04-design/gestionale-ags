import { describe, expect, it } from "vitest";
import {
  annoSociale,
  aperturaAnno,
  calcolaEdizione,
  cassaEdizione,
  costoArticolo,
  flussiMensili,
  importoSuEdizione,
  intervalloAnno,
  listinoAl,
  movimentoOrdinario,
  normalizzaQuoteMovimento,
  prezzoMPAl,
  quoteCostoFisso,
  quoteMovimento,
  riepilogoCassa,
  saldoInventario,
  storicoInventario,
  suggerimentoAcquisto,
  usoStorico,
  venditeStoriche,
} from "./calcoli";
import { copiaStruttura, normalizzaEdizione, strutturaBase } from "./modelli";
import { IMPOSTAZIONI_DEFAULT, type Dati, type Edizione, type Movimento } from "./types";

const mov = (p: Partial<Movimento> & Pick<Movimento, "data" | "tipo" | "importo" | "stato">): Movimento => ({
  id: Math.random().toString(36),
  descrizione: "",
  categoria: "Altro",
  ...p,
});

describe("anno sociale", () => {
  it("va dal 1 ottobre al 30 settembre", () => {
    expect(annoSociale("2026-10-01")).toBe("2026/27");
    expect(annoSociale("2027-09-30")).toBe("2026/27");
    expect(annoSociale("2026-09-30")).toBe("2025/26");
    expect(intervalloAnno("2026/27")).toEqual({ da: "2026-10-01", a: "2027-09-30" });
    expect(annoSociale("2099-12-01")).toBe("2099/00");
  });
});

describe("cassa (numeri del file Excel attuale)", () => {
  const movimenti: Movimento[] = [
    mov({ data: "2026-10-05", tipo: "entrata", importo: 510, stato: "ufficiale", descrizione: "Tesseramento" }),
    mov({ data: "2026-10-10", tipo: "uscita", importo: 120, stato: "ufficiale", descrizione: "Bombole gas" }),
    mov({ data: "2026-10-12", tipo: "uscita", importo: 25, stato: "ufficiale", descrizione: "Pulizie" }),
    mov({ data: "2026-10-20", tipo: "uscita", importo: 100, stato: "previsto", descrizione: "Luce" }),
    mov({ data: "2026-11-16", tipo: "entrata", importo: 2300, stato: "ufficiale", edizioneId: "h26" }),
    mov({ data: "2026-11-08", tipo: "uscita", importo: 430, stato: "ufficiale", edizioneId: "h26" }),
    mov({ data: "2026-11-16", tipo: "uscita", importo: 500, stato: "ufficiale", edizioneId: "h26" }),
    mov({ data: "2026-11-07", tipo: "uscita", importo: 500, stato: "previsto", edizioneId: "h26" }),
  ];
  const impostazioni = { ...IMPOSTAZIONI_DEFAULT, saldiApertura: { "2026/27": 11 } };

  it("calcola cassa, spese previste e disponibilità netta", () => {
    const r = riepilogoCassa("2026/27", impostazioni, movimenti);
    expect(r.apertura).toBe(11);
    expect(r.cassa).toBe(11 + 510 - 120 - 25 + 2300 - 430 - 500);
    expect(r.spesePrevisteOrdinarie).toBe(100);
    expect(r.spesePrevisteEventi).toBe(500);
    expect(r.disponibilitaNetta).toBe(r.cassa - 600);
  });

  it("riporta il saldo di chiusura all'anno dopo", () => {
    expect(aperturaAnno("2027/28", impostazioni, movimenti)).toBe(1746);
    expect(aperturaAnno("2020/21", impostazioni, movimenti)).toBe(0);
  });

  it("somma tutte le edizioni dell'anno, non solo una", () => {
    const due = [...movimenti, mov({ data: "2027-03-01", tipo: "entrata", importo: 1000, stato: "ufficiale", edizioneId: "altra" })];
    expect(riepilogoCassa("2026/27", impostazioni, due).cassa).toBe(2746);
  });

  it("crea il flusso mensile con saldo progressivo", () => {
    const f = flussiMensili("2026/27", 11, movimenti);
    expect(f).toHaveLength(12);
    expect(f[0]).toMatchObject({ mese: "2026-10", entrate: 510, uscite: 145, saldo: 376 });
    expect(f[1]).toMatchObject({ mese: "2026-11", entrate: 2300, uscite: 930, saldo: 1746 });
    expect(f[11].saldo).toBe(1746);
  });

  it("ripartisce una fattura su più edizioni in cassa per competenza", () => {
    const fattura = mov({
      data: "2026-12-01",
      tipo: "uscita",
      importo: 300,
      stato: "ufficiale",
      quote: [
        { edizioneId: "natale24", importo: 100 },
        { edizioneId: "natale25", importo: 200 },
      ],
    });
    expect(quoteMovimento(fattura)).toHaveLength(2);
    expect(importoSuEdizione(fattura, "natale24")).toBe(100);
    expect(importoSuEdizione(fattura, "natale25")).toBe(200);
    expect(movimentoOrdinario(fattura)).toBe(false);
    expect(cassaEdizione([fattura], "natale24").usciteUfficiali).toBe(100);
    expect(cassaEdizione([fattura], "natale25").usciteUfficiali).toBe(200);
    const norm = normalizzaQuoteMovimento(fattura);
    expect(norm.edizioneId).toBeUndefined();
    expect(norm.quote).toHaveLength(2);
  });
});

function contesto(): Dati {
  return {
    fornitori: [{ id: "f1", nome: "Bosco" }],
    materiePrime: [
      { id: "pane", codice: "MP-01", nome: "Pane", um: "kg", attiva: true },
      { id: "salsiccia", codice: "MP-02", nome: "Salsiccia", um: "kg", attiva: true },
      { id: "birra", codice: "MP-03", nome: "Birra", um: "l", attiva: true },
    ],
    prezziMP: [
      { id: "p1", mpId: "pane", validoDal: "2025-09-30", costoLotto: 30, qtaLotto: 10 },
      { id: "p2", mpId: "salsiccia", validoDal: "2025-09-30", costoLotto: 100, qtaLotto: 10 },
      { id: "p3", mpId: "salsiccia", validoDal: "2026-06-01", costoLotto: 120, qtaLotto: 10 },
      { id: "p4", mpId: "birra", validoDal: "2025-09-30", costoLotto: 60, qtaLotto: 30 },
    ],
    articoli: [
      {
        id: "panino",
        codice: "ART-01",
        nome: "Panino salsiccia",
        categoria: "Cucina",
        um: "pz",
        attivo: true,
        ricetta: [
          { mpId: "pane", qta: 0.1 },
          { mpId: "salsiccia", qta: 0.12 },
        ],
      },
      { id: "birra04", codice: "ART-02", nome: "Birra 0,4", categoria: "Bar", um: "pz", attivo: true, ricetta: [{ mpId: "birra", qta: 0.4 }] },
    ],
    listini: [
      { id: "l25", nome: "Listino 2025", validoDal: "2025-09-30", prezzi: { panino: 5, birra04: 4 } },
      { id: "l26", nome: "Listino 2026", validoDal: "2026-10-01", prezzi: { panino: 6, birra04: 4.5 } },
    ],
    costiFissi: [{ id: "gas", nome: "Bombola gas", costoTotale: 100, baseRiparto: 400, articoliIds: ["panino"], attivo: true }],
    eventi: [{ id: "festa", nome: "Festa con bar", tipo: "festa" }],
    edizioni: [],
    movimenti: [],
    inventario: [],
    impostazioni: IMPOSTAZIONI_DEFAULT,
    accesso: { id: "accesso", emails: [] },
  };
}

describe("prezzi datati", () => {
  const ctx = contesto();
  it("usa il prezzo valido alla data", () => {
    expect(prezzoMPAl(ctx.prezziMP, "salsiccia", "2025-11-11")?.costoLotto).toBe(100);
    expect(prezzoMPAl(ctx.prezziMP, "salsiccia", "2026-11-11")?.costoLotto).toBe(120);
    expect(prezzoMPAl(ctx.prezziMP, "salsiccia", "2025-01-01")).toBeUndefined();
    expect(listinoAl(ctx.listini, "2025-11-11")?.id).toBe("l25");
    expect(listinoAl(ctx.listini, "2026-11-11")?.id).toBe("l26");
  });

  it("compone il costo vivo con ricetta e quota costi fissi", () => {
    const c = costoArticolo(ctx.articoli[0], "2025-11-11", ctx);
    expect(c.materie).toBeCloseTo(0.1 * 3 + 0.12 * 10);
    expect(c.quotaFissi).toBeCloseTo(0.25);
    expect(c.costoVivo).toBeCloseTo(1.75);
    expect(c.completo).toBe(true);
    const dopo = costoArticolo(ctx.articoli[0], "2026-11-11", ctx);
    expect(dopo.costoVivo).toBeCloseTo(0.3 + 1.44 + 0.25);
  });

  it("segnala prezzi mancanti", () => {
    const c = costoArticolo(ctx.articoli[0], "2024-01-01", ctx);
    expect(c.completo).toBe(false);
    expect(c.avvisi.length).toBeGreaterThan(0);
  });
});

describe("edizione previsto/reale", () => {
  const ctx = contesto();
  // Saved in the old single-menu format: it must convert to one "Bar" part with identical numbers.
  const ed: Edizione = normalizzaEdizione({
    id: "h25",
    eventoId: "festa",
    nome: "Halloween 2025",
    data: "2025-11-11",
    stato: "conclusa",
    menu: [
      { id: "m1", articoloId: "panino", qtaPrevista: 50, qtaReale: 48 },
      { id: "m2", articoloId: "birra04", qtaPrevista: 200, qtaReale: 225 },
    ],
    acquisti: [{ id: "a1", mpId: "birra", lottiPrevisti: 3, lottiReali: 4, daMagazzino: 0, rimanenza: 20 }],
    costiExtra: [{ id: "x1", descrizione: "Musica", importoPrevisto: 500, importoReale: 546, ripartisci: true }],
  });
  ctx.movimenti = [
    mov({ data: "2025-11-12", tipo: "entrata", importo: 1200, stato: "ufficiale", edizioneId: "h25" }),
    mov({ data: "2025-11-12", tipo: "uscita", importo: 300, stato: "previsto", edizioneId: "h25" }),
  ];

  it("converte il vecchio formato in una parte Bar", () => {
    expect(ed.parti).toHaveLength(1);
    expect(ed.parti[0]).toMatchObject({ tipo: "bar", nome: "Bar" });
    expect(ed.parti[0].menu).toHaveLength(2);
    expect(ed.comuni).toEqual([]);
    expect("menu" in ed).toBe(false);
  });

  it("calcola ricavi, costi e margini", () => {
    const c = calcolaEdizione(ed, ctx);
    expect(c.listino?.id).toBe("l25");
    expect(c.previsto.ricavi).toBe(50 * 5 + 200 * 4);
    expect(c.reale.ricavi).toBe(48 * 5 + 225 * 4);
    expect(c.reale.pezzi).toBe(273);
    expect(c.menu[0].reale.quotaExtra).toBeCloseTo(546 / 273);
    expect(c.reale.costoMenu).toBeCloseTo(48 * 1.75 + 225 * 0.8);
    expect(c.reale.margineFinale).toBeCloseTo(c.reale.ricavi - c.reale.costoMenu - 546);
    expect(c.cassa.entrateUfficiali).toBe(1200);
    expect(c.cassa.uscitePreviste).toBe(300);
    expect(c.avvisi).toEqual([]);
  });

  it("calcola acquisti, consumi e rimanenze", () => {
    const a = calcolaEdizione(ed, ctx).acquisti[0];
    expect(a.acquistato).toBe(120);
    expect(a.consumo).toBe(100);
    expect(a.costoConsumato).toBeCloseTo(200);
    expect(a.costoAcquisto).toBe(240);
    expect(a.nettoMagazzino).toBe(20);
  });

  it("mantiene i valori fissati di una edizione chiusa", () => {
    const chiusa = { ...ed, parti: [{ ...ed.parti[0], menu: [{ ...ed.parti[0].menu[0], prezzoFissato: 9, costoFissato: 1 }] }] };
    const c = calcolaEdizione(chiusa, ctx);
    expect(c.menu[0].prezzo).toBe(9);
    expect(c.menu[0].costoVivo).toBe(1);
  });

  it("aggiorna l'inventario con rimanenze e conteggi", () => {
    const dati = { ...ctx, edizioni: [ed] };
    expect(saldoInventario("birra", dati, "2026-01-01")).toBe(20);
    dati.inventario = [
      { id: "c1", mpId: "birra", data: "2025-12-01", tipo: "conteggio", quantita: 18 },
      { id: "c2", mpId: "birra", data: "2025-12-05", tipo: "scarico", quantita: 3 },
    ];
    const storia = storicoInventario("birra", dati, "2026-01-01");
    expect(storia[1].conteggio).toEqual({ calcolato: 20, differenza: -2 });
    expect(saldoInventario("birra", dati, "2026-01-01")).toBe(15);
  });

  it("ignora le edizioni future non concluse", () => {
    const futura = { ...ed, id: "f", data: "2030-01-01", stato: "pianificata" as const };
    expect(saldoInventario("birra", { ...ctx, edizioni: [futura] }, "2026-01-01")).toBe(0);
  });
});

describe("edizione a parti (Festa del Bosco)", () => {
  const ctx = contesto();
  const base = strutturaBase("bosco", "2026-07-10", {
    serate: [
      { nome: "Venerdì", data: "2026-07-10", formula: "bar" },
      { nome: "Sabato", data: "2026-07-11", formula: "cenaFissa" },
    ],
  });
  const [bar1, cena, bar2, lotteria] = base.parti;
  cena.ingresso = { prezzo: 25, previsti: 100, prevendite: 80, venditeGiorno: 10, presenze: 88 };
  cena.menu = [{ id: "c1", articoloId: "panino", qtaPrevista: 100, qtaReale: 95 }];
  bar1.menu = [{ id: "b1", articoloId: "birra04", qtaPrevista: 100, qtaReale: 100 }];
  bar2.menu = [{ id: "b2", articoloId: "birra04", qtaPrevista: 50, qtaReale: 60 }];
  lotteria.lotteria = {
    prezzoBiglietto: 2,
    bigliettiStampati: 1000,
    vendutiPrevisti: 500,
    vendutiReali: 600,
    premi: [
      { id: "p1", descrizione: "Cesto", valore: 80, donato: false },
      { id: "p2", descrizione: "Bici", valore: 300, donato: true },
    ],
  };
  base.serate![0].peso = 1;
  base.serate![1].peso = 3;
  const ed: Edizione = {
    id: "bosco26",
    eventoId: "bosco",
    nome: "Bosco 2026",
    data: "2026-07-10",
    stato: "conclusa",
    ...base,
    comuni: [
      { id: "s", descrizione: "Service audio", tipo: "uscita", importoPrevisto: 400, importoReale: 400 },
      { id: "sp", descrizione: "Sponsor", tipo: "entrata", importoPrevisto: 0, importoReale: 100 },
    ],
  };
  const c = calcolaEdizione(ed, ctx);

  it("crea serate con servizio e bar separati, più la lotteria", () => {
    expect(ed.serate).toHaveLength(2);
    expect(ed.parti.map((p) => p.nome)).toEqual(["Bar e musica", "Cena a menu fisso", "Bar dopo cena", "Lotteria"]);
    expect(cena.serataId).toBe(ed.serate![1].id);
  });

  it("conta la cena a menu fisso dai coperti pagati, non dal listino", () => {
    const pc = c.parti.find((p) => p.parte.id === cena.id)!;
    expect(pc.reale.ingressi).toBe(25 * 90);
    expect(pc.reale.ricaviMenu).toBe(0);
    expect(pc.menu[0].offerto).toBe(true);
    expect(pc.reale.costoMenu).toBeCloseTo(95 * 1.99);
    expect(pc.previsto.ingressi).toBe(2500);
  });

  it("calcola la lotteria con i soli premi acquistati come costo", () => {
    const pl = c.parti.find((p) => p.parte.id === lotteria.id)!;
    expect(pl.reale.lotteria).toBe(1200);
    expect(pl.reale.premi).toBe(80);
    expect(pl.reale.margineFinale).toBe(1120);
  });

  it("ripartisce i costi comuni netti fra le serate con i pesi", () => {
    expect(c.reale.comuni).toBe(300);
    const [ven, sab, lot] = c.unita;
    expect(ven.reale.comuni).toBeCloseTo(300 * (1 / 4));
    expect(sab.reale.comuni).toBeCloseTo(300 * (3 / 4));
    expect(lot.nome).toBe("Lotteria");
    expect(lot.reale.comuni).toBe(0);
    const sommaMargini = c.unita.reduce((s, u) => s + u.reale.margine, 0);
    expect(sommaMargini).toBeCloseTo(c.reale.margineFinale);
  });

  it("copia l'edizione: i reali diventano previsti e le serate seguono la nuova data", () => {
    const copia = copiaStruttura(ed, "2027-07-09", { menu: true, acquisti: true, extra: true });
    expect(copia.serate![1].data).toBe("2027-07-10");
    const nuovaCena = copia.parti[1];
    expect(nuovaCena.serataId).toBe(copia.serate![1].id);
    expect(nuovaCena.id).not.toBe(cena.id);
    expect(nuovaCena.menu[0]).toMatchObject({ qtaPrevista: 95, qtaReale: 0 });
    expect(nuovaCena.ingresso).toMatchObject({ prezzo: 25, previsti: 90, prevendite: 0 });
    expect(copia.parti[3].lotteria?.vendutiPrevisti).toBe(600);
    expect(copia.comuni[0]).toMatchObject({ importoPrevisto: 400, importoReale: 0 });
  });
});

describe("riparto dei costi fissi (esempio del documento)", () => {
  const ctx: Dati = {
    ...contesto(),
    materiePrime: [{ id: "x", codice: "X", nome: "Costo", um: "eur", attiva: true }],
    prezziMP: [{ id: "px", mpId: "x", validoDal: "2025-01-01", costoLotto: 1, qtaLotto: 1 }],
    articoli: [
      { id: "coca", codice: "A1", nome: "Coca", categoria: "Bar", um: "pz", attivo: true, ricetta: [{ mpId: "x", qta: 0.8 }] },
      { id: "pan", codice: "A2", nome: "Panino", categoria: "Cucina", um: "pz", attivo: true, ricetta: [{ mpId: "x", qta: 2.5 }] },
    ],
    listini: [{ id: "l", nome: "L", validoDal: "2025-01-01", prezzi: { coca: 3, pan: 6 } }],
    costiFissi: [{ id: "cf", nome: "Comune", costoTotale: 150, baseRiparto: 200, articoliIds: ["coca", "pan"], attivo: true }],
  };
  ctx.edizioni = [
    normalizzaEdizione({
      id: "e",
      eventoId: "festa",
      nome: "E",
      data: "2025-06-01",
      stato: "chiusa",
      menu: [
        { id: "1", articoloId: "coca", qtaPrevista: 100, qtaReale: 100 },
        { id: "2", articoloId: "pan", qtaPrevista: 100, qtaReale: 100 },
      ],
    }),
  ];

  it("dà gli stessi numeri del commento con i tre metodi", () => {
    const q = quoteCostoFisso(ctx.costiFissi[0], "2025-07-01", ctx);
    expect(q.get("coca")!.pezzo).toBeCloseTo(0.75);
    expect(q.get("pan")!.pezzo).toBeCloseTo(0.75);
    expect(q.get("coca")!.prezzo).toBeCloseTo(0.5);
    expect(q.get("pan")!.prezzo).toBeCloseTo(1);
    expect(q.get("coca")!.margine).toBeCloseTo(0.579, 3);
    expect(q.get("pan")!.margine).toBeCloseTo(0.921, 3);
    for (const m of ["pezzo", "prezzo", "margine"] as const) {
      expect(100 * q.get("coca")![m] + 100 * q.get("pan")![m]).toBeCloseTo(150);
    }
  });

  it("usa il metodo scelto nel costo vivo", () => {
    const cf = { ...ctx.costiFissi[0], metodo: "prezzo" as const };
    const c = costoArticolo(ctx.articoli[1], "2025-07-01", { ...ctx, costiFissi: [cf] });
    expect(c.quotaFissi).toBeCloseTo(1);
    expect(c.quoteFisse[0].alternative.pezzo).toBeCloseTo(0.75);
  });
});

describe("storico e suggerimenti", () => {
  const ctx = contesto();
  const edizione = (id: string, data: string, venduti: number, lotti: number, avanzo: number, partecipanti: number): Edizione =>
    normalizzaEdizione({
      id,
      eventoId: "festa",
      nome: id,
      data,
      stato: "chiusa",
      partecipantiReali: partecipanti,
      menu: [{ id: `${id}m`, articoloId: "birra04", qtaPrevista: 0, qtaReale: venduti }],
      acquisti: [{ id: `${id}a`, mpId: "birra", lottiPrevisti: 0, lottiReali: lotti, daMagazzino: 0, rimanenza: avanzo }],
    });
  ctx.edizioni = [edizione("e1", "2025-10-15", 200, 4, 30, 100), edizione("e2", "2026-03-01", 300, 4, 0, 150)];
  const nuova = { id: "n", eventoId: "festa", data: "2026-07-01" };

  it("calcola l'uso medio e per partecipante delle ultime edizioni", () => {
    const s = usoStorico("birra", nuova, ctx);
    expect(s.edizioni.map((e) => e.valore)).toEqual([120, 90]);
    expect(s.media).toBe(105);
    expect(s.mediaPerPartecipante).toBeCloseTo((0.9 + 0.8) / 2);
    expect(venditeStoriche("birra04", nuova, ctx.edizioni).media).toBe(250);
  });

  it("suggerisce quanto comprare togliendo il magazzino", () => {
    const s = usoStorico("birra", nuova, ctx);
    expect(suggerimentoAcquisto(s, 200, 20)).toBeCloseTo(0.85 * 200 - 20);
    expect(suggerimentoAcquisto(s, undefined, 200)).toBe(0);
    expect(suggerimentoAcquisto({ edizioni: [] }, 100, 0)).toBeUndefined();
  });
});
