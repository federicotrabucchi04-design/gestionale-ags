"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import { useGestionale } from "@/components/Gestionale";
import MovimentoDialog, { movimentoVuoto } from "@/components/MovimentoDialog";
import { Etichetta, Griglia, Kpi, tonoValore, Vuoto } from "@/components/ui";
import { importoFirmato, type CalcoloEdizione } from "@/lib/calcoli";
import { data, euro } from "@/lib/format";
import type { Edizione, Movimento } from "@/lib/types";

export default function MovimentiEdizione({ ed, calc }: { ed: Edizione; calc: CalcoloEdizione }) {
  const { dati } = useGestionale();
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const lista = dati.movimenti.filter((m) => m.edizioneId === ed.id).sort((a, b) => (a.data < b.data ? -1 : 1));

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2, justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          color="success"
          startIcon={<PaymentsOutlined />}
          onClick={() =>
            setMovimento(
              movimentoVuoto({
                tipo: "entrata",
                descrizione: `Incasso ${ed.nome}`,
                categoria: "Incassi evento",
                importo: Math.round(calc.reale.ricavi * 100) / 100,
                edizioneId: ed.id,
                data: ed.data,
              }),
            )
          }
        >
          Registra incasso
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddOutlined />}
          onClick={() => setMovimento(movimentoVuoto({ tipo: "uscita", categoria: "Fornitori", edizioneId: ed.id, data: ed.data }))}
        >
          Registra spesa
        </Button>
      </Stack>

      <Griglia min={180}>
        <Kpi etichetta="Entrate ufficiali" valore={euro(calc.cassa.entrateUfficiali)} tono="positivo" />
        <Kpi etichetta="Uscite ufficiali" valore={euro(calc.cassa.usciteUfficiali)} tono="negativo" />
        <Kpi etichetta="Netto di cassa" valore={euro(calc.cassa.netto)} tono={tonoValore(calc.cassa.netto)} />
        <Kpi etichetta="Ancora da pagare" valore={euro(calc.cassa.uscitePreviste)} tono={calc.cassa.uscitePreviste ? "attenzione" : "neutro"} />
      </Griglia>

      <Card sx={{ mt: 3 }}>
        {lista.length === 0 ? (
          <Vuoto
            titolo="Nessun movimento per questa edizione"
            testo="Registra l'incasso e le spese pagate: entrano nella cassa dell'anno. Le spese ancora da pagare segnale come previste."
          />
        ) : (
          <List disablePadding>
            {lista.map((m) => (
              <ListItemButton key={m.id} divider onClick={() => setMovimento(m)}>
                <ListItemText
                  primary={m.descrizione}
                  secondary={`${data(m.data)} · ${m.categoria}${m.fornitoreId ? ` · ${dati.fornitori.find((f) => f.id === m.fornitoreId)?.nome ?? ""}` : ""}`}
                />
                <Stack sx={{ alignItems: "flex-end", gap: 0.5 }}>
                  <Typography sx={{ fontWeight: 500, color: m.tipo === "entrata" ? "success.main" : "error.main" }}>{euro(importoFirmato(m))}</Typography>
                  {m.stato === "previsto" && <Etichetta tono="attenzione">Previsto</Etichetta>}
                </Stack>
              </ListItemButton>
            ))}
          </List>
        )}
      </Card>
      <MovimentoDialog movimento={movimento} onChiudi={() => setMovimento(null)} />
    </>
  );
}
