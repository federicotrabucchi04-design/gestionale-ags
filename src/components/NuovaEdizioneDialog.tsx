"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { annoSociale, listinoAl, nuovoId, oggiISO } from "@/lib/calcoli";
import { data as fmtData } from "@/lib/format";
import type { Edizione, Evento } from "@/lib/types";
import { CampoNumero, CampoScelta } from "./ui";
import { useGestionale } from "./Gestionale";

export default function NuovaEdizioneDialog({
  evento,
  aperto,
  onChiudi,
  onCreata,
}: {
  evento: Evento;
  aperto: boolean;
  onChiudi: () => void;
  onCreata: (e: Edizione) => void;
}) {
  const { dati, salva, notifica } = useGestionale();
  const mobile = useMediaQuery("(max-width:600px)");
  const precedenti = useMemo(
    () => dati.edizioni.filter((e) => e.eventoId === evento.id).sort((a, b) => (a.data < b.data ? 1 : -1)),
    [dati.edizioni, evento.id],
  );
  const [nome, setNome] = useState("");
  const [dataEd, setDataEd] = useState(oggiISO());
  const [partecipanti, setPartecipanti] = useState(0);
  const [listinoId, setListinoId] = useState("");
  const [origine, setOrigine] = useState("");
  const [copia, setCopia] = useState({ menu: true, acquisti: true, extra: true });

  const [eraAperto, setEraAperto] = useState(false);
  if (aperto !== eraAperto) {
    setEraAperto(aperto);
    if (aperto) {
      const oggi = oggiISO();
      setNome(`${evento.nome} ${oggi.slice(0, 4)}`);
      setDataEd(oggi);
      setPartecipanti(precedenti[0]?.partecipantiReali || precedenti[0]?.partecipantiPrevisti || 0);
      setListinoId("");
      setOrigine(precedenti[0]?.id ?? "");
    }
  }

  const listinoAuto = listinoAl(dati.listini, dataEd);
  const sorgente = precedenti.find((e) => e.id === origine);
  const doppione = dati.edizioni.some((e) => e.eventoId === evento.id && e.nome.trim().toLowerCase() === nome.trim().toLowerCase());

  const crea = () => {
    const ed: Edizione = {
      id: nuovoId(),
      eventoId: evento.id,
      nome: nome.trim(),
      data: dataEd,
      listinoId: listinoId || undefined,
      partecipantiPrevisti: partecipanti || undefined,
      stato: "pianificata",
      menu:
        sorgente && copia.menu
          ? sorgente.menu.map((m) => ({ id: nuovoId(), articoloId: m.articoloId, qtaPrevista: m.qtaReale || m.qtaPrevista, qtaReale: 0 }))
          : [],
      acquisti:
        sorgente && copia.acquisti
          ? sorgente.acquisti.map((a) => ({ id: nuovoId(), mpId: a.mpId, lottiPrevisti: a.lottiReali || a.lottiPrevisti, lottiReali: 0, daMagazzino: 0, rimanenza: 0 }))
          : [],
      costiExtra:
        sorgente && copia.extra
          ? sorgente.costiExtra.map((c) => ({ id: nuovoId(), descrizione: c.descrizione, importoPrevisto: c.importoReale || c.importoPrevisto, importoReale: 0, ripartisci: c.ripartisci }))
          : [],
    };
    salva("edizioni", ed);
    notifica("Edizione creata");
    onChiudi();
    onCreata(ed);
  };

  return (
    <Dialog open={aperto} onClose={onChiudi} fullWidth maxWidth="sm" fullScreen={mobile}>
      <DialogTitle>Nuova edizione di {evento.nome}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <TextField
            label="Nome edizione"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            error={doppione}
            helperText={doppione ? "Esiste già un'edizione con questo nome" : undefined}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Data"
              type="date"
              value={dataEd}
              onChange={(e) => setDataEd(e.target.value)}
              helperText={dataEd ? `Anno sociale ${annoSociale(dataEd)}` : undefined}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <CampoNumero label="Partecipanti previsti" valore={partecipanti} onCambia={setPartecipanti} />
          </Stack>
          <CampoScelta
            label="Listino prezzi"
            valore={listinoId}
            onCambia={setListinoId}
            vuoto={listinoAuto ? `Automatico: ${listinoAuto.nome} (dal ${fmtData(listinoAuto.validoDal)})` : "Automatico (nessun listino valido)"}
            opzioni={[...dati.listini]
              .sort((a, b) => (a.validoDal < b.validoDal ? 1 : -1))
              .map((l) => ({ valore: l.id, etichetta: `${l.nome} (dal ${fmtData(l.validoDal)})` }))}
            helperText="Di solito lascia Automatico: usa il listino valido alla data dell'edizione."
          />
          {!listinoAuto && !listinoId && (
            <Alert severity="warning">Nessun listino valido a questa data: crealo nel Prezziario per avere i prezzi del menu.</Alert>
          )}

          {precedenti.length > 0 && (
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#f8f9fb" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Parti da un&apos;edizione precedente
              </Typography>
              <CampoScelta
                label="Copia da"
                valore={origine}
                onCambia={setOrigine}
                vuoto="Edizione vuota"
                opzioni={precedenti.map((e) => ({ valore: e.id, etichetta: `${e.nome} (${fmtData(e.data)})` }))}
              />
              {sorgente && (
                <Stack sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={<Checkbox checked={copia.menu} onChange={(e) => setCopia({ ...copia, menu: e.target.checked })} />}
                    label={`Menu (${sorgente.menu.length} articoli, quantità reali come nuove previsioni)`}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={copia.acquisti} onChange={(e) => setCopia({ ...copia, acquisti: e.target.checked })} />}
                    label={`Acquisti (${sorgente.acquisti.length} materie prime)`}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={copia.extra} onChange={(e) => setCopia({ ...copia, extra: e.target.checked })} />}
                    label={`Costi extra (${sorgente.costiExtra.length})`}
                  />
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onChiudi}>Annulla</Button>
        <Button variant="contained" disabled={!nome.trim() || !dataEd || doppione} onClick={crea}>
          Crea edizione
        </Button>
      </DialogActions>
    </Dialog>
  );
}
