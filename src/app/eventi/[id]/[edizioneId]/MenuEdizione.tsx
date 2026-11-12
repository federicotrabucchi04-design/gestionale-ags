"use client";

import { useMemo, useState } from "react";
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
import Link from "@mui/material/Link";
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
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import PieChartOutlined from "@mui/icons-material/PieChartOutlined";
import PlaylistAddOutlined from "@mui/icons-material/PlaylistAddOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import ComposizionePrezzo from "@/components/ComposizionePrezzo";
import { useGestionale } from "@/components/Gestionale";
import { Aiuto, CampoNumero, Vuoto } from "@/components/ui";
import { nuovoId, venditeStoriche, type DatoStorico, type RigaMenuCalc } from "@/lib/calcoli";
import { euro, euroFine, numero, percento } from "@/lib/format";
import type { RigaMenu } from "@/lib/types";
import type { PropsParte } from "./tipi";

/** Small hint with what was sold in the last editions, clickable to use it as forecast. */
export function Storico({ dato, um, onUsa }: { dato: DatoStorico; um?: string; onUsa?: (v: number) => void }) {
  if (dato.media === undefined) return null;
  const titolo = dato.edizioni.map((e) => `${e.nome}: ${numero(e.valore)}${um ? ` ${um}` : ""}`).join(" · ");
  const testo = (
    <>
      <HistoryOutlined sx={{ fontSize: 14 }} />
      media {numero(dato.media)}
      {um ? ` ${um}` : ""}
    </>
  );
  const stile = { display: "inline-flex", alignItems: "center", gap: 0.25, fontSize: 12, mt: 0.25 };
  return (
    <Tooltip title={`Ultime edizioni: ${titolo}${onUsa ? ". Clic per usarlo come previsione" : ""}`}>
      {onUsa ? (
        <Link component="button" type="button" underline="hover" onClick={() => onUsa(Math.round(dato.media!))} sx={stile}>
          {testo}
        </Link>
      ) : (
        <Typography variant="caption" color="primary" sx={stile}>
          {testo}
        </Typography>
      )}
    </Tooltip>
  );
}

export default function MenuEdizione({ ed, parte, calc, aggiornaParte }: PropsParte) {
  const { dati } = useGestionale();
  const mobile = useMediaQuery("(max-width:900px)");
  const [vista, setVista] = useState<"reale" | "previsto">(ed.stato === "pianificata" ? "previsto" : "reale");
  const [composizione, setComposizione] = useState<RigaMenuCalc | null>(null);
  const congelata = parte.menu.some((m) => m.prezzoFissato !== undefined);
  const offerto = calc.menu[0]?.offerto ?? (parte.tipo === "tappa" || (parte.tipo === "servizio" && parte.formula === "fisso"));

  const storici = useMemo(() => {
    const m = new Map<string, DatoStorico>();
    for (const r of parte.menu) m.set(r.articoloId, venditeStoriche(r.articoloId, ed, dati.edizioni, parte.nome));
    return m;
  }, [parte.menu, parte.nome, ed, dati.edizioni]);

  const disponibili = dati.articoli
    .filter((a) => a.attivo && !parte.menu.some((m) => m.articoloId === a.id))
    .sort((a, b) => a.codice.localeCompare(b.codice));

  const setRiga = (id: string, patch: Partial<RigaMenu>) =>
    aggiornaParte((p) => ({ menu: p.menu.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const togli = (id: string) => aggiornaParte((p) => ({ menu: p.menu.filter((m) => m.id !== id) }));
  const aggiungi = (ids: string[]) =>
    aggiornaParte((p) => ({ menu: [...p.menu, ...ids.map((articoloId) => ({ id: nuovoId(), articoloId, qtaPrevista: 0, qtaReale: 0 }))] }));

  const tot = vista === "reale" ? calc.reale : calc.previsto;
  const etQta = offerto ? ["Porzioni previste", "Porzioni preparate"] : ["Qtà prevista", "Qtà reale"];

  const barra = (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
      <Autocomplete
        sx={{ flex: 1, maxWidth: { sm: 360 } }}
        options={disponibili}
        getOptionLabel={(a) => `${a.nome} · ${a.categoria}`}
        value={null}
        onChange={(_, a) => a && aggiungi([a.id])}
        renderInput={(p) => <TextField {...p} label={offerto ? "Aggiungi piatto" : "Aggiungi articolo al menu"} />}
        blurOnSelect
        clearOnBlur
      />
      {disponibili.length > 0 && !offerto && (
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

  const nota = offerto ? (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
      Piatti offerti o compresi nel prezzo: conta solo il costo. Il ricavo arriva da {parte.tipo === "tappa" ? "le iscrizioni" : "coperti e prevendite"}.
    </Typography>
  ) : null;

  if (parte.menu.length === 0)
    return (
      <>
        {barra}
        {nota}
        <Card>
          <Vuoto
            titolo={offerto ? "Nessun piatto" : "Menu vuoto"}
            testo={
              offerto
                ? "Aggiungi i piatti serviti: il costo arriva dalle ricette valide alla data dell'edizione."
                : "Aggiungi gli articoli in vendita. Prezzi e costi arrivano dal listino e dalle ricette valide alla data dell'edizione."
            }
          />
        </Card>
      </>
    );

  return (
    <>
      {barra}
      {nota}
      {congelata && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Edizione chiusa: prezzi e costi sono congelati al momento della chiusura.
        </Typography>
      )}

      {mobile ? (
        <Stack spacing={1.5}>
          {calc.menu.map((m) => {
            const v = m[vista];
            const st = storici.get(m.riga.articoloId);
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
                        {offerto ? "Offerto" : `Prezzo ${euro(m.prezzo)}`} · costo {euroFine(m.costoVivo)}
                      </Typography>
                    </Box>
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => setComposizione(m)} aria-label="Composizione del prezzo">
                        <PieChartOutlined fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => togli(m.riga.id)} aria-label="Togli">
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <CampoNumero label={etQta[0]} valore={m.riga.qtaPrevista} onCambia={(q) => setRiga(m.riga.id, { qtaPrevista: q })} />
                      {st && <Storico dato={st} onUsa={(q) => setRiga(m.riga.id, { qtaPrevista: q })} />}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <CampoNumero label={etQta[1]} valore={m.riga.qtaReale} onCambia={(q) => setRiga(m.riga.id, { qtaReale: q })} />
                    </Box>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {offerto ? `Costo ${euro(v.costo)}` : `Ricavo ${euro(v.ricavo)}`}
                    </Typography>
                    {!offerto && (
                      <Typography variant="body2" sx={{ fontWeight: 500, color: v.margineDopoExtra >= 0 ? "success.main" : "error.main" }}>
                        Margine {euro(v.margineDopoExtra)}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          <Card sx={{ bgcolor: "#f8f9fb" }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ fontWeight: 600 }}>Totale {vista}</Typography>
                <Typography sx={{ fontWeight: 600 }}>{euro(offerto ? tot.costoMenu : tot.ricaviMenu)}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {numero(tot.pezzi)} {offerto ? "porzioni" : "pezzi"}
                {!offerto && ` · margine menu ${euro(tot.margineMenu - tot.extraRipartiti)}`}
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
                  <TableCell>{offerto ? "Piatto" : "Articolo"}</TableCell>
                  {!offerto && <TableCell className="num">Prezzo</TableCell>}
                  <TableCell className="num">
                    Costo vivo
                    <Aiuto testo="Materie prime della ricetta + quota dei costi fissi, ai prezzi validi alla data dell'edizione" />
                  </TableCell>
                  <TableCell sx={{ width: 130 }}>{etQta[0]}</TableCell>
                  <TableCell sx={{ width: 110 }}>{etQta[1]}</TableCell>
                  {!offerto && <TableCell className="num">Ricavo</TableCell>}
                  <TableCell className="num">Costo</TableCell>
                  {!offerto && (
                    <>
                      <TableCell className="num">Margine</TableCell>
                      <TableCell className="num">
                        Extra / pz
                        <Aiuto testo="Quota dei costi extra ripartiti (es. musica) su ogni pezzo venduto" />
                      </TableCell>
                      <TableCell className="num">Margine dopo extra</TableCell>
                      <TableCell className="num">%</TableCell>
                    </>
                  )}
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {calc.menu.map((m) => {
                  const v = m[vista];
                  const st = storici.get(m.riga.articoloId);
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
                      {!offerto && <TableCell className="num">{euro(m.prezzo)}</TableCell>}
                      <TableCell className="num">{euroFine(m.costoVivo)}</TableCell>
                      <TableCell>
                        <CampoNumero valore={m.riga.qtaPrevista} onCambia={(q) => setRiga(m.riga.id, { qtaPrevista: q })} />
                        {st && <Storico dato={st} onUsa={(q) => setRiga(m.riga.id, { qtaPrevista: q })} />}
                      </TableCell>
                      <TableCell>
                        <CampoNumero valore={m.riga.qtaReale} onCambia={(q) => setRiga(m.riga.id, { qtaReale: q })} />
                      </TableCell>
                      {!offerto && <TableCell className="num">{euro(v.ricavo)}</TableCell>}
                      <TableCell className="num">{euro(v.costo)}</TableCell>
                      {!offerto && (
                        <>
                          <TableCell className="num">{euro(v.margine)}</TableCell>
                          <TableCell className="num">{euroFine(v.quotaExtra)}</TableCell>
                          <TableCell className="num" sx={{ fontWeight: 500, color: v.margineDopoExtra >= 0 ? "success.main" : "error.main" }}>
                            {euro(v.margineDopoExtra)}
                          </TableCell>
                          <TableCell className="num">{percento(v.ricavo ? v.margineDopoExtra / v.ricavo : undefined)}</TableCell>
                        </>
                      )}
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
                  {!offerto && <TableCell />}
                  <TableCell />
                  <TableCell>{numero(calc.previsto.pezzi)}</TableCell>
                  <TableCell>{numero(calc.reale.pezzi)}</TableCell>
                  {!offerto && <TableCell className="num">{euro(tot.ricaviMenu)}</TableCell>}
                  <TableCell className="num">{euro(tot.costoMenu)}</TableCell>
                  {!offerto && (
                    <>
                      <TableCell className="num">{euro(tot.margineMenu)}</TableCell>
                      <TableCell className="num">{euro(tot.extraRipartiti)}</TableCell>
                      <TableCell className="num">{euro(tot.margineMenu - tot.extraRipartiti)}</TableCell>
                      <TableCell className="num">{percento(tot.ricaviMenu ? (tot.margineMenu - tot.extraRipartiti) / tot.ricaviMenu : undefined)}</TableCell>
                    </>
                  )}
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </Box>
          {tot.extraNonRipartiti > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Altri costi extra non ripartiti sui pezzi: {euro(tot.extraNonRipartiti)}. Margine finale della parte: <b>{euro(tot.margineFinale)}</b>.
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
                prezzo={composizione.offerto ? undefined : composizione.prezzo}
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
