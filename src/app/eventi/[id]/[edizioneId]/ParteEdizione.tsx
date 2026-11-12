"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import { Griglia, Kpi } from "@/components/ui";
import type { CalcoloParte } from "@/lib/calcoli";
import { FORMULE_SERATA, capacita, ingressoVuoto, type Schermata } from "@/lib/modelli";
import { data as fmtData, euro, percento } from "@/lib/format";
import type { Parte } from "@/lib/types";
import AcquistiEdizione from "./AcquistiEdizione";
import CostiExtraEdizione from "./CostiExtraEdizione";
import IngressoParte from "./IngressoParte";
import LotteriaParte from "./LotteriaParte";
import MenuEdizione from "./MenuEdizione";
import type { PropsParte } from "./tipi";

export type IdSezione = "menu" | "acquisti" | "ingressi" | "lotteria" | "extra";

/** Sections available for a part, depending on its type. */
export function sezioniParte(p: Parte): { id: IdSezione; etichetta: string }[] {
  const cap = capacita(p);
  const out: { id: IdSezione; etichetta: string }[] = [];
  if (cap.ingresso && (p.tipo !== "generica" || p.ingresso))
    out.push({ id: "ingressi", etichetta: p.tipo === "servizio" ? "Coperti e prevendite" : p.tipo === "ingressi" ? "Iscrizioni" : "Ingressi" });
  if (cap.lotteria) out.push({ id: "lotteria", etichetta: "Lotteria" });
  if (cap.menu) out.push({ id: "menu", etichetta: cap.menu === "offerto" ? `Piatti (${p.menu.length})` : `Menu (${p.menu.length})` });
  if (cap.acquisti) out.push({ id: "acquisti", etichetta: `${p.tipo === "materiali" ? "Materiali" : "Acquisti"} (${p.acquisti.length})` });
  out.push({ id: "extra", etichetta: `Costi extra (${p.costiExtra.length})` });
  return out;
}

/** Native fieldset: when disabled, every input and button inside becomes read-only. */
export function SolaLettura({ attiva, children }: { attiva: boolean; children: ReactNode }) {
  return (
    <Box component="fieldset" disabled={attiva} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      {children}
    </Box>
  );
}

export function SezioneParte({ sezione, ...props }: PropsParte & { sezione: IdSezione }) {
  let c: ReactNode;
  switch (sezione) {
    case "menu":
      c = <MenuEdizione {...props} />;
      break;
    case "acquisti":
      c = <AcquistiEdizione {...props} />;
      break;
    case "ingressi":
      c = <IngressoParte {...props} />;
      break;
    case "lotteria":
      c = <LotteriaParte {...props} />;
      break;
    default:
      c = <CostiExtraEdizione {...props} />;
  }
  return <SolaLettura attiva={props.bloccata}>{c}</SolaLettura>;
}

function KpiParte({ calc, previsione }: { calc: CalcoloParte; previsione: boolean }) {
  const t = previsione ? calc.previsto : calc.reale;
  const costi = t.costoMenu + t.costoMateriali + t.extra;
  return (
    <Griglia min={150} gap={1.5}>
      <Kpi etichetta={`Ricavi ${previsione ? "previsti" : "reali"}`} valore={euro(t.ricavi)} />
      <Kpi etichetta="Costi" valore={euro(costi)} />
      <Kpi etichetta="Margine" valore={euro(t.margineFinale)} tono={t.margineFinale >= 0 ? "positivo" : "negativo"} nota={percento(t.marginePct)} />
      {t.paganti > 0 && <Kpi etichetta="Paganti" valore={String(t.paganti)} />}
    </Griglia>
  );
}

/** One screen of the edition: an evening with its parts, or a single part. */
export function SchermataEdizione({
  schermata,
  calcParti,
  props,
  previsione,
  unita,
}: {
  schermata: Schermata;
  calcParti: CalcoloParte[];
  props: (p: Parte) => PropsParte;
  previsione: boolean;
  unita?: { ricavi: number; costi: number; comuni: number; margine: number };
}) {
  const [parteId, setParteId] = useState(schermata.parti[0]?.id);
  const parte = schermata.parti.find((p) => p.id === parteId) ?? schermata.parti[0];
  const sezioni = parte ? sezioniParte(parte) : [];
  const [sezione, setSezione] = useState<IdSezione>(sezioni[0]?.id ?? "extra");
  const sezioneValida = sezioni.some((s) => s.id === sezione) ? sezione : (sezioni[0]?.id ?? "extra");
  const calc = calcParti.find((c) => c.parte.id === parte?.id);

  if (!parte || !calc)
    return (
      <Card sx={{ p: 3 }}>
        <Typography color="text.secondary">Questa serata non ha parti: aggiungile da Struttura nel menu in alto.</Typography>
      </Card>
    );

  const pp = props(parte);
  return (
    <Stack spacing={2}>
      {schermata.serata && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
          <Typography color="text.secondary">
            {fmtData(schermata.serata.data)} · {FORMULE_SERATA[schermata.serata.formula]}
          </Typography>
          {unita && (
            <Typography variant="body2">
              Serata intera: ricavi <b>{euro(unita.ricavi)}</b> · costi {euro(unita.costi)} · quota comuni {euro(unita.comuni)} · margine{" "}
              <Box component="b" sx={{ color: unita.margine >= 0 ? "success.main" : "error.main" }}>
                {euro(unita.margine)}
              </Box>
            </Typography>
          )}
        </Stack>
      )}
      {schermata.parti.length > 1 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          {schermata.parti.map((p) => (
            <Chip
              key={p.id}
              label={p.nome}
              color={p.id === parte.id ? "primary" : "default"}
              variant={p.id === parte.id ? "filled" : "outlined"}
              onClick={() => setParteId(p.id)}
            />
          ))}
        </Stack>
      )}
      <KpiParte calc={calc} previsione={previsione} />
      {parte.tipo === "generica" && !parte.ingresso && !pp.bloccata && (
        <Button
          size="small"
          startIcon={<AddOutlined />}
          sx={{ alignSelf: "flex-start" }}
          onClick={() => pp.aggiornaParte({ ingresso: ingressoVuoto() })}
        >
          Aggiungi biglietti o ingressi
        </Button>
      )}
      <Card>
        <Tabs value={sezioneValida} onChange={(_, v) => setSezione(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          {sezioni.map((s) => (
            <Tab key={s.id} value={s.id} label={s.etichetta} />
          ))}
        </Tabs>
      </Card>
      <SezioneParte key={parte.id} sezione={sezioneValida} {...pp} />
    </Stack>
  );
}

export { KpiParte };
