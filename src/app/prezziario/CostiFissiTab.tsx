"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import LocalFireDepartmentOutlined from "@mui/icons-material/LocalFireDepartmentOutlined";
import { useGestionale } from "@/components/Gestionale";
import { CampoNumero, Etichetta, Griglia, Vuoto } from "@/components/ui";
import { nuovoId, quotaCostoFisso } from "@/lib/calcoli";
import { euro, euroFine, numero } from "@/lib/format";
import type { CostoFisso } from "@/lib/types";

export default function CostiFissiTab() {
  const { dati } = useGestionale();
  const [aperto, setAperto] = useState<CostoFisso | null>(null);
  const nuovo = (): CostoFisso => ({ id: nuovoId(), nome: "", costoTotale: 0, baseRiparto: 0, articoliIds: [], attivo: true });

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Costi condivisi (bombola del gas, olio della friggitrice...) divisi sui pezzi e aggiunti al costo vivo degli articoli scelti. I costi di un singolo evento, come la musica, si inseriscono nell&apos;edizione.
        </Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAperto(nuovo())}>
          Nuovo costo fisso
        </Button>
      </Stack>
      {dati.costiFissi.length === 0 ? (
        <Card>
          <Vuoto icona={<LocalFireDepartmentOutlined />} titolo="Nessun costo fisso" />
        </Card>
      ) : (
        <Griglia min={280}>
          {dati.costiFissi.map((c) => (
            <Card key={c.id} sx={{ opacity: c.attivo ? 1 : 0.6 }}>
              <CardActionArea onClick={() => setAperto(c)} sx={{ height: "100%" }}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: 17 }}>
                      {c.nome}
                    </Typography>
                    {!c.attivo && <Etichetta>Disattivato</Etichetta>}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {euro(c.costoTotale)} su {numero(c.baseRiparto)} pezzi = <b>{euroFine(quotaCostoFisso(c))}</b> a pezzo
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Su:{" "}
                    {c.articoliIds
                      .map((id) => dati.articoli.find((a) => a.id === id)?.nome)
                      .filter(Boolean)
                      .join(", ") || "nessun articolo"}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Griglia>
      )}
      <CostoDialog costo={aperto} onChiudi={() => setAperto(null)} />
    </>
  );
}

function CostoDialog({ costo, onChiudi }: { costo: CostoFisso | null; onChiudi: () => void }) {
  const { dati, salva, elimina, notifica, conferma } = useGestionale();
  const [c, setC] = useState<CostoFisso | null>(costo);
  const [origine, setOrigine] = useState(costo);
  if (costo !== origine) {
    setOrigine(costo);
    setC(costo);
  }
  if (!c) return null;
  const esistente = dati.costiFissi.some((x) => x.id === c.id);

  const ultimaEdizione = [...dati.edizioni].sort((a, b) => (a.data < b.data ? 1 : -1))[0];
  const pezziSuggeriti = ultimaEdizione
    ? ultimaEdizione.menu.filter((m) => c.articoliIds.includes(m.articoloId)).reduce((s, m) => s + (m.qtaPrevista || 0), 0)
    : 0;

  return (
    <Dialog open onClose={onChiudi} fullWidth maxWidth="sm">
      <DialogTitle>{esistente ? c.nome : "Nuovo costo fisso"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Voce" value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} autoFocus placeholder="Bombola gas" />
          <Stack direction="row" spacing={2}>
            <CampoNumero label="Costo totale" euro valore={c.costoTotale} onCambia={(v) => setC({ ...c, costoTotale: v })} />
            <CampoNumero
              label="Pezzi su cui dividerlo"
              valore={c.baseRiparto}
              onCambia={(v) => setC({ ...c, baseRiparto: v })}
              helperText={pezziSuggeriti ? `Ultima edizione: ${numero(pezziSuggeriti)} pezzi previsti` : undefined}
            />
          </Stack>
          <Typography variant="body2">
            Quota per pezzo: <b>{euroFine(quotaCostoFisso(c))}</b>
          </Typography>
          <FormControlLabel control={<Switch checked={c.attivo} onChange={(e) => setC({ ...c, attivo: e.target.checked })} />} label="Attivo" />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Articoli che pagano questo costo
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {[...dati.articoli]
                .sort((a, b) => a.codice.localeCompare(b.codice))
                .map((a) => (
                  <FormControlLabel
                    key={a.id}
                    control={
                      <Checkbox
                        checked={c.articoliIds.includes(a.id)}
                        onChange={(e) =>
                          setC({ ...c, articoliIds: e.target.checked ? [...c.articoliIds, a.id] : c.articoliIds.filter((x) => x !== a.id) })
                        }
                      />
                    }
                    label={a.nome}
                  />
                ))}
            </Box>
          </Box>
          <TextField label="Note" value={c.note ?? ""} onChange={(e) => setC({ ...c, note: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {esistente && (
          <Button
            color="error"
            sx={{ mr: "auto" }}
            onClick={async () => {
              if (await conferma("Eliminare il costo fisso?", "Il costo vivo degli articoli collegati diminuirà.", "Elimina")) {
                elimina("costiFissi", c.id);
                notifica("Costo fisso eliminato");
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
          disabled={!c.nome.trim()}
          onClick={() => {
            salva("costiFissi", { ...c, nome: c.nome.trim() });
            notifica("Costo fisso salvato");
            onChiudi();
          }}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}
