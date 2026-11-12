"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import PostAddOutlined from "@mui/icons-material/PostAddOutlined";
import MovimentoDialog, { movimentoVuoto } from "@/components/MovimentoDialog";
import { CampoNumero, RigaValore, Sezione, Vuoto } from "@/components/ui";
import { nuovoId } from "@/lib/calcoli";
import { capacita } from "@/lib/modelli";
import { euro, euroFine } from "@/lib/format";
import type { CostoExtra, Movimento } from "@/lib/types";
import type { PropsParte } from "./tipi";

export default function CostiExtraEdizione({ ed, parte, calc, aggiornaParte }: PropsParte) {
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const conPezzi = capacita(parte).menu !== null;
  const setRiga = (id: string, patch: Partial<CostoExtra>) =>
    aggiornaParte((p) => ({ costiExtra: p.costiExtra.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const aggiungi = () =>
    aggiornaParte((p) => ({ costiExtra: [...p.costiExtra, { id: nuovoId(), descrizione: "", importoPrevisto: 0, importoReale: 0, ripartisci: conPezzi }] }));

  return (
    <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" } }}>
      <Box>
        <Stack direction="row" sx={{ mb: 2, justifyContent: "space-between", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Costi di questa parte: musica, noleggi, SIAE, pulizie...
            {conPezzi && " Se ripartiti, si spalmano sui pezzi venduti e alzano il costo pieno di ogni articolo."} I costi divisi fra più serate vanno nella
            scheda Costi comuni.
          </Typography>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={aggiungi} sx={{ flexShrink: 0 }}>
            Aggiungi
          </Button>
        </Stack>
        {parte.costiExtra.length === 0 ? (
          <Card>
            <Vuoto titolo="Nessun costo extra" />
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {parte.costiExtra.map((c) => (
              <Card key={c.id}>
                <CardContent sx={{ pb: "16px !important" }}>
                  <Box sx={{ display: "grid", gap: 1.5, alignItems: "center", gridTemplateColumns: { xs: "1fr 1fr", md: conPezzi ? "2fr 1fr 1fr auto auto" : "2fr 1fr 1fr auto" } }}>
                    <TextField
                      label="Descrizione"
                      value={c.descrizione}
                      onChange={(e) => setRiga(c.id, { descrizione: e.target.value })}
                      sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
                    />
                    <CampoNumero label="Previsto" euro valore={c.importoPrevisto} onCambia={(v) => setRiga(c.id, { importoPrevisto: v })} />
                    <CampoNumero label="Reale" euro valore={c.importoReale} onCambia={(v) => setRiga(c.id, { importoReale: v })} />
                    {conPezzi && (
                      <FormControlLabel
                        control={<Switch checked={c.ripartisci} onChange={(e) => setRiga(c.id, { ripartisci: e.target.checked })} />}
                        label="Ripartisci sui pezzi"
                      />
                    )}
                    <Stack direction="row">
                      <Tooltip title="Registra il pagamento nei movimenti">
                        <IconButton
                          onClick={() =>
                            setMovimento(
                              movimentoVuoto({
                                descrizione: [c.descrizione, ed.parti.length > 1 ? parte.nome : ""].filter(Boolean).join(" - "),
                                tipo: "uscita",
                                importo: c.importoReale || c.importoPrevisto,
                                stato: c.importoReale ? "ufficiale" : "previsto",
                                categoria: "Musica e servizi",
                                edizioneId: ed.id,
                                data: ed.data,
                              }),
                            )
                          }
                        >
                          <PostAddOutlined />
                        </IconButton>
                      </Tooltip>
                      <IconButton onClick={() => aggiornaParte((p) => ({ costiExtra: p.costiExtra.filter((x) => x.id !== c.id) }))} aria-label="Elimina">
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
      <Box>
        <Sezione titolo="Totali">
          <RigaValore etichetta="Extra previsti" valore={euro(calc.previsto.extra)} />
          <RigaValore etichetta="Extra reali" valore={euro(calc.reale.extra)} forte />
          {calc.reale.premi > 0 && <RigaValore etichetta="di cui premi lotteria comprati" valore={euro(calc.reale.premi)} />}
          {conPezzi && (
            <>
              <RigaValore etichetta="Ripartiti per pezzo (previsto)" valore={euroFine(calc.previsto.pezzi ? calc.previsto.extraRipartiti / calc.previsto.pezzi : 0)} />
              <RigaValore etichetta="Ripartiti per pezzo (reale)" valore={euroFine(calc.reale.pezzi ? calc.reale.extraRipartiti / calc.reale.pezzi : 0)} />
            </>
          )}
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
            I costi extra non sono movimenti di cassa: per la cassa registra il pagamento con il pulsante accanto a ogni voce.
          </Typography>
        </Sezione>
        {parte.costiExtra.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Non è ancora in cassa — usa «Registra» su ogni voce o vai in Movimenti.
          </Alert>
        )}
      </Box>
      <MovimentoDialog movimento={movimento} onChiudi={() => setMovimento(null)} />
    </Box>
  );
}
