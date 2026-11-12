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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { CampoNumero, CampoScelta, Etichetta, Griglia, Vuoto } from "@/components/ui";
import { METODI_RIPARTO, listinoAl, nuovoId, oggiISO, quotaCostoFisso, quoteCostoFisso } from "@/lib/calcoli";
import { euro, euroFine, numero } from "@/lib/format";
import { righeMenu } from "@/lib/modelli";
import type { CostoFisso, MetodoRiparto } from "@/lib/types";

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
                  <Typography variant="body2" color="text.secondary">
                    Riparto: {METODI_RIPARTO[c.metodo ?? "pezzo"].etichetta.toLowerCase()}
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
    ? righeMenu(ultimaEdizione)
        .filter((m) => c.articoliIds.includes(m.articoloId))
        .reduce((s, m) => s + (m.qtaPrevista || 0), 0)
    : 0;
  const oggi = oggiISO();
  const quote = quoteCostoFisso(c, oggi, dati);
  const listino = listinoAl(dati.listini, oggi);
  const metodo = c.metodo ?? "pezzo";

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
            Quota media per pezzo: <b>{euroFine(quotaCostoFisso(c))}</b>
          </Typography>
          <CampoScelta
            label="Come dividerlo fra gli articoli"
            valore={metodo}
            onCambia={(m) => setC({ ...c, metodo: m })}
            opzioni={(Object.keys(METODI_RIPARTO) as MetodoRiparto[]).map((k) => ({ valore: k, etichetta: METODI_RIPARTO[k].etichetta }))}
            helperText={METODI_RIPARTO[metodo].spiegazione}
          />
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
          {c.articoliIds.length > 1 && quotaCostoFisso(c) > 0 && (
            <Box>
              <Typography variant="subtitle2">Confronto fra i metodi (quota per pezzo, prezzi di oggi)</Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                Le quote cambiano da articolo ad articolo, ma il totale recuperato è sempre lo stesso: i pesi vengono dalle vendite dell&apos;ultima edizione.
              </Typography>
              <Box className="tabella-scroll">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Articolo</TableCell>
                      <TableCell className="num">Prezzo</TableCell>
                      {(Object.keys(METODI_RIPARTO) as MetodoRiparto[]).map((k) => (
                        <TableCell key={k} className="num" sx={{ fontWeight: k === metodo ? 700 : undefined }}>
                          {METODI_RIPARTO[k].etichetta.replace("In proporzione al", "Al")}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {c.articoliIds.map((id) => {
                      const q = quote.get(id);
                      const a = dati.articoli.find((x) => x.id === id);
                      if (!a || !q) return null;
                      return (
                        <TableRow key={id}>
                          <TableCell>{a.nome}</TableCell>
                          <TableCell className="num">{euro(listino?.prezzi[id])}</TableCell>
                          {(Object.keys(METODI_RIPARTO) as MetodoRiparto[]).map((k) => (
                            <TableCell key={k} className="num" sx={{ fontWeight: k === metodo ? 700 : undefined }}>
                              {euroFine(q[k])}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
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
