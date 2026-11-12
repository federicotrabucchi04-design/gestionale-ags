"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { Aiuto, Griglia, Kpi, RigaValore, Sezione, tonoValore } from "@/components/ui";
import type { CalcoloEdizione } from "@/lib/calcoli";
import { data as fmtData, euro, numero, percento } from "@/lib/format";
import type { Edizione } from "@/lib/types";

interface Riga {
  voce: string;
  prev?: number;
  reale?: number;
  tipo?: "euro" | "num" | "pct";
  forte?: boolean;
  aiuto?: string;
  sempre?: boolean;
}

export default function RiepilogoEdizione({ ed, calc, vai }: { ed: Edizione; calc: CalcoloEdizione; vai: (scheda: string) => void }) {
  const { previsto: p, reale: r, cassa, haReali } = calc;
  const partPrev = ed.partecipantiPrevisti || 0;
  const partReali = ed.partecipantiReali || 0;
  const conMenu = calc.menu.some((m) => !m.offerto);
  const altriExtra = (t: typeof p) => t.extra - t.premi - t.comuni;

  const righe: Riga[] = [
    ...(conMenu ? [{ voce: "Pezzi venduti", prev: p.pezzi, reale: r.pezzi, tipo: "num" as const }, { voce: "Ricavi menu", prev: p.ricaviMenu, reale: r.ricaviMenu }] : []),
    ...(p.ingressi || r.ingressi ? [{ voce: "Coperti e iscrizioni", prev: p.ingressi, reale: r.ingressi, aiuto: "Menu fisso, prevendite, quote d'iscrizione" }] : []),
    ...(p.lotteria || r.lotteria ? [{ voce: "Lotteria", prev: p.lotteria, reale: r.lotteria }] : []),
    { voce: "Ricavi totali", prev: p.ricavi, reale: r.ricavi, forte: true },
    { voce: "Costo cibo (ricette)", prev: -p.costoMenu, reale: -r.costoMenu, aiuto: "Porzioni × costo vivo di ogni articolo (materie prime e costi fissi)" },
    ...(p.costoMateriali || r.costoMateriali
      ? [
          {
            voce: "Materiali e altri acquisti usati",
            prev: -p.costoMateriali,
            reale: -r.costoMateriali,
            aiuto: "Acquisti non coperti dalle ricette: nel reale conta solo quanto usato, al netto degli avanzi riportati in magazzino",
          },
        ]
      : []),
    { voce: "Costi extra", prev: -altriExtra(p), reale: -altriExtra(r), aiuto: "Musica, noleggi e altri costi delle singole parti" },
    ...(p.premi || r.premi ? [{ voce: "Premi lotteria comprati", prev: -p.premi, reale: -r.premi }] : []),
    ...(p.comuni || r.comuni ? [{ voce: "Costi comuni (netti)", prev: -p.comuni, reale: -r.comuni, aiuto: "Voci dell'intera edizione divise fra le serate" }] : []),
    { voce: "Margine finale", prev: p.margineFinale, reale: r.margineFinale, forte: true },
    { voce: "Margine %", prev: p.marginePct, reale: r.marginePct, tipo: "pct" },
    { voce: "Spesa acquisti", prev: -p.costoAcquisti, reale: -r.costoAcquisti, aiuto: "Confezioni × costo, dalle schede Acquisti", sempre: true },
    { voce: "Partecipanti", prev: partPrev || undefined, reale: partReali || undefined, tipo: "num", sempre: true },
    { voce: "Ricavo per partecipante", prev: partPrev ? p.ricavi / partPrev : undefined, reale: partReali ? r.ricavi / partReali : undefined },
  ];

  const fmt = (v: number | undefined, tipo: Riga["tipo"] = "euro") => (tipo === "num" ? numero(v) : tipo === "pct" ? percento(v) : euro(v));

  const articoli = [...calc.menu].filter((m) => m.articolo && !m.offerto).sort((a, b) => b.reale.margineDopoExtra - a.reale.margineDopoExtra);
  const avanzi = r.costoAcquisti - r.costoConsumato;

  return (
    <>
      {calc.avvisi.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <b>Da controllare:</b> {calc.avvisi.slice(0, 4).join(" · ")}
          {calc.avvisi.length > 4 && ` e altri ${calc.avvisi.length - 4}`}
        </Alert>
      )}

      <Griglia min={200}>
        <Kpi etichetta="Ricavi previsti" valore={euro(p.ricavi)} nota={`Margine previsto ${euro(p.margineFinale)}`} />
        <Kpi
          etichetta="Ricavi reali"
          valore={haReali ? euro(r.ricavi) : "-"}
          tono="primario"
          nota={haReali ? `Scostamento ${euro(r.ricavi - p.ricavi)}` : "Inserisci le quantità reali nelle schede"}
        />
        <Kpi
          etichetta="Margine reale"
          valore={haReali ? euro(r.margineFinale) : "-"}
          tono={haReali ? tonoValore(r.margineFinale) : "neutro"}
          nota={haReali ? `${percento(r.marginePct)} dei ricavi` : undefined}
        />
        <Kpi
          etichetta="Netto di cassa"
          valore={euro(cassa.netto)}
          tono={tonoValore(cassa.netto)}
          nota={cassa.uscitePreviste ? `${euro(cassa.uscitePreviste)} ancora da pagare` : "Movimenti ufficiali dell'edizione"}
        />
      </Griglia>

      <Box sx={{ display: "grid", gap: 3, mt: 3, gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" } }}>
        <Box>
          <Sezione titolo="Previsto e reale" sottotitolo="Conto economico dell'edizione" senzaPadding>
            <Box className="tabella-scroll">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Voce</TableCell>
                    <TableCell className="num">Previsto</TableCell>
                    <TableCell className="num">Reale</TableCell>
                    <TableCell className="num">Differenza</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {righe.map((x) => {
                    const diff = x.prev !== undefined && x.reale !== undefined && x.tipo !== "pct" ? x.reale - x.prev : undefined;
                    return (
                      <TableRow key={x.voce} sx={x.forte ? { bgcolor: "#f8f9fb" } : undefined}>
                        <TableCell sx={{ fontWeight: x.forte ? 600 : 400 }}>
                          {x.voce}
                          {x.aiuto && <Aiuto testo={x.aiuto} />}
                        </TableCell>
                        <TableCell className="num" sx={{ fontWeight: x.forte ? 600 : 400 }}>
                          {fmt(x.prev, x.tipo)}
                        </TableCell>
                        <TableCell className="num" sx={{ fontWeight: x.forte ? 600 : 400 }}>
                          {haReali || x.sempre ? fmt(x.reale, x.tipo) : "-"}
                        </TableCell>
                        <TableCell className="num" sx={{ color: diff === undefined || diff === 0 ? "text.secondary" : diff > 0 ? "success.main" : "error.main" }}>
                          {haReali && diff !== undefined ? `${diff > 0 ? "+" : ""}${fmt(diff, x.tipo)}` : ""}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Sezione>

          {calc.unita.length > 1 && (
            <Sezione
              titolo={ed.serate?.length ? "Serate a confronto" : "Parti a confronto"}
              sottotitolo={`${haReali ? "Reale" : "Previsto"}, con la quota dei costi comuni`}
              azioni={
                <Button size="small" onClick={() => vai("comuni")}>
                  Costi comuni
                </Button>
              }
              senzaPadding
            >
              <Box className="tabella-scroll">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell className="num">Ricavi</TableCell>
                      <TableCell className="num">Costi</TableCell>
                      <TableCell className="num">Comuni</TableCell>
                      <TableCell className="num">Margine</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {calc.unita.map((u) => {
                      const v = haReali ? u.reale : u.previsto;
                      return (
                        <TableRow key={u.id} hover sx={{ cursor: "pointer" }} onClick={() => vai(u.id)}>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {u.nome}
                            {u.data && (
                              <Typography component="span" variant="caption" color="text.secondary">
                                {" "}
                                {fmtData(u.data)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell className="num">{euro(v.ricavi)}</TableCell>
                          <TableCell className="num">{euro(v.costi)}</TableCell>
                          <TableCell className="num">{euro(v.comuni)}</TableCell>
                          <TableCell className="num" sx={{ fontWeight: 600, color: v.margine >= 0 ? "success.main" : "error.main" }}>
                            {euro(v.margine)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Sezione>
          )}

          {articoli.length > 0 && (
            <Sezione titolo="Margine per articolo" sottotitolo={haReali ? "Reale, dopo i costi extra ripartiti" : "Previsto, dopo i costi extra ripartiti"}>
              <BarChart
                layout="horizontal"
                height={Math.max(160, articoli.length * 36 + 40)}
                yAxis={[{ scaleType: "band", data: articoli.map((m) => m.articolo!.nome), width: 120 }]}
                xAxis={[{ valueFormatter: (v: number) => `${Math.round(v)} €` }]}
                series={[
                  {
                    data: articoli.map((m) => (haReali ? m.reale.margineDopoExtra : m.previsto.margineDopoExtra)),
                    label: "Margine",
                    color: "#1a73e8",
                    valueFormatter: (v) => euro(v ?? 0),
                  },
                ]}
                hideLegend
                borderRadius={4}
              />
            </Sezione>
          )}
        </Box>

        <Box>
          <Sezione titolo="Cassa dell'edizione" azioni={<Button size="small" onClick={() => vai("movimenti")}>Movimenti</Button>}>
            <RigaValore etichetta="Entrate ufficiali" valore={euro(cassa.entrateUfficiali)} tono="positivo" />
            <RigaValore etichetta="Uscite ufficiali" valore={euro(-cassa.usciteUfficiali)} tono="negativo" />
            <Divider sx={{ my: 0.5 }} />
            <RigaValore etichetta="Netto di cassa" valore={euro(cassa.netto)} forte />
            <RigaValore etichetta="Uscite ancora previste" valore={euro(-cassa.uscitePreviste)} />
            {cassa.entratePreviste > 0 && <RigaValore etichetta="Entrate ancora previste" valore={euro(cassa.entratePreviste)} />}
            <RigaValore etichetta="Netto prudente" valore={euro(cassa.nettoPrudente)} forte tono={tonoValore(cassa.nettoPrudente)} />
          </Sezione>

          <Sezione titolo="Acquisti e avanzi">
            <RigaValore etichetta="Spesa acquisti reale" valore={euro(r.costoAcquisti)} />
            <RigaValore
              etichetta={
                <>
                  Avanzi riportati in magazzino
                  <Aiuto testo="Valore di quanto comprato e non usato: resta disponibile per i prossimi eventi" />
                </>
              }
              valore={euro(-avanzi)}
            />
            <RigaValore etichetta="Costo puro (depurato dagli avanzi)" valore={euro(r.costoConsumato)} forte />
            <Divider sx={{ my: 0.5 }} />
            <RigaValore
              etichetta={
                <>
                  Margine su consumi reali
                  <Aiuto testo="Ricavi reali meno il costo di quanto effettivamente usato (cibo e materiali) e meno i costi extra" />
                </>
              }
              valore={haReali ? euro(r.margineSuAcquisti) : "-"}
              forte
              tono={haReali ? tonoValore(r.margineSuAcquisti) : undefined}
            />
          </Sezione>

          <Sezione titolo="Quadratura con la cassa">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Confronta i movimenti registrati con ricavi, acquisti e costi extra. Piccole differenze sono normali (omaggi, arrotondamenti, spese non a menu).
            </Typography>
            <Stack spacing={0.5}>
              <RigaValore etichetta="Incassi registrati − ricavi" valore={euro(calc.quadratura.ricavi)} tono={Math.abs(calc.quadratura.ricavi) < 1 ? "positivo" : "attenzione"} />
              <RigaValore
                etichetta="Uscite registrate − (acquisti + extra)"
                valore={euro(calc.quadratura.costi)}
                tono={Math.abs(calc.quadratura.costi) < 1 ? "positivo" : "attenzione"}
              />
            </Stack>
          </Sezione>
        </Box>
      </Box>
    </>
  );
}
