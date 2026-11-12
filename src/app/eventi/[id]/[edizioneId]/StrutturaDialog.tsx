"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import { CampoScelta } from "@/components/ui";
import { nuovoId } from "@/lib/calcoli";
import { FORMULE_SERATA, TIPI_PARTE, nuovaParte, partiSerata } from "@/lib/modelli";
import type { Edizione, FormulaServizio, Parte, Serata, TipoParte } from "@/lib/types";

type Struttura = Pick<Edizione, "parti" | "serate" | "presepe">;

function haDati(p: Parte): boolean {
  return (
    p.menu.some((m) => m.qtaReale || m.qtaPrevista) ||
    p.acquisti.some((a) => a.lottiReali || a.lottiPrevisti || a.daMagazzino) ||
    p.costiExtra.length > 0 ||
    !!(p.ingresso && (p.ingresso.prevendite || p.ingresso.venditeGiorno)) ||
    !!(p.lotteria && (p.lotteria.vendutiReali || p.lotteria.premi.length))
  );
}

/** Add, rename or remove evenings and parts of an edition. */
export default function StrutturaDialog({ ed, aperto, onChiudi, onApplica }: { ed: Edizione; aperto: boolean; onChiudi: () => void; onApplica: (s: Struttura) => void }) {
  const mobile = useMediaQuery("(max-width:600px)");
  const [s, setS] = useState<Struttura>({ parti: ed.parti, serate: ed.serate, presepe: ed.presepe });
  const [eraAperto, setEraAperto] = useState(false);
  if (aperto !== eraAperto) {
    setEraAperto(aperto);
    if (aperto) setS({ parti: ed.parti, serate: ed.serate, presepe: ed.presepe });
  }
  const [nuova, setNuova] = useState<{ tipo: TipoParte; nome: string; serataId: string; formula: FormulaServizio }>({
    tipo: "bar",
    nome: "",
    serataId: "",
    formula: "carta",
  });

  const setSerata = (id: string, patch: Partial<Serata>) => setS((x) => ({ ...x, serate: x.serate?.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
  const setParte = (id: string, patch: Partial<Parte>) => setS((x) => ({ ...x, parti: x.parti.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const togliParte = (p: Parte) => {
    if (haDati(p) && !window.confirm(`"${p.nome}" contiene dati. Eliminarla?`)) return;
    setS((x) => ({ ...x, parti: x.parti.filter((y) => y.id !== p.id) }));
  };
  const togliSerata = (sr: Serata) => {
    const sue = s.parti.filter((p) => p.serataId === sr.id);
    if (sue.some(haDati) && !window.confirm(`La serata "${sr.nome}" ha parti con dati. Eliminarla con tutte le sue parti?`)) return;
    setS((x) => ({ ...x, serate: x.serate?.filter((v) => v.id !== sr.id), parti: x.parti.filter((p) => p.serataId !== sr.id) }));
  };
  const aggiungiSerata = () => {
    const ultima = s.serate?.[s.serate.length - 1];
    const sr: Serata = { id: nuovoId(), nome: `Serata ${(s.serate?.length ?? 0) + 1}`, data: ultima?.data ?? ed.data, formula: "bar", peso: 1 };
    setS((x) => ({ ...x, serate: [...(x.serate ?? []), sr], parti: [...x.parti, ...partiSerata(sr)] }));
  };
  const aggiungiParte = () => {
    const p = nuovaParte(nuova.tipo, nuova.nome.trim() || TIPI_PARTE[nuova.tipo].etichetta, {
      serataId: nuova.serataId || undefined,
      formula: nuova.tipo === "servizio" ? nuova.formula : undefined,
    });
    setS((x) => ({ ...x, parti: [...x.parti, p] }));
    setNuova({ ...nuova, nome: "" });
  };

  const fuori = s.parti.filter((p) => !p.serataId || !s.serate?.some((v) => v.id === p.serataId));
  const rigaParte = (p: Parte) => (
    <Stack key={p.id} direction="row" spacing={1} sx={{ alignItems: "center", pl: 1 }}>
      <TextField size="small" value={p.nome} onChange={(e) => setParte(p.id, { nome: e.target.value })} sx={{ flex: 1 }} />
      <Typography variant="caption" color="text.secondary" sx={{ width: 120 }}>
        {TIPI_PARTE[p.tipo].etichetta}
        {p.tipo === "servizio" && (p.formula === "fisso" ? " fisso" : " alla carta")}
      </Typography>
      <Tooltip title="Elimina parte">
        <IconButton size="small" onClick={() => togliParte(p)}>
          <DeleteOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  return (
    <Dialog open={aperto} onClose={onChiudi} fullWidth maxWidth="md" fullScreen={mobile}>
      <DialogTitle>Struttura dell&apos;edizione</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {s.presepe !== undefined && (
            <CampoScelta
              label="Presepe"
              valore={s.presepe}
              onCambia={(presepe) => setS((x) => ({ ...x, presepe }))}
              opzioni={[
                { valore: "vivente", etichetta: "Presepe vivente" },
                { valore: "fermo", etichetta: "Presepe fermo" },
              ]}
              sx={{ maxWidth: 260 }}
            />
          )}
          {s.serate?.map((sr) => (
            <Box key={sr.id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5 }}>
              <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr 1fr", md: "2fr 1.3fr 2fr auto" }, alignItems: "center", mb: 1 }}>
                <TextField size="small" label="Serata" value={sr.nome} onChange={(e) => setSerata(sr.id, { nome: e.target.value })} />
                <TextField
                  size="small"
                  type="date"
                  label="Data"
                  value={sr.data}
                  onChange={(e) => setSerata(sr.id, { data: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <CampoScelta
                  size="small"
                  label="Formula"
                  valore={sr.formula}
                  onCambia={(formula) => setSerata(sr.id, { formula })}
                  opzioni={Object.entries(FORMULE_SERATA).map(([valore, etichetta]) => ({ valore: valore as Serata["formula"], etichetta }))}
                />
                <Tooltip title="Elimina serata">
                  <IconButton onClick={() => togliSerata(sr)}>
                    <DeleteOutlined />
                  </IconButton>
                </Tooltip>
              </Box>
              <Stack spacing={1}>{s.parti.filter((p) => p.serataId === sr.id).map(rigaParte)}</Stack>
            </Box>
          ))}
          {s.serate && (
            <Button startIcon={<AddOutlined />} onClick={aggiungiSerata} sx={{ alignSelf: "flex-start" }}>
              Aggiungi serata
            </Button>
          )}
          {fuori.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {s.serate?.length ? "Parti fuori dalle serate" : "Parti"}
              </Typography>
              <Stack spacing={1}>{fuori.map(rigaParte)}</Stack>
            </Box>
          )}
          <Divider />
          <Typography variant="subtitle2">Aggiungi una parte</Typography>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1.3fr 1.5fr 1.3fr 1fr auto" }, alignItems: "center" }}>
            <CampoScelta
              size="small"
              label="Tipo"
              valore={nuova.tipo}
              onCambia={(tipo) => setNuova({ ...nuova, tipo })}
              opzioni={Object.entries(TIPI_PARTE).map(([valore, t]) => ({ valore: valore as TipoParte, etichetta: t.etichetta }))}
            />
            <TextField size="small" label="Nome" placeholder={TIPI_PARTE[nuova.tipo].etichetta} value={nuova.nome} onChange={(e) => setNuova({ ...nuova, nome: e.target.value })} />
            {s.serate?.length ? (
              <CampoScelta
                size="small"
                label="Serata"
                valore={nuova.serataId}
                vuoto="Nessuna"
                onCambia={(serataId) => setNuova({ ...nuova, serataId })}
                opzioni={s.serate.map((v) => ({ valore: v.id, etichetta: v.nome }))}
              />
            ) : (
              <Box />
            )}
            {nuova.tipo === "servizio" ? (
              <CampoScelta
                size="small"
                label="Formula"
                valore={nuova.formula}
                onCambia={(formula) => setNuova({ ...nuova, formula })}
                opzioni={[
                  { valore: "carta", etichetta: "Alla carta" },
                  { valore: "fisso", etichetta: "Menu fisso" },
                ]}
              />
            ) : (
              <Box />
            )}
            <Button variant="outlined" startIcon={<AddOutlined />} onClick={aggiungiParte}>
              Aggiungi
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {TIPI_PARTE[nuova.tipo].descrizione}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onChiudi}>Annulla</Button>
        <Button variant="contained" onClick={() => onApplica(s)} disabled={!s.parti.length}>
          Applica
        </Button>
      </DialogActions>
    </Dialog>
  );
}
