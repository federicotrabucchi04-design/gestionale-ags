"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
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
import {
  edizioniDelMovimento,
  importoSuEdizione,
  movimentoSuEdizione,
  normalizzaQuoteMovimento,
  nuovoId,
  type CalcoloEdizione,
} from "@/lib/calcoli";
import { data, euro } from "@/lib/format";
import type { Edizione, Movimento } from "@/lib/types";

export default function MovimentiEdizione({ ed, calc }: { ed: Edizione; calc: CalcoloEdizione }) {
  const { dati, salva, notifica } = useGestionale();
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [incassa, setIncassa] = useState(false);
  const lista = dati.movimenti.filter((m) => movimentoSuEdizione(m, ed.id)).sort((a, b) => (a.data < b.data ? -1 : 1));

  const proposte = useMemo(() => {
    const ricavi = Math.round(calc.reale.ricavi * 100) / 100;
    const giaIncassi = lista
      .filter((m) => m.tipo === "entrata" && m.categoria === "Incassi evento")
      .reduce((s, m) => s + importoSuEdizione(m, ed.id), 0);
    return {
      ricavi,
      giaIncassi,
      gap: Math.round((ricavi - giaIncassi) * 100) / 100,
      haIncassoSimile: lista.some((m) => m.tipo === "entrata" && Math.abs(importoSuEdizione(m, ed.id) - ricavi) < 1),
    };
  }, [calc.reale.ricavi, lista, ed.id]);

  const [includiIncasso, setIncludiIncasso] = useState(true);

  const confermaIncasso = () => {
    if (includiIncasso && proposte.gap > 0.005) {
      if (proposte.haIncassoSimile) {
        notifica("Esiste già un incasso simile: controlla i movimenti prima di duplicare", "error");
        return;
      }
      const m = normalizzaQuoteMovimento(
        movimentoVuoto({
          id: nuovoId(),
          tipo: "entrata",
          descrizione: `Incasso ${ed.nome}`,
          categoria: "Incassi evento",
          importo: proposte.gap,
          edizioneId: ed.id,
          quote: [{ edizioneId: ed.id, importo: proposte.gap }],
          data: ed.data,
          stato: "ufficiale",
        }),
      );
      salva("movimenti", m);
      notifica(`Incasso di ${euro(proposte.gap)} registrato`);
    }
    setIncassa(false);
  };

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2, justifyContent: "flex-end" }}>
        <Button variant="contained" color="success" startIcon={<PaymentsOutlined />} onClick={() => setIncassa(true)}>
          Incassa edizione
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddOutlined />}
          onClick={() =>
            setMovimento(movimentoVuoto({ tipo: "uscita", categoria: "Fornitori", edizioneId: ed.id, quote: [{ edizioneId: ed.id, importo: 0 }], data: ed.data }))
          }
        >
          Registra spesa
        </Button>
      </Stack>

      {Math.abs(calc.quadratura.ricavi) > 20 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Incassi registrati e ricavi calcolati differiscono di {euro(Math.abs(calc.quadratura.ricavi))}. Usa «Incassa edizione» per allineare.
        </Alert>
      )}

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
            testo="Registra l'incasso e le spese pagate: entrano nella cassa dell'anno. Le spese ancora da pagare segnalale come previste."
          />
        ) : (
          <List disablePadding>
            {lista.map((m) => {
              const quota = importoSuEdizione(m, ed.id);
              const ripartito = edizioniDelMovimento(m).length > 1;
              const firmatoQuota = m.tipo === "entrata" ? quota : -quota;
              return (
                <ListItemButton key={m.id} divider onClick={() => setMovimento(m)}>
                  <ListItemText
                    primary={m.descrizione}
                    secondary={`${data(m.data)} · ${m.categoria}${m.fornitoreId ? ` · ${dati.fornitori.find((f) => f.id === m.fornitoreId)?.nome ?? ""}` : ""}${ripartito ? ` · quota di ${euro(m.importo)}` : ""}`}
                  />
                  <Stack sx={{ alignItems: "flex-end", gap: 0.5 }}>
                    <Typography sx={{ fontWeight: 500, color: m.tipo === "entrata" ? "success.main" : "error.main" }}>{euro(firmatoQuota)}</Typography>
                    {m.stato === "previsto" && <Etichetta tono="attenzione">Previsto</Etichetta>}
                    {ripartito && <Etichetta tono="neutro">Ripartito</Etichetta>}
                  </Stack>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Card>

      <Dialog open={incassa} onClose={() => setIncassa(false)} fullWidth maxWidth="sm">
        <DialogTitle>Incassa edizione</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ricavi reali calcolati: <b>{euro(proposte.ricavi)}</b>. Incassi già registrati: <b>{euro(proposte.giaIncassi)}</b>. Manca{" "}
              <b>{euro(Math.max(0, proposte.gap))}</b>.
            </Typography>
            {proposte.haIncassoSimile && (
              <Alert severity="warning">C&apos;è già un movimento di incasso vicino al totale ricavi: controlla prima di aggiungerne un altro.</Alert>
            )}
            <FormControlLabel
              control={<Checkbox checked={includiIncasso} onChange={(e) => setIncludiIncasso(e.target.checked)} />}
              label={`Registra entrata «Incasso ${ed.nome}» per ${euro(Math.max(0, proposte.gap))}`}
              disabled={proposte.gap <= 0}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncassa(false)}>Annulla</Button>
          <Button variant="contained" onClick={confermaIncasso} disabled={proposte.gap <= 0 && includiIncasso}>
            Conferma
          </Button>
        </DialogActions>
      </Dialog>

      <MovimentoDialog movimento={movimento} onChiudi={() => setMovimento(null)} />
    </>
  );
}
