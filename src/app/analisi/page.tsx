"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { useGestionale } from "@/components/Gestionale";
import { Aiuto, Etichetta, Griglia, Intestazione, Kpi, Sezione, tonoValore, Vuoto } from "@/components/ui";
import { analisiFornitori, analisiPrezzi, anomalie, etichettaTipo, puntiEventiAnno, type Semaforo } from "@/lib/analisi";
import { oggiISO } from "@/lib/calcoli";
import { data as fmtData, euro, numero, percento } from "@/lib/format";

const COLORI: Record<Semaforo, "positivo" | "attenzione" | "negativo" | "neutro"> = {
  verde: "positivo",
  giallo: "attenzione",
  rosso: "negativo",
  neutro: "neutro",
};

export default function AnalisiPagina() {
  const { dati, anno } = useGestionale();
  const [scheda, setScheda] = useState("eventi");
  const oggi = oggiISO();
  const obiettivo = dati.impostazioni.margineObiettivo ?? 0.4;

  const punti = useMemo(() => puntiEventiAnno(anno, dati), [anno, dati]);
  const prezzi = useMemo(() => analisiPrezzi(anno, dati, oggi), [anno, dati, oggi]);
  const avvisi = useMemo(() => anomalie(anno, dati), [anno, dati]);
  const fornitori = useMemo(() => analisiFornitori(anno, dati, oggi), [anno, dati, oggi]);

  const ricaviTot = punti.reduce((s, p) => s + p.ricavi, 0);
  const margineTot = punti.reduce((s, p) => s + p.margine, 0);
  const verdi = prezzi.filter((p) => p.semaforo === "verde").length;
  const gialli = prezzi.filter((p) => p.semaforo === "giallo").length;
  const rossi = prezzi.filter((p) => p.semaforo === "rosso").length;

  return (
    <>
      <Intestazione
        titolo="Analisi"
        sottotitolo={`Anno sociale ${anno}: andamento eventi, prezzi che funzionano, spese anomale e fornitori (cassa e competenza)`}
      />

      <Griglia min={180} gap={1.5}>
        <Kpi etichetta="Ricavi eventi" valore={euro(ricaviTot)} />
        <Kpi etichetta="Margine eventi" valore={euro(margineTot)} tono={tonoValore(margineTot)} nota={percento(ricaviTot ? margineTot / ricaviTot : undefined)} />
        <Kpi etichetta={`Prezzi ≥ ${Math.round(obiettivo * 100)}%`} valore={String(verdi)} tono="positivo" nota={`${gialli} gialli · ${rossi} sotto metà`} />
        <Kpi etichetta="Da controllare" valore={String(avvisi.length)} tono={avvisi.length ? "attenzione" : "positivo"} />
      </Griglia>

      <Card sx={{ mt: 3, mb: 3 }}>
        <Tabs value={scheda} onChange={(_, v) => setScheda(v)} variant="scrollable" scrollButtons="auto">
          <Tab value="eventi" label="Eventi" />
          <Tab value="prezzi" label={`Prezzi (${rossi + gialli} da rivedere)`} />
          <Tab value="anomalie" label={`Anomalie (${avvisi.length})`} />
          <Tab value="fornitori" label="Fornitori" />
        </Tabs>
      </Card>

      {scheda === "eventi" && (
        <>
          {punti.length === 0 ? (
            <Card>
              <Vuoto titolo="Nessun evento in questo anno" testo="Crea edizioni o cambia anno sociale in alto." />
            </Card>
          ) : (
            <>
              <Sezione titolo="Andamento nell'anno" sottotitolo="Ricavi e margine di ogni edizione (reali se presenti, altrimenti previsti)">
                <LineChart
                  height={280}
                  xAxis={[{ scaleType: "point", data: punti.map((p) => p.edizione.nome) }]}
                  series={[
                    { data: punti.map((p) => p.ricavi), label: "Ricavi", color: "#1a73e8", valueFormatter: (v) => euro(v ?? 0) },
                    { data: punti.map((p) => p.margine), label: "Margine", color: "#34a853", valueFormatter: (v) => euro(v ?? 0) },
                  ]}
                  yAxis={[{ valueFormatter: (v: number) => `${Math.round(v)} €`, width: 64 }]}
                />
              </Sezione>
              <Sezione titolo="Edizioni" senzaPadding>
                <Box className="tabella-scroll">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Edizione</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell className="num">Ricavi</TableCell>
                        <TableCell className="num">Margine</TableCell>
                        <TableCell className="num">%</TableCell>
                        <TableCell className="num">Netto cassa</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {punti.map((p) => (
                        <TableRow key={p.edizione.id} hover component={Link} href={`/eventi/${p.evento.id}/${p.edizione.id}`} sx={{ cursor: "pointer", textDecoration: "none" }}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {p.edizione.nome}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {fmtData(p.edizione.data)} · {p.calc.haReali ? "reale" : "previsto"}
                            </Typography>
                          </TableCell>
                          <TableCell>{etichettaTipo(p.evento.tipo)}</TableCell>
                          <TableCell className="num">{euro(p.ricavi)}</TableCell>
                          <TableCell className="num" sx={{ color: p.margine >= 0 ? "success.main" : "error.main" }}>
                            {euro(p.margine)}
                          </TableCell>
                          <TableCell className="num">{percento(p.marginePct)}</TableCell>
                          <TableCell className="num">{euro(p.nettoCassa)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Sezione>
            </>
          )}
        </>
      )}

      {scheda === "prezzi" && (
        <Sezione
          titolo="Semaforo prezzi"
          sottotitolo={`Margine sul prezzo di listino (obiettivo ${Math.round(obiettivo * 100)}%). Verde ≥ obiettivo, giallo ≥ metà, rosso sotto.`}
          senzaPadding
        >
          {prezzi.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Vuoto titolo="Nessun articolo" />
            </Box>
          ) : (
            <>
              <Box sx={{ px: 2, pt: 2 }}>
                <BarChart
                  height={220}
                  layout="horizontal"
                  yAxis={[{ scaleType: "band", data: ["Verde", "Giallo", "Rosso", "Senza prezzo"], width: 100 }]}
                  series={[
                    {
                      data: [verdi, gialli, rossi, prezzi.filter((p) => p.semaforo === "neutro").length],
                      color: "#1a73e8",
                      valueFormatter: (v) => `${v ?? 0}`,
                    },
                  ]}
                  hideLegend
                />
              </Box>
              <Box className="tabella-scroll">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Articolo</TableCell>
                      <TableCell>Categoria</TableCell>
                      <TableCell className="num">Prezzo</TableCell>
                      <TableCell className="num">Costo vivo</TableCell>
                      <TableCell className="num">Margine</TableCell>
                      <TableCell className="num">%</TableCell>
                      <TableCell className="num">
                        Pezzi anno
                        <Aiuto testo="Venduti (o previsti) nelle edizioni di questo anno sociale" />
                      </TableCell>
                      <TableCell>Semaforo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {prezzi.map((p) => (
                      <TableRow key={p.articoloId} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{p.nome}</TableCell>
                        <TableCell>{p.categoria}</TableCell>
                        <TableCell className="num">{euro(p.prezzo)}</TableCell>
                        <TableCell className="num">{euro(p.costoVivo)}</TableCell>
                        <TableCell className="num">{euro(p.margine)}</TableCell>
                        <TableCell className="num">{percento(p.marginePct)}</TableCell>
                        <TableCell className="num">{numero(p.pezziAnno)}</TableCell>
                        <TableCell>
                          <Etichetta tono={COLORI[p.semaforo]}>
                            {p.semaforo === "neutro" ? "n/d" : p.semaforo}
                          </Etichetta>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
        </Sezione>
      )}

      {scheda === "anomalie" && (
        <Stack spacing={1.5}>
          {avvisi.length === 0 ? (
            <Card>
              <Vuoto titolo="Nessuna anomalia evidente" testo="Spese fuori media, utilizzi bassi, margini negativi e squilibri di cassa appariranno qui." />
            </Card>
          ) : (
            avvisi.map((a, i) => (
              <Card key={i} component={a.href ? Link : "div"} href={a.href} sx={{ textDecoration: "none" }}>
                <CardContent sx={{ py: "14px !important" }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Chip size="small" label={a.tipo} color={a.tono === "negativo" ? "error" : "warning"} variant="outlined" />
                    <Box>
                      <Typography sx={{ fontWeight: 500 }}>{a.titolo}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {a.dettaglio}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}

      {scheda === "fornitori" && (
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Per ogni fornitore: quanto hai pagato quest&apos;anno (cassa) e quanto hai effettivamente usato negli eventi (competenza). La differenza resta in magazzino —
            tipico dei panettoni comprati a Natale e finiti l&apos;anno dopo.
          </Typography>
          {fornitori.length === 0 ? (
            <Card>
              <Vuoto titolo="Nessun movimento fornitore" />
            </Card>
          ) : (
            fornitori.map((f) => (
              <Sezione
                key={f.fornitoreId || "x"}
                titolo={f.nome}
                sottotitolo={`Pagato ${euro(f.pagato)} · usato ${euro(f.consumato)} · ancora in magazzino ${euro(f.giacenzaValore)}`}
                senzaPadding
              >
                <Box className="tabella-scroll">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Voce</TableCell>
                        <TableCell className="num">Pagato</TableCell>
                        <TableCell className="num">Usato</TableCell>
                        <TableCell className="num">Giacenza</TableCell>
                        <TableCell className="num">Valore scorta</TableCell>
                        <TableCell>Eventi</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {f.voci.map((v) => (
                        <TableRow key={v.mp.id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{v.mp.nome}</TableCell>
                          <TableCell className="num">{euro(v.pagatoNellAnno)}</TableCell>
                          <TableCell className="num">{euro(v.consumatoNellAnno)}</TableCell>
                          <TableCell className="num">
                            {numero(v.giacenza)} {v.mp.um}
                          </TableCell>
                          <TableCell className="num">{euro(v.valoreGiacenza)}</TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {v.eventi.map((e) => e.edizione).join(" · ") || "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Sezione>
            ))
          )}
        </Stack>
      )}
    </>
  );
}
