"use client";

import { useMemo, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddOutlined from "@mui/icons-material/AddOutlined";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import { caricaAllegato, eliminaAllegatoStorage } from "@/lib/allegati";
import { normalizzaQuoteMovimento, nuovoId, oggiISO, quoteMovimento } from "@/lib/calcoli";
import { euro } from "@/lib/format";
import type { Movimento, QuotaEdizione } from "@/lib/types";
import { CampoNumero, CampoScelta } from "./ui";
import { useGestionale } from "./Gestionale";

export function movimentoVuoto(p: Partial<Movimento> = {}): Movimento {
  const base: Movimento = {
    id: nuovoId(),
    data: oggiISO(),
    descrizione: "",
    tipo: "uscita",
    importo: 0,
    stato: "ufficiale",
    categoria: "Altro",
    ...p,
  };
  if (base.edizioneId && !base.quote?.length) {
    base.quote = [{ edizioneId: base.edizioneId, importo: base.importo || 0 }];
  }
  return base;
}

function etichettaEdizione(
  id: string,
  edizioni: { id: string; nome: string; eventoId: string; data: string }[],
  eventi: { id: string; nome: string }[],
) {
  const e = edizioni.find((x) => x.id === id);
  if (!e) return id;
  const ev = eventi.find((x) => x.id === e.eventoId)?.nome ?? "Evento";
  return `${ev} · ${e.nome}`;
}

export default function MovimentoDialog({
  movimento,
  onChiudi,
}: {
  movimento: Movimento | null;
  onChiudi: () => void;
}) {
  const { dati, salva, elimina, notifica, conferma, solaLettura } = useGestionale();
  const [m, setM] = useState<Movimento | null>(movimento);
  const [caricamento, setCaricamento] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mobile = useMediaQuery("(max-width:600px)");
  const [origine, setOrigine] = useState(movimento);
  if (movimento !== origine) {
    setOrigine(movimento);
    setM(
      movimento
        ? {
            ...movimento,
            quote: quoteMovimento(movimento).map((q) => ({ ...q })),
          }
        : null,
    );
  }

  const esistente = movimento ? dati.movimenti.some((x) => x.id === movimento.id) : false;
  const edizioniOrd = useMemo(
    () => [...dati.edizioni].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [dati.edizioni],
  );
  const opzioniEdizione = useMemo(
    () =>
      edizioniOrd.map((e) => ({
        id: e.id,
        label: etichettaEdizione(e.id, edizioniOrd, dati.eventi),
      })),
    [edizioniOrd, dati.eventi],
  );

  if (!m) return null;
  const set = (p: Partial<Movimento>) => setM({ ...m, ...p });
  const quote = m.quote ?? [];
  const sommaQuote = quote.reduce((s, q) => s + (q.importo || 0), 0);
  const resto = Math.round((m.importo - sommaQuote) * 100) / 100;
  const valido =
    m.descrizione.trim() !== "" &&
    m.importo > 0 &&
    !!m.data &&
    (quote.length === 0 || Math.abs(resto) < 0.005);

  const setQuote = (q: QuotaEdizione[]) => set({ quote: q, edizioneId: q.length === 1 ? q[0].edizioneId : undefined });

  const aggiornaQuota = (i: number, p: Partial<QuotaEdizione>) => {
    const next = quote.map((q, idx) => (idx === i ? { ...q, ...p } : q));
    setQuote(next);
  };

  const aggiungiEdizione = (edizioneId: string | null) => {
    if (!edizioneId || quote.some((q) => q.edizioneId === edizioneId)) return;
    const importo = Math.max(0, resto || (quote.length === 0 ? m.importo : 0));
    setQuote([...quote, { edizioneId, importo }]);
  };

  const dividiUguale = () => {
    if (!quote.length || !m.importo) return;
    const base = Math.floor((m.importo * 100) / quote.length) / 100;
    const next = quote.map((q, i) => ({
      ...q,
      importo: i === quote.length - 1 ? Math.round((m.importo - base * (quote.length - 1)) * 100) / 100 : base,
    }));
    setQuote(next);
  };

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
            <CampoNumero
              label="Importo"
              euro
              valore={m.importo}
              onCambia={(v) => {
                if (quote.length === 1) set({ importo: v, quote: [{ ...quote[0], importo: v }] });
                else set({ importo: v });
              }}
            />
            <TextField label="Data" type="date" value={m.data} onChange={(e) => set({ data: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Autocomplete
            freeSolo
            options={dati.impostazioni.categorieMovimento}
            value={m.categoria}
            onInputChange={(_, v) => set({ categoria: v })}
            renderInput={(p) => <TextField {...p} label="Categoria" />}
          />

          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Riparto su eventi / edizioni
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              Lascia vuoto per la gestione ordinaria. Aggiungi più edizioni (anche di eventi diversi) per spartire la stessa fattura o pagamento.
            </Typography>
            <Stack spacing={1.25}>
              {quote.map((q, i) => (
                <Stack key={`${q.edizioneId}-${i}`} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField
                    size="small"
                    label="Edizione"
                    value={etichettaEdizione(q.edizioneId, edizioniOrd, dati.eventi)}
                    fullWidth
                    slotProps={{ input: { readOnly: true } }}
                  />
                  <CampoNumero label="Quota" euro valore={q.importo} onCambia={(v) => aggiornaQuota(i, { importo: v })} />
                  <IconButton aria-label="Rimuovi" onClick={() => setQuote(quote.filter((_, idx) => idx !== i))} size="small">
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Autocomplete
                size="small"
                options={opzioniEdizione.filter((o) => !quote.some((q) => q.edizioneId === o.id))}
                getOptionLabel={(o) => o.label}
                onChange={(_, v) => aggiungiEdizione(v?.id ?? null)}
                value={null}
                renderInput={(p) => <TextField {...p} label="Aggiungi edizione" placeholder="Cerca evento o edizione…" />}
              />
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                <Button size="small" startIcon={<AddOutlined />} disabled={quote.length < 2 || !m.importo} onClick={dividiUguale}>
                  Dividi in parti uguali
                </Button>
                <Typography variant="caption" color={Math.abs(resto) < 0.005 ? "text.secondary" : "error.main"}>
                  {quote.length === 0
                    ? "Gestione ordinaria (nessun evento)"
                    : Math.abs(resto) < 0.005
                      ? `Somma quote = ${euro(sommaQuote)}`
                      : `Mancano ${euro(resto)} per arrivare a ${euro(m.importo)}`}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <CampoScelta
            label="Fornitore"
            valore={m.fornitoreId ?? ""}
            onCambia={(v) => set({ fornitoreId: v || undefined })}
            vuoto="Nessuno"
            opzioni={[...dati.fornitori].sort((a, b) => a.nome.localeCompare(b.nome)).map((f) => ({ valore: f.id, etichetta: f.nome }))}
          />
          <TextField label="Note" value={m.note ?? ""} onChange={(e) => set({ note: e.target.value })} multiline minRows={2} />

          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Scontrino / fattura
            </Typography>
            {m.allegato ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                <Link href={m.allegato.url} target="_blank" rel="noopener noreferrer">
                  {m.allegato.nome}
                </Link>
                {!solaLettura && (
                  <IconButton
                    size="small"
                    aria-label="Rimuovi allegato"
                    onClick={async () => {
                      await eliminaAllegatoStorage(m.allegato);
                      set({ allegato: undefined });
                    }}
                  >
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            ) : (
              <Button size="small" startIcon={<AttachFileOutlined />} disabled={solaLettura || caricamento} onClick={() => fileRef.current?.click()}>
                {caricamento ? "Caricamento…" : "Allega foto o PDF"}
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setCaricamento(true);
                try {
                  const allegato = await caricaAllegato(f, m.id);
                  set({ allegato });
                  notifica("Allegato pronto: salva il movimento");
                } catch (err) {
                  notifica(err instanceof Error ? err.message : "Caricamento non riuscito", "error");
                } finally {
                  setCaricamento(false);
                }
              }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {esistente && !solaLettura && (
          <Button
            color="error"
            sx={{ mr: "auto" }}
            onClick={async () => {
              if (await conferma("Eliminare il movimento?", `"${m.descrizione}" verrà eliminato definitivamente.`, "Elimina")) {
                await eliminaAllegatoStorage(m.allegato);
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
          disabled={!valido || solaLettura || caricamento}
          onClick={() => {
            const pronto = normalizzaQuoteMovimento({ ...m, descrizione: m.descrizione.trim() });
            salva("movimenti", pronto);
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
