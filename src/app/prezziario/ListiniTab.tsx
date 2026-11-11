"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ReceiptOutlined from "@mui/icons-material/ReceiptOutlined";
import { useGestionale } from "@/components/Gestionale";
import { CampoNumero, Etichetta, Griglia, Vuoto } from "@/components/ui";
import { listinoAl, nuovoId, oggiISO } from "@/lib/calcoli";
import { data as fmtData, euro } from "@/lib/format";
import type { Listino } from "@/lib/types";

export default function ListiniTab() {
  const { dati } = useGestionale();
  const [aperto, setAperto] = useState<Listino | null>(null);
  const attivo = listinoAl(dati.listini, oggiISO());
  const ordinati = [...dati.listini].sort((a, b) => (a.validoDal < b.validoDal ? 1 : -1));

  const nuovo = (): Listino => {
    const base = ordinati[0];
    return {
      id: nuovoId(),
      nome: `Listino ${new Date().getFullYear()}`,
      validoDal: oggiISO(),
      prezzi: { ...(base?.prezzi ?? {}) },
    };
  };

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Ogni listino vale dalla sua data fino al listino successivo. Le edizioni usano in automatico il listino valido alla loro data.
        </Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAperto(nuovo())}>
          Nuovo listino
        </Button>
      </Stack>

      {ordinati.length === 0 ? (
        <Card>
          <Vuoto
            icona={<ReceiptOutlined />}
            titolo="Nessun listino"
            testo="Crea il primo listino con i prezzi di vendita. Per cambiare prezzi in futuro, crea un nuovo listino con la nuova data: quello vecchio resta per lo storico."
            azione={<Button variant="contained" onClick={() => setAperto(nuovo())}>Crea listino</Button>}
          />
        </Card>
      ) : (
        <Griglia min={260}>
          {ordinati.map((l) => {
            const n = Object.keys(l.prezzi).filter((k) => dati.articoli.some((a) => a.id === k)).length;
            return (
              <Card key={l.id} sx={{ borderColor: l.id === attivo?.id ? "primary.main" : undefined }}>
                <CardActionArea onClick={() => setAperto(l)} sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="h6" sx={{ fontSize: 17 }}>
                        {l.nome}
                      </Typography>
                      {l.id === attivo?.id && <Etichetta tono="primario">In vigore</Etichetta>}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Valido dal {fmtData(l.validoDal)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {n} articoli con prezzo
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Griglia>
      )}

      <ListinoDialog listino={aperto} onChiudi={() => setAperto(null)} />
    </>
  );
}

function ListinoDialog({ listino, onChiudi }: { listino: Listino | null; onChiudi: () => void }) {
  const { dati, salva, elimina, notifica, conferma } = useGestionale();
  const [l, setL] = useState<Listino | null>(listino);
  const mobile = useMediaQuery("(max-width:900px)");
  const [origine, setOrigine] = useState(listino);
  if (listino !== origine) {
    setOrigine(listino);
    setL(listino);
  }
  if (!l) return null;

  const esistente = dati.listini.some((x) => x.id === l.id);
  const precedente = [...dati.listini]
    .filter((x) => x.id !== l.id && x.validoDal < l.validoDal)
    .sort((a, b) => (a.validoDal < b.validoDal ? 1 : -1))[0];
  const articoli = [...dati.articoli].sort((a, b) => Number(b.attivo) - Number(a.attivo) || a.codice.localeCompare(b.codice));
  const stessaData = dati.listini.some((x) => x.id !== l.id && x.validoDal === l.validoDal);

  return (
    <Dialog open onClose={onChiudi} fullWidth maxWidth="md" fullScreen={mobile}>
      <DialogTitle>{esistente ? l.nome : "Nuovo listino"}</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 1, mb: 2 }}>
          <TextField label="Nome" value={l.nome} onChange={(e) => setL({ ...l, nome: e.target.value })} />
          <TextField
            label="Valido dal"
            type="date"
            value={l.validoDal}
            onChange={(e) => setL({ ...l, validoDal: e.target.value })}
            error={stessaData}
            helperText={stessaData ? "Esiste già un listino con questa data" : undefined}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        {articoli.length === 0 ? (
          <Typography color="text.secondary">Crea prima gli articoli nella scheda Articoli e ricette.</Typography>
        ) : (
          <Box className="tabella-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Articolo</TableCell>
                  {precedente && <TableCell className="num">Prima ({fmtData(precedente.validoDal)})</TableCell>}
                  <TableCell sx={{ width: 160 }}>Prezzo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {articoli.map((a) => {
                  const prima = precedente?.prezzi[a.id];
                  const ora = l.prezzi[a.id];
                  return (
                    <TableRow key={a.id} sx={{ opacity: a.attivo ? 1 : 0.6 }}>
                      <TableCell>
                        {a.nome}
                        <Typography variant="caption" color="text.secondary" component="div">
                          {a.codice} · {a.categoria}
                          {!a.attivo && " · non attivo"}
                        </Typography>
                      </TableCell>
                      {precedente && (
                        <TableCell className="num" sx={{ color: "text.secondary" }}>
                          {euro(prima)}
                          {prima !== undefined && ora !== undefined && ora !== prima && (
                            <Typography variant="caption" component="div" sx={{ color: ora > prima ? "success.main" : "error.main" }}>
                              {ora > prima ? "+" : ""}
                              {euro(ora - prima)}
                            </Typography>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <CampoNumero
                          euro
                          valore={ora}
                          placeholder="-"
                          onCambia={(v) => {
                            const prezzi = { ...l.prezzi };
                            if (v > 0) prezzi[a.id] = v;
                            else delete prezzi[a.id];
                            setL({ ...l, prezzi });
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {esistente && (
          <>
            <Button
              color="error"
              sx={{ mr: "auto" }}
              onClick={async () => {
                if (await conferma("Eliminare il listino?", "Le edizioni di quel periodo useranno il listino precedente.", "Elimina")) {
                  elimina("listini", l.id);
                  notifica("Listino eliminato");
                  onChiudi();
                }
              }}
            >
              Elimina
            </Button>
            <Button onClick={() => setL({ ...l, id: nuovoId(), nome: `${l.nome} (copia)`, validoDal: oggiISO() })}>Duplica</Button>
          </>
        )}
        <Button onClick={onChiudi}>Annulla</Button>
        <Button
          variant="contained"
          disabled={!l.nome.trim() || !l.validoDal || stessaData}
          onClick={() => {
            salva("listini", l);
            notifica("Listino salvato");
            onChiudi();
          }}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}
