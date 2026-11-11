"use client";

import { useMemo } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import { useGestionale } from "@/components/Gestionale";
import { Aiuto, CampoNumero, Vuoto } from "@/components/ui";
import { nuovoId, saldoInventario, type CalcoloEdizione } from "@/lib/calcoli";
import { euro, numero, percento } from "@/lib/format";
import type { Edizione, RigaAcquisto } from "@/lib/types";
import type { Aggiorna } from "./tipi";

export default function AcquistiEdizione({ ed, calc, aggiorna }: { ed: Edizione; calc: CalcoloEdizione; aggiorna: Aggiorna }) {
  const { dati } = useGestionale();
  const mobile = useMediaQuery("(max-width:1100px)");

  const giacenze = useMemo(() => {
    const altre = { ...dati, edizioni: dati.edizioni.filter((e) => e.id !== ed.id) };
    const m = new Map<string, number>();
    for (const r of ed.acquisti) m.set(r.mpId, saldoInventario(r.mpId, altre, ed.data));
    return m;
  }, [dati, ed.acquisti, ed.id, ed.data]);

  const disponibili = dati.materiePrime
    .filter((m) => m.attiva && !ed.acquisti.some((a) => a.mpId === m.id))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const setRiga = (id: string, patch: Partial<RigaAcquisto>) =>
    aggiorna((e) => ({ acquisti: e.acquisti.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const togli = (id: string) => aggiorna((e) => ({ acquisti: e.acquisti.filter((a) => a.id !== id) }));

  const tot = calc.acquisti.reduce(
    (t, a) => ({ prev: t.prev + a.costoPrevisto, reale: t.reale + a.costoAcquisto, consumato: t.consumato + a.costoConsumato }),
    { prev: 0, reale: 0, consumato: 0 },
  );

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
        <Autocomplete
          sx={{ flex: 1, maxWidth: { sm: 360 } }}
          options={disponibili}
          getOptionLabel={(m) => `${m.nome} (${m.codice})`}
          value={null}
          onChange={(_, m) =>
            m && aggiorna((e) => ({ acquisti: [...e.acquisti, { id: nuovoId(), mpId: m.id, lottiPrevisti: 0, lottiReali: 0, daMagazzino: 0, rimanenza: 0 }] }))
          }
          renderInput={(p) => <TextField {...p} label="Aggiungi materia prima" />}
          blurOnSelect
          clearOnBlur
        />
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Lotti comprati, quanto preso dal magazzino e quanto avanzato. Il consumo e l&apos;inventario si aggiornano da soli.
        </Typography>
      </Stack>

      {ed.acquisti.length === 0 ? (
        <Card>
          <Vuoto titolo="Nessun acquisto" testo="Aggiungi le materie prime da comprare per l'edizione: i lotti e i costi arrivano dal prezziario alla data dell'evento." />
        </Card>
      ) : mobile ? (
        <Stack spacing={1.5}>
          {calc.acquisti.map((a) => (
            <Card key={a.riga.id}>
              <CardContent sx={{ pb: "16px !important" }}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ fontWeight: 500 }}>{a.mp?.nome ?? "Materia prima eliminata"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.prezzo ? `Lotto: ${numero(a.qtaLotto)} ${a.mp?.um} a ${euro(a.prezzo.costoLotto)}` : "Manca il prezzo a questa data"}
                      {" · "}in magazzino {numero(giacenze.get(a.riga.mpId))} {a.mp?.um}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => togli(a.riga.id)}>
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </Stack>
                <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "1fr 1fr", mt: 1.5 }}>
                  <CampoNumero label="Lotti previsti" valore={a.riga.lottiPrevisti} onCambia={(v) => setRiga(a.riga.id, { lottiPrevisti: v })} />
                  <CampoNumero label="Lotti comprati" valore={a.riga.lottiReali} onCambia={(v) => setRiga(a.riga.id, { lottiReali: v })} />
                  <CampoNumero label="Dal magazzino" suffisso={a.mp?.um} valore={a.riga.daMagazzino} onCambia={(v) => setRiga(a.riga.id, { daMagazzino: v })} />
                  <CampoNumero label="Avanzato" suffisso={a.mp?.um} valore={a.riga.rimanenza} onCambia={(v) => setRiga(a.riga.id, { rimanenza: v })} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Consumo {numero(a.consumo)} {a.mp?.um} · costo consumato {euro(a.costoConsumato)} · spesa {euro(a.costoAcquisto)}
                </Typography>
                {a.consumo < 0 && (
                  <Typography variant="body2" color="error">
                    L&apos;avanzato supera quanto disponibile.
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
          <Card sx={{ bgcolor: "#f8f9fb" }}>
            <CardContent>
              <Typography sx={{ fontWeight: 600 }}>
                Spesa prevista {euro(tot.prev)} · reale {euro(tot.reale)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Costo consumato {euro(tot.consumato)}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      ) : (
        <Card>
          <Box className="tabella-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Materia prima</TableCell>
                  <TableCell>Lotto</TableCell>
                  <TableCell sx={{ width: 100 }}>Lotti previsti</TableCell>
                  <TableCell className="num">Spesa prev.</TableCell>
                  <TableCell sx={{ width: 100 }}>Lotti comprati</TableCell>
                  <TableCell sx={{ width: 120 }}>
                    Dal magazzino
                    <Aiuto testo="Quantità presa dalle scorte, già pagata in passato" />
                  </TableCell>
                  <TableCell sx={{ width: 120 }}>Avanzato</TableCell>
                  <TableCell className="num">Consumo</TableCell>
                  <TableCell className="num">Spesa reale</TableCell>
                  <TableCell className="num">Costo consumato</TableCell>
                  <TableCell sx={{ width: 90 }}>Usato</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {calc.acquisti.map((a) => (
                  <TableRow key={a.riga.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {a.mp?.nome ?? "Eliminata"}
                      <Typography variant="caption" color="text.secondary" component="div">
                        in magazzino {numero(giacenze.get(a.riga.mpId))} {a.mp?.um}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {a.prezzo ? (
                        `${numero(a.qtaLotto)} ${a.mp?.um} · ${euro(a.prezzo.costoLotto)}`
                      ) : (
                        <Typography variant="body2" color="warning.main">
                          Senza prezzo
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <CampoNumero valore={a.riga.lottiPrevisti} onCambia={(v) => setRiga(a.riga.id, { lottiPrevisti: v })} />
                    </TableCell>
                    <TableCell className="num">{euro(a.costoPrevisto)}</TableCell>
                    <TableCell>
                      <CampoNumero valore={a.riga.lottiReali} onCambia={(v) => setRiga(a.riga.id, { lottiReali: v })} />
                    </TableCell>
                    <TableCell>
                      <CampoNumero valore={a.riga.daMagazzino} suffisso={a.mp?.um} onCambia={(v) => setRiga(a.riga.id, { daMagazzino: v })} />
                    </TableCell>
                    <TableCell>
                      <CampoNumero valore={a.riga.rimanenza} suffisso={a.mp?.um} onCambia={(v) => setRiga(a.riga.id, { rimanenza: v })} />
                    </TableCell>
                    <TableCell className="num" sx={{ color: a.consumo < 0 ? "error.main" : undefined }}>
                      {numero(a.consumo)} {a.mp?.um}
                    </TableCell>
                    <TableCell className="num">{euro(a.costoAcquisto)}</TableCell>
                    <TableCell className="num">{euro(a.costoConsumato)}</TableCell>
                    <TableCell>
                      {a.percentualeConsumo !== undefined && (
                        <Tooltip title={percento(a.percentualeConsumo)}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, a.percentualeConsumo * 100))}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => togli(a.riga.id)}>
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ "& td": { fontWeight: 600, color: "text.primary", fontSize: 14, bgcolor: "#f8f9fb" } }}>
                  <TableCell colSpan={3}>Totale</TableCell>
                  <TableCell className="num">{euro(tot.prev)}</TableCell>
                  <TableCell colSpan={4} />
                  <TableCell className="num">{euro(tot.reale)}</TableCell>
                  <TableCell className="num">{euro(tot.consumato)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </Box>
        </Card>
      )}
    </>
  );
}
