"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import { useGestionale } from "@/components/Gestionale";
import { Vuoto } from "@/components/ui";
import { nelAnno, nuovoId, oggiISO, prezzoMPAl } from "@/lib/calcoli";
import { euro } from "@/lib/format";
import type { Fornitore } from "@/lib/types";

export default function FornitoriTab() {
  const { dati, anno } = useGestionale();
  const [aperto, setAperto] = useState<Fornitore | null>(null);
  const oggi = oggiISO();
  const nuovo = (): Fornitore => ({ id: nuovoId(), nome: "" });

  return (
    <>
      <Stack direction="row" sx={{ mb: 2, justifyContent: "flex-end" }}>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAperto(nuovo())}>
          Nuovo fornitore
        </Button>
      </Stack>
      <Card>
        {dati.fornitori.length === 0 ? (
          <Vuoto icona={<StorefrontOutlined />} titolo="Nessun fornitore" testo="Aggiungi i fornitori per collegarli ai prezzi delle materie prime e ai pagamenti." />
        ) : (
          <List disablePadding>
            {[...dati.fornitori]
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((f) => {
                const materie = dati.materiePrime.filter((m) => prezzoMPAl(dati.prezziMP, m.id, oggi)?.fornitoreId === f.id);
                const pagato = dati.movimenti
                  .filter((m) => m.fornitoreId === f.id && m.tipo === "uscita" && m.stato === "ufficiale" && nelAnno(m.data, anno))
                  .reduce((s, m) => s + m.importo, 0);
                return (
                  <ListItemButton key={f.id} divider onClick={() => setAperto(f)}>
                    <ListItemText
                      primary={f.nome}
                      secondary={
                        [f.contatto, materie.length ? `Fornisce: ${materie.map((m) => m.nome).join(", ")}` : null].filter(Boolean).join(" · ") ||
                        "Nessuna materia prima collegata"
                      }
                    />
                    <Stack sx={{ alignItems: "flex-end", ml: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {euro(pagato)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        pagato {anno}
                      </Typography>
                    </Stack>
                  </ListItemButton>
                );
              })}
          </List>
        )}
      </Card>
      <FornitoreDialog fornitore={aperto} onChiudi={() => setAperto(null)} />
    </>
  );
}

function FornitoreDialog({ fornitore, onChiudi }: { fornitore: Fornitore | null; onChiudi: () => void }) {
  const { dati, salva, elimina, notifica, conferma } = useGestionale();
  const [f, setF] = useState<Fornitore | null>(fornitore);
  const [origine, setOrigine] = useState(fornitore);
  if (fornitore !== origine) {
    setOrigine(fornitore);
    setF(fornitore);
  }
  if (!f) return null;
  const esistente = dati.fornitori.some((x) => x.id === f.id);

  return (
    <Dialog open onClose={onChiudi} fullWidth maxWidth="sm">
      <DialogTitle>{esistente ? f.nome : "Nuovo fornitore"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus />
          <TextField label="Contatto (telefono, email)" value={f.contatto ?? ""} onChange={(e) => setF({ ...f, contatto: e.target.value })} />
          <TextField label="Note" value={f.note ?? ""} onChange={(e) => setF({ ...f, note: e.target.value })} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {esistente && (
          <Button
            color="error"
            sx={{ mr: "auto" }}
            onClick={async () => {
              if (await conferma("Eliminare il fornitore?", "Prezzi e movimenti resteranno senza fornitore.", "Elimina")) {
                elimina("fornitori", f.id);
                notifica("Fornitore eliminato");
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
          disabled={!f.nome.trim()}
          onClick={() => {
            salva("fornitori", { ...f, nome: f.nome.trim() });
            notifica("Fornitore salvato");
            onChiudi();
          }}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}
