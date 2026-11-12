import { describe, expect, it } from "vitest";
import { comuniNetti, etichettaParteBreve, spiegazioneSuggerimento } from "./checklist";
import type { Edizione, Parte } from "./types";

describe("checklist helpers", () => {
  it("etichettaParteBreve mappa i tipi comuni", () => {
    expect(etichettaParteBreve({ tipo: "servizio", nome: "Cena del sabato" } as Parte)).toBe("Cena");
    expect(etichettaParteBreve({ tipo: "bar", nome: "Bar serata" } as Parte)).toBe("Bar");
    expect(etichettaParteBreve({ tipo: "materiali", nome: "Allestimento" } as Parte)).toBe("Allestimento");
  });

  it("comuniNetti sottrae le entrate comuni", () => {
    const ed = {
      comuni: [
        { tipo: "uscita", importoPrevisto: 100, importoReale: 120 },
        { tipo: "entrata", importoPrevisto: 20, importoReale: 30 },
      ],
    } as Edizione;
    expect(comuniNetti(ed, false)).toEqual({ uscite: 100, entrate: 20, netti: 80 });
    expect(comuniNetti(ed, true)).toEqual({ uscite: 120, entrate: 30, netti: 90 });
  });

  it("spiegazioneSuggerimento segnala assenza partecipanti", () => {
    const senza = spiegazioneSuggerimento(undefined, 10, undefined, 2, 1);
    expect(senza?.senzaPartecipanti).toBe(true);
    expect(senza?.testo).toContain("Media storica");
    const con = spiegazioneSuggerimento(0.5, 10, 40, 2, 1);
    expect(con?.senzaPartecipanti).toBe(false);
    expect(con?.testo).toContain("0.50 × 40");
  });
});
