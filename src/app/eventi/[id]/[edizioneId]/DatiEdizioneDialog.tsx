"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useGestionale } from "@/components/Gestionale";
import { CampoNumero, CampoScelta } from "@/components/ui";
import { annoSociale, listinoAl } from "@/lib/calcoli";
import { data as fmtData } from "@/lib/format";
import type { Edizione } from "@/lib/types";
import type { Aggiorna } from "./tipi";

export default function DatiEdizioneDialog({
  aperto,
  ed,
  aggiorna,
  onChiudi,
}: {
  aperto: boolean;
  ed: Edizione;
  aggiorna: Aggiorna;
  onChiudi: () => void;
}) {
  const { dati, notifica } = useGestionale();
  const [b, setB] = useState(ed);
  const [eraAperto, setEraAperto] = useState(aperto);
  if (aperto !== eraAperto) {
    setEraAperto(aperto);
    if (aperto) setB(ed);
  }
  const auto = listinoAl(dati.listini, b.data);

  return (
    <Dialog open={aperto} onClose={onChiudi} fullWidth maxWidth="sm">
      <DialogTitle>Dati edizione</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Nome" value={b.nome} onChange={(e) => setB({ ...b, nome: e.target.value })} />
          <TextField
            label="Data"
            type="date"
            value={b.data}
            onChange={(e) => setB({ ...b, data: e.target.value })}
            helperText={b.data ? `Anno sociale ${annoSociale(b.data)}` : undefined}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <CampoScelta
            label="Listino prezzi"
            valore={b.listinoId ?? ""}
            onCambia={(v) => setB({ ...b, listinoId: v || undefined })}
            vuoto={auto ? `Automatico: ${auto.nome} (dal ${fmtData(auto.validoDal)})` : "Automatico (nessuno valido)"}
            opzioni={[...dati.listini]
              .sort((x, y) => (x.validoDal < y.validoDal ? 1 : -1))
              .map((l) => ({ valore: l.id, etichetta: `${l.nome} (dal ${fmtData(l.validoDal)})` }))}
          />
          <Stack direction="row" spacing={2}>
            <CampoNumero label="Partecipanti previsti" valore={b.partecipantiPrevisti} onCambia={(v) => setB({ ...b, partecipantiPrevisti: v || undefined })} />
            <CampoNumero label="Partecipanti reali" valore={b.partecipantiReali} onCambia={(v) => setB({ ...b, partecipantiReali: v || undefined })} />
          </Stack>
          <TextField label="Note" value={b.note ?? ""} onChange={(e) => setB({ ...b, note: e.target.value })} multiline minRows={3} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onChiudi}>Annulla</Button>
        <Button
          variant="contained"
          disabled={!b.nome.trim() || !b.data}
          onClick={() => {
            aggiorna({
              nome: b.nome.trim(),
              data: b.data,
              listinoId: b.listinoId,
              partecipantiPrevisti: b.partecipantiPrevisti,
              partecipantiReali: b.partecipantiReali,
              note: b.note,
            });
            notifica("Dati aggiornati");
            onChiudi();
          }}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}
