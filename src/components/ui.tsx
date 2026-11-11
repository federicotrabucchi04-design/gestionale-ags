"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { numeroDa } from "@/lib/format";

export function Intestazione({
  titolo,
  sottotitolo,
  azioni,
}: {
  titolo: ReactNode;
  sottotitolo?: ReactNode;
  azioni?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ mb: 3, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 26, sm: 32 } }}>
          {titolo}
        </Typography>
        {sottotitolo && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {sottotitolo}
          </Typography>
        )}
      </Box>
      {azioni && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, "& > *": { m: "0 !important" } }}>
          {azioni}
        </Stack>
      )}
    </Stack>
  );
}

export type Tono = "neutro" | "positivo" | "negativo" | "attenzione" | "primario";

const TONI: Record<Tono, { bg: string; fg: string }> = {
  neutro: { bg: "#f1f3f4", fg: "#3c4043" },
  positivo: { bg: "#e6f4ea", fg: "#137333" },
  negativo: { bg: "#fce8e6", fg: "#c5221f" },
  attenzione: { bg: "#fef7e0", fg: "#b06000" },
  primario: { bg: "#e8f0fe", fg: "#1967d2" },
};

export function tonoValore(v: number | undefined): Tono {
  if (v === undefined || v === 0) return "neutro";
  return v > 0 ? "positivo" : "negativo";
}

export function Kpi({
  etichetta,
  valore,
  nota,
  icona,
  tono = "neutro",
  grande,
}: {
  etichetta: string;
  valore: ReactNode;
  nota?: ReactNode;
  icona?: ReactNode;
  tono?: Tono;
  grande?: boolean;
}) {
  const c = TONI[tono];
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
          {icona && (
            <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: c.bg, color: c.fg, display: "grid", placeItems: "center" }}>
              {icona}
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {etichetta}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: grande ? { xs: 28, sm: 34 } : { xs: 22, sm: 26 }, fontWeight: 500, color: tono === "neutro" ? "text.primary" : c.fg }}>
          {valore}
        </Typography>
        {nota && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            {nota}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function Etichetta({ tono = "neutro", children }: { tono?: Tono; children: ReactNode }) {
  const c = TONI[tono];
  return <Chip size="small" label={children} sx={{ bgcolor: c.bg, color: c.fg }} />;
}

export function Griglia({ min = 220, children, gap = 2 }: { min?: number; children: ReactNode; gap?: number }) {
  return (
    <Box sx={{ display: "grid", gap, gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))` }}>
      {children}
    </Box>
  );
}

export function Sezione({
  titolo,
  azioni,
  children,
  sottotitolo,
  senzaPadding,
}: {
  titolo?: ReactNode;
  azioni?: ReactNode;
  children: ReactNode;
  sottotitolo?: ReactNode;
  senzaPadding?: boolean;
}) {
  return (
    <Card sx={{ mb: 3 }}>
      {(titolo || azioni) && (
        <Stack
          direction="row"
          sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: senzaPadding ? 1.5 : 0, alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}
        >
          <Box>
            {titolo && <Typography variant="h6" sx={{ fontSize: 18 }}>{titolo}</Typography>}
            {sottotitolo && (
              <Typography variant="body2" color="text.secondary">
                {sottotitolo}
              </Typography>
            )}
          </Box>
          {azioni && <Stack direction="row" spacing={1}>{azioni}</Stack>}
        </Stack>
      )}
      {senzaPadding ? children : <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>{children}</CardContent>}
    </Card>
  );
}

export function Vuoto({ titolo, testo, azione, icona }: { titolo: string; testo?: string; azione?: ReactNode; icona?: ReactNode }) {
  return (
    <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
      {icona && <Box sx={{ color: "text.secondary", mb: 1, "& svg": { fontSize: 48 } }}>{icona}</Box>}
      <Typography variant="h6" sx={{ fontSize: 18 }}>
        {titolo}
      </Typography>
      {testo && (
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 440, mx: "auto" }}>
          {testo}
        </Typography>
      )}
      {azione && <Box sx={{ mt: 3 }}>{azione}</Box>}
    </Box>
  );
}

export function Aiuto({ testo }: { testo: string }) {
  return (
    <Tooltip title={testo} enterTouchDelay={0}>
      <InfoOutlined sx={{ fontSize: 16, color: "text.secondary", verticalAlign: "middle", ml: 0.5, cursor: "help" }} />
    </Tooltip>
  );
}

/** Numeric input that keeps the typed text (commas, empty) and reports a number. */
export function CampoNumero({
  valore,
  onCambia,
  euro,
  suffisso,
  ...props
}: Omit<TextFieldProps, "value" | "onChange"> & {
  valore: number | undefined;
  onCambia: (v: number) => void;
  euro?: boolean;
  suffisso?: string;
}) {
  const comeTesto = (v: number | null | undefined) => (v === undefined || v === null ? "" : String(v).replace(".", ","));
  const [testo, setTesto] = useState(comeTesto(valore));
  const [ultimo, setUltimo] = useState(valore);
  if (valore !== ultimo) {
    setUltimo(valore);
    if (numeroDa(testo) !== valore) setTesto(comeTesto(valore));
  }
  return (
    <TextField
      {...props}
      value={testo}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,-]/g, "");
        setTesto(t);
        onCambia(numeroDa(t));
      }}
      onFocus={(e) => e.target.select()}
      slotProps={{
        ...props.slotProps,
        htmlInput: { inputMode: "decimal", ...(props.slotProps?.htmlInput as object) },
        input: {
          ...(euro ? { startAdornment: <InputAdornment position="start">€</InputAdornment> } : {}),
          ...(suffisso ? { endAdornment: <InputAdornment position="end">{suffisso}</InputAdornment> } : {}),
          ...(props.slotProps?.input as object),
        },
      }}
    />
  );
}

export function CampoScelta<T extends string>({
  valore,
  onCambia,
  opzioni,
  vuoto,
  ...props
}: Omit<TextFieldProps, "value" | "onChange" | "select"> & {
  valore: T | "" | undefined;
  onCambia: (v: T) => void;
  opzioni: { valore: T; etichetta: ReactNode }[];
  vuoto?: string;
}) {
  return (
    <TextField {...props} select value={valore ?? ""} onChange={(e) => onCambia(e.target.value as T)}>
      {vuoto !== undefined && (
        <MenuItem value="">
          <em>{vuoto}</em>
        </MenuItem>
      )}
      {opzioni.map((o) => (
        <MenuItem key={o.valore} value={o.valore}>
          {o.etichetta}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function RigaValore({ etichetta, valore, forte, tono }: { etichetta: ReactNode; valore: ReactNode; forte?: boolean; tono?: Tono }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", py: 0.75, gap: 2 }}>
      <Typography variant="body2" color={forte ? "text.primary" : "text.secondary"} sx={{ fontWeight: forte ? 600 : 400 }}>
        {etichetta}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: forte ? 600 : 500, color: tono ? TONI[tono].fg : undefined, whiteSpace: "nowrap" }}>
        {valore}
      </Typography>
    </Stack>
  );
}
