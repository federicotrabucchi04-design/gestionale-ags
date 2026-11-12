import { describe, expect, it } from "vitest";
import { puoGestireImpostazioni, puoScrivereCollezione, ruoloDi } from "./ruoli";
import { EMAIL_PROPRIETARIO, type Accesso } from "./types";

const accesso = (emails: string[], ruoli?: Accesso["ruoli"]): Accesso => ({
  id: "accesso",
  emails,
  ruoli,
});

describe("ruoli soft", () => {
  it("il proprietario è sempre admin", () => {
    expect(ruoloDi(EMAIL_PROPRIETARIO, accesso([EMAIL_PROPRIETARIO], { [EMAIL_PROPRIETARIO]: "lettura" }))).toBe("admin");
  });

  it("default cassa per email in lista senza ruolo esplicito", () => {
    expect(ruoloDi("volontario@ags.it", accesso(["volontario@ags.it"]))).toBe("cassa");
  });

  it("rispetta il ruolo esplicito", () => {
    expect(ruoloDi("letto@ags.it", accesso(["letto@ags.it"], { "letto@ags.it": "lettura" }))).toBe("lettura");
  });

  it("cassa scrive movimenti ma non prezziario", () => {
    expect(puoScrivereCollezione("cassa", "movimenti")).toBe(true);
    expect(puoScrivereCollezione("cassa", "articoli")).toBe(false);
    expect(puoGestireImpostazioni("cassa")).toBe(false);
    expect(puoGestireImpostazioni("admin")).toBe(true);
  });
});
