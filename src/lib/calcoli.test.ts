import { describe, expect, it } from "vitest";
import {
  annoSociale,
  aperturaAnno,
  calcolaEdizione,
  costoArticolo,
  flussiMensili,
  intervalloAnno,
  listinoAl,
  prezzoMPAl,
  riepilogoCassa,
  saldoInventario,
  storicoInventario,
} from "./calcoli";
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
    eventi: [{ id: "festa", nome: "Festa con bar", tipologia: "Festa con bar" }],
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
  const ed: Edizione = {
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
  };
  ctx.movimenti = [
    mov({ data: "2025-11-12", tipo: "entrata", importo: 1200, stato: "ufficiale", edizioneId: "h25" }),
    mov({ data: "2025-11-12", tipo: "uscita", importo: 300, stato: "previsto", edizioneId: "h25" }),
  ];

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
    const chiusa = { ...ed, menu: [{ ...ed.menu[0], prezzoFissato: 9, costoFissato: 1 }] };
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
