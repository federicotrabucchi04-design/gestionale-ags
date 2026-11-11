import type { StatoEdizione } from "./types";

export const STATI: Record<StatoEdizione, { etichetta: string; tono: "primario" | "positivo" | "neutro"; spiegazione: string }> = {
  pianificata: { etichetta: "Pianificata", tono: "primario", spiegazione: "In preparazione: compila le previsioni." },
  conclusa: { etichetta: "Conclusa", tono: "positivo", spiegazione: "Evento fatto: inserisci quantità reali e rimanenze." },
  chiusa: { etichetta: "Chiusa", tono: "neutro", spiegazione: "Prezzi e costi congelati: le modifiche al prezziario non la cambiano più." },
};
