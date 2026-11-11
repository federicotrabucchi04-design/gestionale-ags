"use client";

import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { nuovoId } from "@/lib/calcoli";
import type { Evento } from "@/lib/types";
import { useGestionale } from "./Gestionale";

export function eventoVuoto(): Evento {
  return { id: nuovoId(), nome: "", tipologia: "Festa con bar" };
}

export default function EventoDialog({
  evento,
  onChiudi,
  onCreato,
}: {
  evento: Evento | null;
  onChiudi: () => void;
  onCreato?: (e: Evento) => void;
}) {
  const { dati, salva, notifica } = useGestionale();
  const [e, setE] = useState<Evento | null>(evento);
  const [origine, setOrigine] = useState(evento);
  if (evento !== origine) {
    setOrigine(evento);
    setE(evento);
  }
  if (!e) return null;
  const esistente = dati.eventi.some((x) => x.id === e.id);

  return (
    <Dialog open onClose={onChiudi} fullWidth maxWidth="sm">
      <DialogTitle>{esistente ? "Modifica evento" : "Nuovo evento"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Nome evento"
            placeholder="Festa del Bosco, Cena di primavera..."
            value={e.nome}
            onChange={(ev) => setE({ ...e, nome: ev.target.value })}
            autoFocus
            helperText="Un evento raccoglie tutte le sue edizioni negli anni."
          />
          <Autocomplete
            freeSolo
            options={dati.impostazioni.tipologieEvento}
            value={e.tipologia}
            onInputChange={(_, v) => setE({ ...e, tipologia: v })}
            renderInput={(p) => <TextField {...p} label="Tipologia" />}
          />
          <TextField
            label="Descrizione"
            value={e.descrizione ?? ""}
            onChange={(ev) => setE({ ...e, descrizione: ev.target.value })}
            multiline
            minRows={2}
          />
          {esistente && (
            <FormControlLabel
              control={<Switch checked={!!e.archiviato} onChange={(ev) => setE({ ...e, archiviato: ev.target.checked })} />}
              label="Archiviato (non si fa più)"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onChiudi}>Annulla</Button>
        <Button
          variant="contained"
          disabled={!e.nome.trim()}
          onClick={() => {
            const finale = { ...e, nome: e.nome.trim() };
            salva("eventi", finale);
            notifica(esistente ? "Evento aggiornato" : "Evento creato");
            onChiudi();
            if (!esistente) onCreato?.(finale);
          }}
        >
          {esistente ? "Salva" : "Crea evento"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
