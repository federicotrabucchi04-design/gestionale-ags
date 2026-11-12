"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import PostAddOutlined from "@mui/icons-material/PostAddOutlined";
import { useGestionale } from "@/components/Gestionale";
import MovimentoDialog, { movimentoVuoto } from "@/components/MovimentoDialog";
import { CampoNumero, RigaValore, Sezione, Vuoto } from "@/components/ui";
import { nuovoId, storicoParte } from "@/lib/calcoli";
import { lotteriaVuota } from "@/lib/modelli";
import { euro, numero, percento } from "@/lib/format";
import type { Lotteria, Movimento, Premio } from "@/lib/types";
import { Storico } from "./MenuEdizione";
import type { PropsParte } from "./tipi";

export default function LotteriaParte({ ed, parte, calc, aggiornaParte }: PropsParte) {
  const { dati } = useGestionale();
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const lot = parte.lotteria ?? lotteriaVuota();
  const set = (patch: Partial<Lotteria> | ((l: Lotteria) => Partial<Lotteria>)) =>
    aggiornaParte((p) => {
      const l = p.lotteria ?? lotteriaVuota();
      return { lotteria: { ...l, ...(typeof patch === "function" ? patch(l) : patch) } };
    });
  const setPremio = (id: string, patch: Partial<Premio>) => set((l) => ({ premi: l.premi.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const storico = useMemo(() => storicoParte(ed, dati.edizioni, parte.nome, (p) => p.lotteria?.vendutiReali), [ed, dati.edizioni, parte.nome]);

  const valoreDonato = lot.premi.filter((p) => p.donato).reduce((s, p) => s + (p.valore || 0), 0);
  const invenduti = (lot.bigliettiStampati || 0) - (lot.vendutiReali || 0);

  return (
    <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" } }}>
      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
              <CampoNumero label="Prezzo biglietto" euro valore={lot.prezzoBiglietto} onCambia={(v) => set({ prezzoBiglietto: v })} />
              <CampoNumero label="Biglietti stampati" valore={lot.bigliettiStampati} onCambia={(v) => set({ bigliettiStampati: v })} />
              <Box>
                <CampoNumero label="Venduti previsti" valore={lot.vendutiPrevisti} onCambia={(v) => set({ vendutiPrevisti: v })} fullWidth />
                <Storico dato={storico} um="biglietti" onUsa={(v) => set({ vendutiPrevisti: v })} />
              </Box>
              <CampoNumero
                label="Venduti reali"
                valore={lot.vendutiReali}
                onCambia={(v) => set({ vendutiReali: v })}
                error={lot.bigliettiStampati > 0 && lot.vendutiReali > lot.bigliettiStampati}
                helperText={lot.bigliettiStampati > 0 && lot.vendutiReali > lot.bigliettiStampati ? "più degli stampati" : undefined}
              />
            </Box>
          </CardContent>
        </Card>

        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1">Premi</Typography>
          <Button
            startIcon={<AddOutlined />}
            onClick={() => set((l) => ({ premi: [...l.premi, { id: nuovoId(), descrizione: "", valore: 0, donato: true }] }))}
          >
            Aggiungi premio
          </Button>
        </Stack>
        {lot.premi.length === 0 ? (
          <Card>
            <Vuoto titolo="Nessun premio" testo="I premi donati dagli sponsor non costano; quelli comprati entrano nei costi della lotteria." />
          </Card>
        ) : (
          <Stack spacing={1}>
            {lot.premi.map((p, i) => (
              <Card key={p.id}>
                <CardContent sx={{ py: "12px !important" }}>
                  <Box sx={{ display: "grid", gap: 1.5, alignItems: "center", gridTemplateColumns: { xs: "1fr 1fr", md: "auto 2fr 1fr auto auto" } }}>
                    <Typography sx={{ fontWeight: 600, display: { xs: "none", md: "block" } }}>{i + 1}°</Typography>
                    <TextField
                      label="Premio"
                      value={p.descrizione}
                      onChange={(e) => setPremio(p.id, { descrizione: e.target.value })}
                      sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
                    />
                    <CampoNumero label="Valore" euro valore={p.valore} onCambia={(v) => setPremio(p.id, { valore: v })} />
                    <FormControlLabel control={<Switch checked={p.donato} onChange={(e) => setPremio(p.id, { donato: e.target.checked })} />} label="Donato" />
                    <IconButton onClick={() => set((l) => ({ premi: l.premi.filter((x) => x.id !== p.id) }))} aria-label="Elimina premio">
                      <DeleteOutlined />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>

      <Box>
        <Sezione titolo="Conti della lotteria">
          <RigaValore etichetta="Incasso previsto" valore={euro(calc.previsto.lotteria)} />
          <RigaValore etichetta="Incasso reale" valore={euro(calc.reale.lotteria)} />
          <RigaValore etichetta="Premi comprati" valore={euro(-calc.reale.premi)} />
          {calc.reale.extraNonRipartiti + calc.reale.extraRipartiti > 0 && (
            <RigaValore etichetta="Stampa e altri costi" valore={euro(-(calc.reale.extraNonRipartiti + calc.reale.extraRipartiti))} />
          )}
          <RigaValore etichetta="Utile lotteria" valore={euro(calc.reale.margineFinale)} forte tono={calc.reale.margineFinale >= 0 ? "positivo" : "negativo"} />
          <RigaValore etichetta="Valore premi donati" valore={euro(valoreDonato)} />
          {lot.bigliettiStampati > 0 && (
            <RigaValore etichetta="Venduti / stampati" valore={`${percento(lot.vendutiReali / lot.bigliettiStampati)} (${numero(Math.max(0, invenduti))} invenduti)`} />
          )}
          <Button
            sx={{ mt: 1 }}
            startIcon={<PostAddOutlined />}
            disabled={!calc.reale.lotteria}
            onClick={() =>
              setMovimento(
                movimentoVuoto({
                  descrizione: `Biglietti lotteria - ${ed.nome}`,
                  tipo: "entrata",
                  importo: calc.reale.lotteria,
                  stato: "ufficiale",
                  categoria: "Incassi evento",
                  edizioneId: ed.id,
                  data: ed.data,
                }),
              )
            }
          >
            Registra l&apos;incasso
          </Button>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
            Promemoria: le lotterie locali delle associazioni (DPR 430/2001) richiedono la comunicazione al Comune e alla Prefettura almeno 30 giorni prima e
            il verbale di estrazione. La stampa dei biglietti si inserisce nei Costi extra di questa parte.
          </Typography>
        </Sezione>
      </Box>
      <MovimentoDialog movimento={movimento} onChiudi={() => setMovimento(null)} />
    </Box>
  );
}
