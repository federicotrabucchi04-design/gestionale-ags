"use client";

import { useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import useMediaQuery from "@mui/material/useMediaQuery";
import { nuovoId, oggiISO } from "@/lib/calcoli";
import type { Movimento } from "@/lib/types";
import { CampoNumero, CampoScelta } from "./ui";
import { useGestionale } from "./Gestionale";

export function movimentoVuoto(p: Partial<Movimento> = {}): Movimento {
  return {
    id: nuovoId(),
    data: oggiISO(),
    descrizione: "",
    tipo: "uscita",
    importo: 0,
    stato: "ufficiale",
    categoria: "Altro",
    ...p,
  };
}

export default function MovimentoDialog({
  movimento,
  onChiudi,
}: {
  movimento: Movimento | null;
  onChiudi: () => void;
}) {
  const { dati, salva, elimina, notifica, conferma } = useGestionale();
  const [m, setM] = useState<Movimento | null>(movimento);
  const mobile = useMediaQuery("(max-width:600px)");
  const [origine, setOrigine] = useState(movimento);
  if (movimento !== origine) {
    setOrigine(movimento);
    setM(movimento);
  }

  const esistente = movimento ? dati.movimenti.some((x) => x.id === movimento.id) : false;
  const edizioni = useMemo(
    () =>
      [...dati.edizioni]
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .map((e) => ({ valore: e.id, etichetta: `${dati.eventi.find((ev) => ev.id === e.eventoId)?.nome ?? "Evento"} - ${e.nome}` })),
    [dati.edizioni, dati.eventi],
  );

  if (!m) return null;
  const set = (p: Partial<Movimento>) => setM({ ...m, ...p });
  const valido = m.descrizione.trim() !== "" && m.importo > 0 && !!m.data;

  return (
    <Dialog open={!!movimento} onClose={onChiudi} fullWidth maxWidth="sm" fullScreen={mobile}>
      <DialogTitle>{esistente ? "Modifica movimento" : "Nuovo movimento"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <ToggleButtonGroup exclusive fullWidth value={m.tipo} onChange={(_, v) => v && set({ tipo: v })} color={m.tipo === "entrata" ? "success" : "error"}>
            <ToggleButton value="entrata">Entrata</ToggleButton>
            <ToggleButton value="uscita">Uscita</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup exclusive fullWidth value={m.stato} onChange={(_, v) => v && set({ stato: v })} color="primary" size="small">
            <ToggleButton value="ufficiale">Ufficiale (pagato/incassato)</ToggleButton>
            <ToggleButton value="previsto">Previsto</ToggleButton>
          </ToggleButtonGroup>
          <TextField label="Descrizione" value={m.descrizione} onChange={(e) => set({ descrizione: e.target.value })} autoFocus />
          <Stack direction="row" spacing={2}>
            <CampoNumero label="Importo" euro valore={m.importo} onCambia={(v) => set({ importo: v })} />
            <TextField label="Data" type="date" value={m.data} onChange={(e) => set({ data: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Autocomplete
            freeSolo
            options={dati.impostazioni.categorieMovimento}
            value={m.categoria}
            onInputChange={(_, v) => set({ categoria: v })}
            renderInput={(p) => <TextField {...p} label="Categoria" />}
          />
          <CampoScelta
            label="Evento / edizione"
            valore={m.edizioneId ?? ""}
            onCambia={(v) => set({ edizioneId: v || undefined })}
            vuoto="Gestione ordinaria (nessun evento)"
            opzioni={edizioni}
          />
          <CampoScelta
            label="Fornitore"
            valore={m.fornitoreId ?? ""}
            onCambia={(v) => set({ fornitoreId: v || undefined })}
            vuoto="Nessuno"
            opzioni={[...dati.fornitori].sort((a, b) => a.nome.localeCompare(b.nome)).map((f) => ({ valore: f.id, etichetta: f.nome }))}
          />
          <TextField label="Note" value={m.note ?? ""} onChange={(e) => set({ note: e.target.value })} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {esistente && (
          <Button
            color="error"
            sx={{ mr: "auto" }}
            onClick={async () => {
              if (await conferma("Eliminare il movimento?", `"${m.descrizione}" verrà eliminato definitivamente.`, "Elimina")) {
                elimina("movimenti", m.id);
                notifica("Movimento eliminato");
                onChiudi();
              }
            }}
          >
            Elimina
          </Button>
        )}
        <Button onClick={onChiudi}>Annulla</Button>
        <Button
          variant="contained"
          disabled={!valido}
          onClick={() => {
            salva("movimenti", { ...m, descrizione: m.descrizione.trim() });
            notifica(esistente ? "Movimento aggiornato" : "Movimento aggiunto");
            onChiudi();
          }}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}
