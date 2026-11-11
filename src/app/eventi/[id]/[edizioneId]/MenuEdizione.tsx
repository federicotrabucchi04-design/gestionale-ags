"use client";

import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import PieChartOutlined from "@mui/icons-material/PieChartOutlined";
import PlaylistAddOutlined from "@mui/icons-material/PlaylistAddOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import ComposizionePrezzo from "@/components/ComposizionePrezzo";
import { useGestionale } from "@/components/Gestionale";
import { Aiuto, CampoNumero, Vuoto } from "@/components/ui";
import { nuovoId, type CalcoloEdizione, type RigaMenuCalc } from "@/lib/calcoli";
import { euro, euroFine, numero, percento } from "@/lib/format";
import type { Edizione, RigaMenu } from "@/lib/types";
import type { Aggiorna } from "./tipi";

export default function MenuEdizione({ ed, calc, aggiorna }: { ed: Edizione; calc: CalcoloEdizione; aggiorna: Aggiorna }) {
  const { dati } = useGestionale();
  const mobile = useMediaQuery("(max-width:900px)");
  const [vista, setVista] = useState<"reale" | "previsto">(ed.stato === "pianificata" ? "previsto" : "reale");
  const [composizione, setComposizione] = useState<RigaMenuCalc | null>(null);
  const congelata = ed.menu.some((m) => m.prezzoFissato !== undefined);

  const disponibili = dati.articoli
    .filter((a) => a.attivo && !ed.menu.some((m) => m.articoloId === a.id))
    .sort((a, b) => a.codice.localeCompare(b.codice));

  const setRiga = (id: string, patch: Partial<RigaMenu>) =>
    aggiorna((e) => ({ menu: e.menu.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const togli = (id: string) => aggiorna((e) => ({ menu: e.menu.filter((m) => m.id !== id) }));
  const aggiungi = (ids: string[]) =>
    aggiorna((e) => ({ menu: [...e.menu, ...ids.map((articoloId) => ({ id: nuovoId(), articoloId, qtaPrevista: 0, qtaReale: 0 }))] }));

  const tot = vista === "reale" ? calc.reale : calc.previsto;

  const barra = (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
      <Autocomplete
        sx={{ flex: 1, maxWidth: { sm: 360 } }}
        options={disponibili}
        getOptionLabel={(a) => `${a.nome} · ${a.categoria}`}
        value={null}
        onChange={(_, a) => a && aggiungi([a.id])}
        renderInput={(p) => <TextField {...p} label="Aggiungi articolo al menu" />}
        blurOnSelect
        clearOnBlur
      />
      {disponibili.length > 0 && (
        <Button startIcon={<PlaylistAddOutlined />} onClick={() => aggiungi(disponibili.map((a) => a.id))}>
          Aggiungi tutti ({disponibili.length})
        </Button>
      )}
      <Box sx={{ flex: 1 }} />
      <ToggleButtonGroup size="small" exclusive value={vista} onChange={(_, v) => v && setVista(v)}>
        <ToggleButton value="previsto">Conti previsti</ToggleButton>
        <ToggleButton value="reale">Conti reali</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );

  if (ed.menu.length === 0)
    return (
      <>
        {barra}
        <Card>
          <Vuoto
            titolo="Menu vuoto"
            testo="Aggiungi gli articoli in vendita. Prezzi e costi arrivano dal listino e dalle ricette valide alla data dell'edizione."
          />
        </Card>
      </>
    );

  return (
    <>
      {barra}
      {congelata && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Edizione chiusa: prezzi e costi sono congelati al momento della chiusura.
        </Typography>
      )}

      {mobile ? (
        <Stack spacing={1.5}>
          {calc.menu.map((m) => {
            const v = m[vista];
            return (
              <Card key={m.riga.id}>
                <CardContent sx={{ pb: "16px !important" }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 500 }}>
                        {m.articolo?.nome ?? "Articolo eliminato"}
                        {m.avvisi.length > 0 && <WarningAmberOutlined color="warning" sx={{ fontSize: 18, ml: 0.5, verticalAlign: "text-bottom" }} />}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Prezzo {euro(m.prezzo)} · costo {euroFine(m.costoVivo)}
                      </Typography>
                    </Box>
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => setComposizione(m)}>
                        <PieChartOutlined fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => togli(m.riga.id)}>
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                    <CampoNumero label="Qtà prevista" valore={m.riga.qtaPrevista} onCambia={(q) => setRiga(m.riga.id, { qtaPrevista: q })} />
                    <CampoNumero label="Qtà reale" valore={m.riga.qtaReale} onCambia={(q) => setRiga(m.riga.id, { qtaReale: q })} />
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Ricavo {euro(v.ricavo)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: v.margineDopoExtra >= 0 ? "success.main" : "error.main" }}>
                      Margine {euro(v.margineDopoExtra)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          <Card sx={{ bgcolor: "#f8f9fb" }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ fontWeight: 600 }}>Totale {vista}</Typography>
                <Typography sx={{ fontWeight: 600 }}>{euro(tot.ricavi)}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {numero(tot.pezzi)} pezzi · margine finale {euro(tot.margineFinale)} ({percento(tot.marginePct)})
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
                  <TableCell>Articolo</TableCell>
                  <TableCell className="num">Prezzo</TableCell>
                  <TableCell className="num">
                    Costo vivo
                    <Aiuto testo="Materie prime della ricetta + quota dei costi fissi, ai prezzi validi alla data dell'edizione" />
                  </TableCell>
                  <TableCell sx={{ width: 110 }}>Qtà prevista</TableCell>
                  <TableCell sx={{ width: 110 }}>Qtà reale</TableCell>
                  <TableCell className="num">Ricavo</TableCell>
                  <TableCell className="num">Costo</TableCell>
                  <TableCell className="num">Margine</TableCell>
                  <TableCell className="num">
                    Extra / pz
                    <Aiuto testo="Quota dei costi extra ripartiti (es. musica) su ogni pezzo venduto" />
                  </TableCell>
                  <TableCell className="num">Margine dopo extra</TableCell>
                  <TableCell className="num">%</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {calc.menu.map((m) => {
                  const v = m[vista];
                  return (
                    <TableRow key={m.riga.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {m.articolo?.nome ?? "Articolo eliminato"}
                        {m.avvisi.length > 0 && (
                          <Tooltip title={m.avvisi.join(" · ")}>
                            <WarningAmberOutlined color="warning" sx={{ fontSize: 18, ml: 0.5, verticalAlign: "text-bottom" }} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="num">{euro(m.prezzo)}</TableCell>
                      <TableCell className="num">{euroFine(m.costoVivo)}</TableCell>
                      <TableCell>
                        <CampoNumero valore={m.riga.qtaPrevista} onCambia={(q) => setRiga(m.riga.id, { qtaPrevista: q })} />
                      </TableCell>
                      <TableCell>
                        <CampoNumero valore={m.riga.qtaReale} onCambia={(q) => setRiga(m.riga.id, { qtaReale: q })} />
                      </TableCell>
                      <TableCell className="num">{euro(v.ricavo)}</TableCell>
                      <TableCell className="num">{euro(v.costo)}</TableCell>
                      <TableCell className="num">{euro(v.margine)}</TableCell>
                      <TableCell className="num">{euroFine(v.quotaExtra)}</TableCell>
                      <TableCell className="num" sx={{ fontWeight: 500, color: v.margineDopoExtra >= 0 ? "success.main" : "error.main" }}>
                        {euro(v.margineDopoExtra)}
                      </TableCell>
                      <TableCell className="num">{percento(v.ricavo ? v.margineDopoExtra / v.ricavo : undefined)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Tooltip title="Composizione del prezzo">
                          <IconButton size="small" onClick={() => setComposizione(m)}>
                            <PieChartOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Togli dal menu">
                          <IconButton size="small" onClick={() => togli(m.riga.id)}>
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ "& td": { fontWeight: 600, color: "text.primary", fontSize: 14, bgcolor: "#f8f9fb" } }}>
                  <TableCell>Totale {vista}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell>{numero(calc.previsto.pezzi)}</TableCell>
                  <TableCell>{numero(calc.reale.pezzi)}</TableCell>
                  <TableCell className="num">{euro(tot.ricavi)}</TableCell>
                  <TableCell className="num">{euro(tot.costoMenu)}</TableCell>
                  <TableCell className="num">{euro(tot.margineMenu)}</TableCell>
                  <TableCell className="num">{euro(tot.extraRipartiti)}</TableCell>
                  <TableCell className="num">{euro(tot.margineMenu - tot.extraRipartiti)}</TableCell>
                  <TableCell className="num">{percento(tot.ricavi ? (tot.margineMenu - tot.extraRipartiti) / tot.ricavi : undefined)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </Box>
          {tot.extraNonRipartiti > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Altri costi extra non ripartiti sui pezzi: {euro(tot.extraNonRipartiti)}. Margine finale: <b>{euro(tot.margineFinale)}</b>.
            </Typography>
          )}
        </Card>
      )}

      <Dialog open={!!composizione} onClose={() => setComposizione(null)} fullWidth maxWidth="sm">
        <DialogTitle>{composizione?.articolo?.nome}</DialogTitle>
        <DialogContent>
          {composizione?.costo && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Costi alla data dell&apos;edizione, con la quota dei costi extra {vista === "reale" ? "reali" : "previsti"}.
                {composizione.riga.costoFissato !== undefined && " Valori congelati alla chiusura: il dettaglio mostra i costi attuali."}
              </Typography>
              <ComposizionePrezzo
                costo={composizione.costo}
                prezzo={composizione.prezzo}
                quotaExtra={composizione[vista].quotaExtra}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposizione(null)}>Chiudi</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
