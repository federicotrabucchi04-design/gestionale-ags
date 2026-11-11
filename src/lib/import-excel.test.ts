import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { leggiBackup } from "./backup";
import { calcolaEdizione, costoArticolo, riepilogoCassa } from "./calcoli";
import { DATI_VUOTI, type Dati } from "./types";

const FILE = resolve(__dirname, "../../../_import/ags-da-excel.json");

describe.skipIf(!existsSync(FILE))("dati importati dal file Excel", () => {
  const dati: Dati = { ...DATI_VUOTI, ...leggiBackup(readFileSync(FILE, "utf-8")) };

  it("riproduce la cassa della Home Excel", () => {
    const c = riepilogoCassa("2026/27", dati.impostazioni, dati.movimenti);
    expect(c.apertura).toBe(11);
    expect(c.cassa).toBeCloseTo(1746);
    expect(c.spesePrevisteOrdinarie).toBeCloseTo(100);
    expect(c.spesePrevisteEventi).toBeCloseTo(500);
    expect(c.disponibilitaNetta).toBeCloseTo(1146);
  });

  it("calcola l'edizione Halloween 2026 come il foglio Festa", () => {
    const ed = dati.edizioni.find((e) => e.nome.includes("2026"))!;
    const c = calcolaEdizione(ed, dati);
    expect(c.cassa.entrateUfficiali).toBe(2300);
    expect(c.cassa.usciteUfficiali).toBe(930);
    expect(c.cassa.uscitePreviste).toBe(500);
    expect(c.menu).toHaveLength(7);
    expect(c.reale.extra).toBe(500);
    expect(c.acquisti).toHaveLength(8);
  });

  it("applica la quota gas solo agli articoli inclusi", () => {
    const panino = dati.articoli.find((a) => a.codice === "ART-04")!;
    const coca = dati.articoli.find((a) => a.codice === "ART-01")!;
    expect(costoArticolo(panino, "2026-11-11", dati).quotaFissi).toBeCloseTo(0.25);
    expect(costoArticolo(coca, "2026-11-11", dati).quotaFissi).toBe(0);
  });
});
