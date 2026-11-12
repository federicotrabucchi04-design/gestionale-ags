"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { nuovoId, prossimoCodice } from "@/lib/calcoli";
import type { GenereMateria, MateriaPrima } from "@/lib/types";
import { useGestionale } from "./Gestionale";
import { CampoNumero } from "./ui";

/** Creates a raw material (or a material) with its first price, without leaving the edition. */
export default function NuovaMateriaRapida({
  nome,
  genere,
  data,
  onChiudi,
}: {
  nome: string | null;
  genere: GenereMateria;
  data: string;
  onChiudi: (creata?: MateriaPrima) => void;
}) {
  const { dati, salva, notifica } = useGestionale();
  const [m, setM] = useState({ nome: "", um: "pz", costoLotto: 0, qtaLotto: 1, fornitoreId: "", genere });
  const [aperto, setAperto] = useState<string | null>(null);
  if (nome !== aperto) {
    setAperto(nome);
    if (nome !== null) setM({ nome, um: "pz", costoLotto: 0, qtaLotto: 1, fornitoreId: "", genere });
  }

  const crea = () => {
    const mp: MateriaPrima = {
      id: nuovoId(),
      codice: prossimoCodice(m.genere === "materiale" ? "MAT-" : "MP-", dati.materiePrime.map((x) => x.codice)),
      nome: m.nome.trim(),
      um: m.um.trim() || "pz",
      attiva: true,
      genere: m.genere,
    };
    salva("materiePrime", mp);
    salva("prezziMP", {
      id: nuovoId(),
      mpId: mp.id,
      validoDal: data,
      costoLotto: m.costoLotto,
      qtaLotto: m.qtaLotto || 1,
      fornitoreId: m.fornitoreId || undefined,
    });
    notifica(`${mp.nome} aggiunto al prezziario`);
    onChiudi(mp);
  };

  return (
    <Dialog open={nome !== null} onClose={() => onChiudi()} fullWidth maxWidth="xs">
      <DialogTitle>{m.genere === "materiale" ? "Nuovo materiale" : "Nuova materia prima"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Nome" value={m.nome} onChange={(e) => setM({ ...m, nome: e.target.value })} autoFocus />
          <TextField select label="Genere" value={m.genere} onChange={(e) => setM({ ...m, genere: e.target.value as GenereMateria })}>
            <MenuItem value="consumo">Cibo e bevande (magazzino)</MenuItem>
            <MenuItem value="materiale">Materiale (scorte informali)</MenuItem>
          </TextField>
          <Stack direction="row" spacing={1.5}>
            <CampoNumero label="Costo confezione" euro valore={m.costoLotto} onCambia={(v) => setM({ ...m, costoLotto: v })} />
            <CampoNumero label="Pezzi / quantità" valore={m.qtaLotto} onCambia={(v) => setM({ ...m, qtaLotto: v })} />
            <TextField label="U.M." value={m.um} onChange={(e) => setM({ ...m, um: e.target.value })} sx={{ maxWidth: 90 }} />
          </Stack>
          <TextField select label="Fornitore" value={m.fornitoreId} onChange={(e) => setM({ ...m, fornitoreId: e.target.value })}>
            <MenuItem value="">Nessuno</MenuItem>
            {dati.fornitori.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.nome}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="caption" color="text.secondary">
            Il prezzo vale dalla data dell&apos;edizione; potrai modificarlo nel Prezziario.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onChiudi()}>Annulla</Button>
        <Button variant="contained" onClick={crea} disabled={!m.nome.trim()}>
          Crea e aggiungi
        </Button>
      </DialogActions>
    </Dialog>
  );
}
