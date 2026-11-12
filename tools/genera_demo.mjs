/**
 * Builds realistic demo data for social years 23/24–26/27.
 * Output: ../_import/ags-demo-anni.json (import from Impostazioni — affianca existing data).
 *
 * Run: node tools/genera_demo.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const OUT = join(QUI, "..", "..", "_import", "ags-demo-anni.json");
const id = (p) => `demo-${p}`;
const uid = () => id(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

const ANNI = [
  { etichetta: "23/24", inizio: "2023-10-01", halloween: "2023-11-04", bosco: "2024-06-14", cammina: "2024-05-05", natale: "2023-12-08" },
  { etichetta: "24/25", inizio: "2024-10-01", halloween: "2024-11-02", bosco: "2025-06-13", cammina: "2025-05-04", natale: "2024-12-07" },
  { etichetta: "25/26", inizio: "2025-10-01", halloween: "2025-11-01", bosco: "2026-06-12", cammina: "2026-05-03", natale: "2025-12-06" },
  { etichetta: "26/27", inizio: "2026-10-01", halloween: "2026-10-31", bosco: "2027-06-11", cammina: "2027-05-02", natale: "2026-12-05" },
];

function piu(data, n) {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function parte(tipo, nome, extra = {}) {
  const p = { id: uid(), nome, tipo, peso: 1, menu: [], acquisti: [], costiExtra: [], ...extra };
  if (tipo === "servizio" && !p.formula) p.formula = "carta";
  if ((tipo === "ingressi" || (tipo === "servizio" && p.formula === "fisso")) && !p.ingresso)
    p.ingresso = { prezzo: tipo === "servizio" ? 25 : 15, previsti: 80, prevendite: 0, venditeGiorno: 0, presenze: 0 };
  if (tipo === "lotteria" && !p.lotteria)
    p.lotteria = { prezzoBiglietto: 1, bigliettiStampati: 500, vendutiPrevisti: 350, vendutiReali: 0, premi: [] };
  return p;
}

function struttura(tipo, data) {
  if (tipo === "bosco") {
    const serate = [
      { id: uid(), nome: "Venerdì", data, formula: "bar", peso: 1 },
      { id: uid(), nome: "Sabato", data: piu(data, 1), formula: "cenaFissa", peso: 1 },
      { id: uid(), nome: "Domenica", data: piu(data, 2), formula: "pranzoCena", peso: 1 },
      { id: uid(), nome: "Lunedì", data: piu(data, 3), formula: "cenaCarta", peso: 1 },
    ];
    const parti = serate.flatMap((s) => {
      const attach = (p) => ({ ...p, serataId: s.id });
      if (s.formula === "cenaFissa") return [parte("servizio", "Cena a menu fisso", { formula: "fisso" }), parte("bar", "Bar dopo cena")].map(attach);
      if (s.formula === "cenaCarta") return [parte("servizio", "Cena alla carta", { formula: "carta" }), parte("bar", "Bar dopo cena")].map(attach);
      if (s.formula === "pranzoCena")
        return [parte("servizio", "Pranzo alla carta", { formula: "carta" }), parte("servizio", "Cena alla carta", { formula: "carta" }), parte("bar", "Bar")].map(attach);
      return [parte("bar", "Bar e musica")].map(attach);
    });
    parti.push(parte("lotteria", "Lotteria", { peso: 0 }));
    return { parti, serate };
  }
  if (tipo === "cammina")
    return {
      parti: [parte("ingressi", "Iscrizioni", { peso: 0 }), ...[1, 2, 3, 4, 5].map((i) => parte("tappa", `Tappa ${i}`)), parte("bar", "Bar")],
    };
  if (tipo === "natale") return { presepe: "fermo", parti: [parte("materiali", "Presepe"), parte("materiali", "Albero di Natale"), parte("generica", "Capodanno")] };
  return { parti: [parte("bar", "Bar")] };
}

function riempi(parti, fattore, reali) {
  return parti.map((p) => {
    const conMenu = ["bar", "servizio", "tappa", "generica"].includes(p.tipo);
    const conAcq = !["ingressi", "lotteria"].includes(p.tipo);
    const q = (base) => Math.round(base * fattore);
    return {
      ...p,
      menu: conMenu
        ? [
            { id: uid(), articoloId: "demo-art-birra", qtaPrevista: q(120), qtaReale: reali ? q(110) : 0 },
            { id: uid(), articoloId: "demo-art-panino", qtaPrevista: q(80), qtaReale: reali ? q(75) : 0 },
          ]
        : [],
      acquisti: conAcq
        ? [
            { id: uid(), mpId: "demo-mp-birra", lottiPrevisti: Math.max(1, q(10)), lottiReali: reali ? Math.max(1, q(10)) : 0, daMagazzino: reali ? 1 : 0, rimanenza: reali ? 2 : 0 },
            {
              id: uid(),
              mpId: p.tipo === "materiali" ? "demo-mp-legno" : "demo-mp-pane",
              lottiPrevisti: Math.max(1, q(5)),
              lottiReali: reali ? Math.max(1, q(5)) : 0,
              daMagazzino: 0,
              rimanenza: reali ? 1 : 0,
              scadenza: reali && p.tipo !== "materiali" ? piu(parti[0] ? "2027-01-01" : "2027-01-01", 60) : undefined,
            },
          ]
        : [],
      costiExtra:
        p.tipo === "bar" || p.serataId
          ? [{ id: uid(), descrizione: "Musica / SIAE", importoPrevisto: q(300), importoReale: reali ? q(290) : 0, ripartisci: true }]
          : [],
      ingresso: p.ingresso
        ? {
            ...p.ingresso,
            previsti: q(p.ingresso.previsti || 80),
            prevendite: reali ? q(50) : 0,
            venditeGiorno: reali ? q(28) : 0,
            presenze: reali ? q(70) : 0,
          }
        : undefined,
      lotteria: p.lotteria
        ? {
            ...p.lotteria,
            bigliettiStampati: q(500),
            vendutiPrevisti: q(350),
            vendutiReali: reali ? q(320) : 0,
            premi: [
              { id: uid(), descrizione: "Cesto natalizio", valore: 50, donato: true },
              { id: uid(), descrizione: "Cena per due", valore: 80, donato: false },
            ],
          }
        : undefined,
    };
  });
}

function edizione(eventoId, nome, data, tipo, fattore, pianificata) {
  const s = struttura(tipo, data);
  return {
    id: id(`ed-${eventoId}-${data}`),
    eventoId,
    nome,
    data,
    partecipantiPrevisti: Math.round(150 * fattore),
    partecipantiReali: pianificata ? undefined : Math.round(140 * fattore),
    stato: pianificata ? "pianificata" : "chiusa",
    parti: riempi(s.parti, fattore, !pianificata),
    serate: s.serate,
    comuni: s.serate
      ? [
          { id: uid(), descrizione: "Tensostruttura", tipo: "uscita", importoPrevisto: Math.round(800 * fattore), importoReale: pianificata ? 0 : Math.round(780 * fattore) },
          { id: uid(), descrizione: "Sponsor comune", tipo: "entrata", importoPrevisto: 200, importoReale: pianificata ? 0 : 200 },
        ]
      : [],
    presepe: s.presepe,
  };
}

const eventi = [
  { id: id("ev-halloween"), nome: "Halloween AGS (demo)", tipo: "festa", descrizione: "Serie demo affiancata ai dati reali" },
  { id: id("ev-bosco"), nome: "Festa del Bosco (demo)", tipo: "bosco" },
  { id: id("ev-cammina"), nome: "Cammina e Spizzigola (demo)", tipo: "cammina" },
  { id: id("ev-natale"), nome: "Natale e Capodanno (demo)", tipo: "natale" },
];

const edizioni = [];
const movimenti = [];

ANNI.forEach((a, i) => {
  const fattore = 0.75 + i * 0.1;
  const pianificata = i === ANNI.length - 1;
  const lista = [
    edizione(eventi[0].id, `Halloween ${a.etichetta}`, a.halloween, "festa", fattore, pianificata),
    edizione(eventi[1].id, `Bosco ${a.etichetta}`, a.bosco, "bosco", fattore * 1.2, pianificata),
    edizione(eventi[2].id, `Cammina ${a.etichetta}`, a.cammina, "cammina", fattore * 0.8, pianificata),
    edizione(eventi[3].id, `Natale ${a.etichetta}`, a.natale, "natale", fattore, pianificata),
  ];
  for (const ed of lista) {
    edizioni.push(ed);
    if (!pianificata) {
      movimenti.push(
        { id: uid(), data: ed.data, descrizione: `Incasso ${ed.nome}`, tipo: "entrata", importo: Math.round(2200 * fattore), stato: "ufficiale", categoria: "Incassi evento", edizioneId: ed.id },
        { id: uid(), data: ed.data, descrizione: `Fornitori ${ed.nome}`, tipo: "uscita", importo: Math.round(1400 * fattore), stato: "ufficiale", categoria: "Fornitori", edizioneId: ed.id },
      );
    }
  }
  movimenti.push(
    { id: uid(), data: a.inizio, descrizione: `Tesseramento ${a.etichetta}`, tipo: "entrata", importo: 480 + i * 30, stato: "ufficiale", categoria: "Incassi evento" },
    { id: uid(), data: a.inizio.slice(0, 8) + "15", descrizione: `Utenze ${a.etichetta}`, tipo: "uscita", importo: 90 + i * 10, stato: "ufficiale", categoria: "Utenze" },
  );
});

const demo = {
  eventi,
  edizioni,
  movimenti,
  materiePrime: [
    { id: "demo-mp-birra", codice: "DEMO-BIR", nome: "Birra fusto (demo)", um: "l", attiva: true, genere: "consumo" },
    { id: "demo-mp-pane", codice: "DEMO-PAN", nome: "Pane hamburger (demo)", um: "pz", attiva: true, genere: "consumo" },
    { id: "demo-mp-legno", codice: "DEMO-LEG", nome: "Legno abete (demo)", um: "m", attiva: true, genere: "materiale" },
  ],
  prezziMP: [
    { id: id("prz-birra"), mpId: "demo-mp-birra", validoDal: "2023-10-01", costoLotto: 45, qtaLotto: 30, fornitoreId: id("forn") },
    { id: id("prz-pane"), mpId: "demo-mp-pane", validoDal: "2023-10-01", costoLotto: 12, qtaLotto: 40, fornitoreId: id("forn") },
    { id: id("prz-legno"), mpId: "demo-mp-legno", validoDal: "2023-10-01", costoLotto: 25, qtaLotto: 3 },
  ],
  articoli: [
    { id: "demo-art-birra", codice: "DEMO-A1", nome: "Birra alla spina (demo)", categoria: "Bevande", um: "pz", attivo: true, ricetta: [{ mpId: "demo-mp-birra", qta: 0.4 }] },
    { id: "demo-art-panino", codice: "DEMO-A2", nome: "Panino (demo)", categoria: "Cibo", um: "pz", attivo: true, ricetta: [{ mpId: "demo-mp-pane", qta: 1 }] },
  ],
  listini: [{ id: id("listino"), nome: "Listino demo", validoDal: "2023-10-01", prezzi: { "demo-art-birra": 3.5, "demo-art-panino": 5 } }],
  fornitori: [{ id: id("forn"), nome: "Fornitore Demo SRL", contatto: "demo@example.com" }],
  // No impostazioni: importing must not wipe the live opening balances or category lists.
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ app: "gestionale-ags", versione: 1, creato: new Date().toISOString(), dati: demo }, null, 2));
console.log(`Scritto ${OUT}`);
console.log(`${eventi.length} eventi, ${edizioni.length} edizioni, ${movimenti.length} movimenti`);
