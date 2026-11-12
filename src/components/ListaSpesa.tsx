"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import ShareOutlined from "@mui/icons-material/ShareOutlined";
import type { CalcoloEdizione } from "@/lib/calcoli";
import { data as fmtData, euro, numero } from "@/lib/format";
import type { Edizione } from "@/lib/types";
import { useGestionale } from "./Gestionale";

interface Voce {
  nome: string;
  lotti: number;
  qta: number;
  um: string;
  costo: number;
  parti: string[];
}

/** Shopping list from the planned purchases of an edition, grouped by supplier. */
export default function ListaSpesa({ aperta, ed, calc, onChiudi }: { aperta: boolean; ed: Edizione; calc: CalcoloEdizione; onChiudi: () => void }) {
  const { dati, notifica } = useGestionale();

  const gruppi = useMemo(() => {
    const m = new Map<string, Map<string, Voce>>();
    for (const a of calc.acquisti) {
      if (!(a.riga.lottiPrevisti > 0)) continue;
      const forn = a.prezzo?.fornitoreId ? (dati.fornitori.find((f) => f.id === a.prezzo!.fornitoreId)?.nome ?? "Altro") : "Senza fornitore";
      if (!m.has(forn)) m.set(forn, new Map());
      const g = m.get(forn)!;
      const parte = ed.parti.find((p) => p.id === a.parteId)?.nome ?? "";
      const v = g.get(a.riga.mpId) ?? { nome: a.mp?.nome ?? "?", lotti: 0, qta: 0, um: a.mp?.um ?? "", costo: 0, parti: [] };
      v.lotti += a.riga.lottiPrevisti;
      v.qta += a.acquistatoPrevisto;
      v.costo += a.costoPrevisto;
      if (parte && !v.parti.includes(parte)) v.parti.push(parte);
      g.set(a.riga.mpId, v);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([fornitore, voci]) => ({ fornitore, voci: [...voci.values()] }));
  }, [calc.acquisti, dati.fornitori, ed.parti]);

  const totale = gruppi.reduce((s, g) => s + g.voci.reduce((t, v) => t + v.costo, 0), 0);
  const testo = [
    `Lista della spesa - ${ed.nome} (${fmtData(ed.data)})`,
    ...gruppi.flatMap((g) => [
      "",
      `*${g.fornitore}*`,
      ...g.voci.map((v) => `- ${v.nome}: ${numero(v.lotti)} conf. (${numero(v.qta)} ${v.um}) ~${euro(v.costo)}`),
    ]),
    "",
    `Totale stimato: ${euro(totale)}`,
  ].join("\n");

  const condividi = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Lista spesa ${ed.nome}`, text: testo });
      } catch {
        /* closed by the user */
      }
    } else {
      await navigator.clipboard.writeText(testo);
      notifica("Lista copiata: incollala in WhatsApp o in una mail");
    }
  };

  const stampa = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style="font: 14px/1.5 system-ui, sans-serif; white-space: pre-wrap">${testo.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"))}</pre>`);
    w.document.close();
    w.print();
  };

  return (
    <Dialog open={aperta} onClose={onChiudi} fullWidth maxWidth="sm">
      <DialogTitle>Lista della spesa</DialogTitle>
      <DialogContent>
        {gruppi.length === 0 ? (
          <Typography color="text.secondary">Nessun acquisto previsto: inserisci i lotti previsti nella scheda Acquisti.</Typography>
        ) : (
          <Stack spacing={2}>
            {gruppi.map((g) => (
              <Box key={g.fornitore}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {g.fornitore}
                </Typography>
                {g.voci.map((v) => (
                  <Stack key={v.nome} direction="row" sx={{ justifyContent: "space-between", py: 0.5, gap: 2 }}>
                    <Box>
                      <Typography variant="body2">{v.nome}</Typography>
                      {v.parti.length > 0 && ed.parti.length > 1 && (
                        <Typography variant="caption" color="text.secondary">
                          {v.parti.join(", ")}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {numero(v.lotti)} conf. · {numero(v.qta)} {v.um}
                      <br />
                      <Typography component="span" variant="caption" color="text.secondary">
                        ~{euro(v.costo)}
                      </Typography>
                    </Typography>
                  </Stack>
                ))}
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))}
            <Typography sx={{ fontWeight: 600, textAlign: "right" }}>Totale stimato {euro(totale)}</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onChiudi}>Chiudi</Button>
        <Button startIcon={<PrintOutlined />} onClick={stampa} disabled={!gruppi.length}>
          Stampa
        </Button>
        <Button
          startIcon={<ContentCopyOutlined />}
          onClick={() => navigator.clipboard.writeText(testo).then(() => notifica("Lista copiata"))}
          disabled={!gruppi.length}
        >
          Copia
        </Button>
        <Button variant="contained" startIcon={<ShareOutlined />} onClick={condividi} disabled={!gruppi.length}>
          Condividi
        </Button>
      </DialogActions>
    </Dialog>
  );
}
