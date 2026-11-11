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
import { euro, numero, percento } from "@/lib/format";
import type { Edizione } from "@/lib/types";

type Vai = (s: "menu" | "acquisti" | "extra" | "movimenti") => void;

export default function RiepilogoEdizione({ ed, calc, vai }: { ed: Edizione; calc: CalcoloEdizione; vai: Vai }) {
  const { previsto: p, reale: r, cassa } = calc;
  const haReali = r.pezzi > 0;
  const partPrev = ed.partecipantiPrevisti || 0;
  const partReali = ed.partecipantiReali || 0;

  const righe: { voce: string; prev?: number; reale?: number; tipo?: "euro" | "num" | "pct"; forte?: boolean; aiuto?: string }[] = [
    { voce: "Pezzi venduti", prev: p.pezzi, reale: r.pezzi, tipo: "num" },
    { voce: "Ricavi menu", prev: p.ricavi, reale: r.ricavi, forte: true },
    { voce: "Costo menu (ricette)", prev: -p.costoMenu, reale: -r.costoMenu, aiuto: "Pezzi × costo vivo di ogni articolo (materie prime e costi fissi)" },
    { voce: "Margine menu", prev: p.margineMenu, reale: r.margineMenu },
    { voce: "Costi extra", prev: -p.extra, reale: -r.extra, aiuto: "Musica, noleggi e altri costi della sola edizione" },
    { voce: "Margine finale", prev: p.margineFinale, reale: r.margineFinale, forte: true },
    { voce: "Margine %", prev: p.marginePct, reale: r.marginePct, tipo: "pct" },
    { voce: "Spesa acquisti", prev: -p.costoAcquisti, reale: -r.costoAcquisti, aiuto: "Lotti × costo del lotto, dalla scheda Acquisti" },
    { voce: "Partecipanti", prev: partPrev || undefined, reale: partReali || undefined, tipo: "num" },
    {
      voce: "Ricavo per partecipante",
      prev: partPrev ? p.ricavi / partPrev : undefined,
      reale: partReali ? r.ricavi / partReali : undefined,
    },
  ];

  const fmt = (v: number | undefined, tipo: "euro" | "num" | "pct" = "euro") =>
    tipo === "num" ? numero(v) : tipo === "pct" ? percento(v) : euro(v);

  const articoli = [...calc.menu].sort((a, b) => b.reale.margineDopoExtra - a.reale.margineDopoExtra).filter((m) => m.articolo);
  const usaReale = haReali;

  return (
    <>
      {calc.avvisi.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <b>Da controllare:</b> {calc.avvisi.slice(0, 4).join(" · ")}
          {calc.avvisi.length > 4 && ` e altri ${calc.avvisi.length - 4}`}
        </Alert>
      )}

      <Griglia min={200}>
        <Kpi etichetta="Ricavi menu previsti" valore={euro(p.ricavi)} nota={`Margine previsto ${euro(p.margineFinale)}`} />
        <Kpi
          etichetta="Ricavi menu reali"
          valore={haReali ? euro(r.ricavi) : "-"}
          tono="primario"
          nota={haReali ? `Scostamento ${euro(r.ricavi - p.ricavi)}` : "Inserisci le quantità reali nel Menu"}
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
          <Sezione titolo="Previsto e reale" sottotitolo="Conto economico dell'edizione dal menu" senzaPadding>
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
                          {haReali || x.voce === "Partecipanti" || x.voce === "Spesa acquisti" ? fmt(x.reale, x.tipo) : "-"}
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

          {articoli.length > 0 && (
            <Sezione
              titolo="Margine per articolo"
              sottotitolo={usaReale ? "Reale, dopo i costi extra ripartiti" : "Previsto, dopo i costi extra ripartiti"}
              azioni={<Button size="small" onClick={() => vai("menu")}>Apri menu</Button>}
            >
              <BarChart
                layout="horizontal"
                height={Math.max(160, articoli.length * 36 + 40)}
                yAxis={[{ scaleType: "band", data: articoli.map((m) => m.articolo!.nome), width: 120 }]}
                xAxis={[{ valueFormatter: (v: number) => `${Math.round(v)} €` }]}
                series={[
                  {
                    data: articoli.map((m) => (usaReale ? m.reale.margineDopoExtra : m.previsto.margineDopoExtra)),
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

          <Sezione titolo="Magazzino" azioni={<Button size="small" onClick={() => vai("acquisti")}>Acquisti</Button>}>
            <RigaValore etichetta="Spesa acquisti reale" valore={euro(r.costoAcquisti)} />
            <RigaValore etichetta="Costo di quanto consumato" valore={euro(r.costoConsumato)} />
            <RigaValore etichetta="Valore rimasto in magazzino" valore={euro(r.costoAcquisti - r.costoConsumato)} />
            <Divider sx={{ my: 0.5 }} />
            <RigaValore
              etichetta={
                <>
                  Margine su consumi reali
                  <Aiuto testo="Ricavi reali meno il costo di quanto effettivamente consumato e meno i costi extra" />
                </>
              }
              valore={haReali ? euro(r.margineSuAcquisti) : "-"}
              forte
              tono={haReali ? tonoValore(r.margineSuAcquisti) : undefined}
            />
          </Sezione>

          <Sezione titolo="Quadratura con la cassa">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Confronta i movimenti registrati con menu, acquisti e costi extra. Piccole differenze sono normali (omaggi, arrotondamenti, spese non a menu).
            </Typography>
            <Stack spacing={0.5}>
              <RigaValore etichetta="Incassi registrati − ricavi menu" valore={euro(calc.quadratura.ricavi)} tono={Math.abs(calc.quadratura.ricavi) < 1 ? "positivo" : "attenzione"} />
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
