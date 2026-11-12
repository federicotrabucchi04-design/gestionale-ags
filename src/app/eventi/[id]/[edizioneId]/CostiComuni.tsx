"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import PostAddOutlined from "@mui/icons-material/PostAddOutlined";
import MovimentoDialog, { movimentoVuoto } from "@/components/MovimentoDialog";
import Alert from "@mui/material/Alert";
import { Aiuto, CampoNumero, CampoScelta, Sezione, Vuoto } from "@/components/ui";
import { nuovoId, type CalcoloEdizione } from "@/lib/calcoli";
import { comuniNetti } from "@/lib/checklist";
import { euro, percento } from "@/lib/format";
import type { Edizione, Movimento, VoceComune } from "@/lib/types";
import type { Aggiorna } from "./tipi";

export default function CostiComuni({ ed, calc, aggiorna }: { ed: Edizione; calc: CalcoloEdizione; aggiorna: Aggiorna }) {
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [vista, setVista] = useState<"previsto" | "reale">(ed.stato === "pianificata" ? "previsto" : "reale");
  const setVoce = (id: string, patch: Partial<VoceComune>) => aggiorna((e) => ({ comuni: e.comuni.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const pesoTot = calc.unita.reduce((s, u) => s + u.peso, 0);
  const netti = comuniNetti(ed, vista === "reale");

  const setPeso = (unitaId: string, peso: number) =>
    aggiorna((e) =>
      e.serate?.some((s) => s.id === unitaId)
        ? { serate: e.serate.map((s) => (s.id === unitaId ? { ...s, peso } : s)) }
        : { parti: e.parti.map((p) => (p.id === unitaId ? { ...p, peso } : p)) },
    );

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" } }}>
        <Box>
          <Stack direction="row" sx={{ mb: 2, justifyContent: "space-between", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Spese e entrate dell&apos;intera edizione (SIAE, tensostruttura, sponsor, contributi...) divise fra le serate in base ai pesi qui a fianco.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              sx={{ flexShrink: 0 }}
              onClick={() => aggiorna((e) => ({ comuni: [...e.comuni, { id: nuovoId(), descrizione: "", tipo: "uscita", importoPrevisto: 0, importoReale: 0 }] }))}
            >
              Aggiungi
            </Button>
          </Stack>
          {ed.comuni.length === 0 ? (
            <Card>
              <Vuoto titolo="Nessuna voce comune" testo="Esempi: SIAE di tutta la festa, noleggio tendone, sponsor che copre più serate." />
            </Card>
          ) : (
            <Stack spacing={1.5}>
              {ed.comuni.map((c) => (
                <Card key={c.id}>
                  <CardContent sx={{ pb: "16px !important" }}>
                    <Box sx={{ display: "grid", gap: 1.5, alignItems: "center", gridTemplateColumns: { xs: "1fr 1fr", md: "2fr 1fr 1fr 1fr auto" } }}>
                      <TextField
                        label="Descrizione"
                        value={c.descrizione}
                        onChange={(e) => setVoce(c.id, { descrizione: e.target.value })}
                        sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
                      />
                      <CampoScelta
                        label="Tipo"
                        valore={c.tipo}
                        onCambia={(tipo) => setVoce(c.id, { tipo })}
                        opzioni={[
                          { valore: "uscita", etichetta: "Costo" },
                          { valore: "entrata", etichetta: "Entrata" },
                        ]}
                      />
                      <CampoNumero label="Previsto" euro valore={c.importoPrevisto} onCambia={(v) => setVoce(c.id, { importoPrevisto: v })} />
                      <CampoNumero label="Reale" euro valore={c.importoReale} onCambia={(v) => setVoce(c.id, { importoReale: v })} />
                      <Stack direction="row">
                        <Tooltip title="Registra nei movimenti">
                          <IconButton
                            onClick={() =>
                              setMovimento(
                                movimentoVuoto({
                                  descrizione: `${c.descrizione} - ${ed.nome}`,
                                  tipo: c.tipo,
                                  importo: c.importoReale || c.importoPrevisto,
                                  stato: c.importoReale ? "ufficiale" : "previsto",
                                  categoria: c.tipo === "uscita" ? "Musica e servizi" : "Incassi evento",
                                  edizioneId: ed.id,
                                  data: ed.data,
                                }),
                              )
                            }
                          >
                            <PostAddOutlined />
                          </IconButton>
                        </Tooltip>
                        <IconButton onClick={() => aggiorna((e) => ({ comuni: e.comuni.filter((x) => x.id !== c.id) }))} aria-label="Elimina">
                          <DeleteOutlined />
                        </IconButton>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
        <Sezione titolo="Pesi del riparto">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Peso 0 = non riceve comuni (es. lotteria). Peso 2 prende il doppio di peso 1.
          </Typography>
          <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
            Netti {vista}: {euro(netti.uscite)} uscite − {euro(netti.entrate)} entrate = <b>{euro(netti.netti)}</b>
          </Alert>
          <Stack spacing={1}>
            {calc.unita.map((u) => {
              const quota = pesoTot ? (u.peso / pesoTot) * netti.netti : 0;
              return (
                <Stack key={u.id} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {u.nome}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {u.peso}/{pesoTot || 0} × {euro(netti.netti)} = {euro(quota)}
                    </Typography>
                  </Typography>
                  <CampoNumero valore={u.peso} onCambia={(v) => setPeso(u.id, Math.max(0, v))} sx={{ width: 90 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ width: 52, textAlign: "right" }}>
                    {percento(pesoTot ? u.peso / pesoTot : 0)}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Sezione>
      </Box>

      <Card>
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1, gap: 2, flexWrap: "wrap" }}>
            <Typography variant="h6">Confronto fra le serate</Typography>
            <ToggleButtonGroup size="small" exclusive value={vista} onChange={(_, v) => v && setVista(v)}>
              <ToggleButton value="previsto">Previsto</ToggleButton>
              <ToggleButton value="reale">Reale</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Box className="tabella-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Serata / parte</TableCell>
                  <TableCell className="num">Ricavi</TableCell>
                  <TableCell className="num">
                    Costi propri
                    <Aiuto testo="Cibo (ricette), materiali usati e costi extra della serata" />
                  </TableCell>
                  <TableCell className="num">Quota comuni</TableCell>
                  <TableCell className="num">Margine</TableCell>
                  <TableCell className="num">%</TableCell>
                  <TableCell className="num">Paganti</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calc.unita.map((u) => {
                  const v = u[vista];
                  return (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{u.nome}</TableCell>
                      <TableCell className="num">{euro(v.ricavi)}</TableCell>
                      <TableCell className="num">{euro(v.costi)}</TableCell>
                      <TableCell className="num">{euro(v.comuni)}</TableCell>
                      <TableCell className="num" sx={{ fontWeight: 600, color: v.margine >= 0 ? "success.main" : "error.main" }}>
                        {euro(v.margine)}
                      </TableCell>
                      <TableCell className="num">{percento(v.ricavi ? v.margine / v.ricavi : undefined)}</TableCell>
                      <TableCell className="num">{v.paganti || "–"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
      {ed.comuni.length > 0 && (
        <Alert severity="warning">
          Queste voci contano nel margine dell&apos;edizione, ma entrano in cassa solo se le registri nei movimenti. Usa l&apos;icona «Registra» su ogni riga oppure vai in Movimenti.
        </Alert>
      )}
      <MovimentoDialog movimento={movimento} onChiudi={() => setMovimento(null)} />
    </Stack>
  );
}
