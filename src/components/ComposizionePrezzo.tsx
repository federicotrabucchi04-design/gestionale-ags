"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { METODI_RIPARTO, type CostoArticolo } from "@/lib/calcoli";
import type { MetodoRiparto } from "@/lib/types";
import { euro, euroFine, numero, percento } from "@/lib/format";
import { RigaValore } from "./ui";
import { useGestionale } from "./Gestionale";

const COLORI = { materie: "#1a73e8", fissi: "#f29900", extra: "#a142f4", margine: "#34a853", perdita: "#ea4335" };

/** Breakdown of an article's price: raw materials, fixed-cost share, optional event extra, margin. */
export default function ComposizionePrezzo({
  costo,
  prezzo,
  quotaExtra,
  compatto,
}: {
  costo: CostoArticolo;
  prezzo?: number;
  quotaExtra?: number;
  compatto?: boolean;
}) {
  const { dati } = useGestionale();
  const extra = quotaExtra ?? 0;
  const costoPieno = costo.costoVivo + extra;
  const margine = prezzo !== undefined ? prezzo - costoPieno : undefined;
  const totale = Math.max(prezzo ?? 0, costoPieno) || 1;
  const parti = [
    { k: "Materie prime", v: costo.materie, c: COLORI.materie },
    { k: "Costi fissi", v: costo.quotaFissi, c: COLORI.fissi },
    { k: "Costi extra evento", v: extra, c: COLORI.extra },
    { k: margine !== undefined && margine < 0 ? "Perdita" : "Margine", v: Math.abs(margine ?? 0), c: margine !== undefined && margine < 0 ? COLORI.perdita : COLORI.margine },
  ].filter((p) => p.v > 0);

  return (
    <Box>
      {costo.avvisi.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {costo.avvisi.join(" · ")}
        </Alert>
      )}
      <Box sx={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", bgcolor: "#eef0f3", mb: 1 }}>
        {parti.map((p) => (
          <Tooltip key={p.k} title={`${p.k}: ${euroFine(p.v)}`}>
            <Box sx={{ width: `${(p.v / totale) * 100}%`, bgcolor: p.c }} />
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", mb: 2 }}>
        {parti.map((p) => (
          <Stack key={p.k} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: p.c }} />
            <Typography variant="caption" color="text.secondary">
              {p.k}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {!compatto &&
        costo.righe.map((r, i) => (
          <RigaValore
            key={i}
            etichetta={
              <>
                {r.mp?.nome ?? "?"}{" "}
                <Typography component="span" variant="caption" color="text.secondary">
                  {numero(r.qta)} {r.mp?.um} × {euroFine(r.costoUM)}
                  {r.fornitoreId && ` · ${dati.fornitori.find((f) => f.id === r.fornitoreId)?.nome ?? ""}`}
                </Typography>
              </>
            }
            valore={euroFine(r.costo)}
          />
        ))}
      <RigaValore etichetta="Totale materie prime" valore={euroFine(costo.materie)} forte={!compatto} />
      {costo.quoteFisse.map((q) => (
        <RigaValore
          key={q.costoFissoId}
          etichetta={
            <>
              Quota {q.nome}{" "}
              <Typography component="span" variant="caption" color="text.secondary">
                {METODI_RIPARTO[q.metodo].etichetta.toLowerCase()}
              </Typography>
            </>
          }
          valore={euroFine(q.quota)}
        />
      ))}
      {!compatto && costo.quoteFisse.length > 0 && (
        <Box sx={{ my: 1, p: 1.5, bgcolor: "#f8f9fb", borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
            Con gli altri metodi di riparto dei costi fissi il costo vivo sarebbe:
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
            {(Object.keys(METODI_RIPARTO) as MetodoRiparto[]).map((k) => {
              const cv = costo.materie + costo.quoteFisse.reduce((s, q) => s + q.alternative[k], 0);
              const attivo = costo.quoteFisse.every((q) => q.metodo === k);
              return (
                <Typography key={k} variant="body2" sx={{ fontWeight: attivo ? 700 : 400 }}>
                  {METODI_RIPARTO[k].etichetta}: {euroFine(cv)}
                  {prezzo ? ` (margine ${percento((prezzo - cv - extra) / prezzo)})` : ""}
                </Typography>
              );
            })}
          </Stack>
        </Box>
      )}
      <Divider sx={{ my: 0.5 }} />
      <RigaValore etichetta="Costo vivo" valore={euroFine(costo.costoVivo)} forte />
      {extra > 0 && (
        <>
          <RigaValore etichetta="Quota costi extra evento" valore={euroFine(extra)} />
          <RigaValore etichetta="Costo pieno" valore={euroFine(costoPieno)} forte />
        </>
      )}
      <RigaValore etichetta="Prezzo di vendita" valore={euro(prezzo)} forte />
      <RigaValore
        etichetta="Margine per pezzo"
        valore={margine !== undefined ? `${euroFine(margine)} · ${percento(prezzo ? margine / prezzo : undefined)}` : "-"}
        forte
        tono={margine === undefined ? undefined : margine >= 0 ? "positivo" : "negativo"}
      />
    </Box>
  );
}
