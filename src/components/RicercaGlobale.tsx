"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import InputAdornment from "@mui/material/InputAdornment";
import { useGestionale } from "./Gestionale";
import { TIPI_EVENTO } from "@/lib/modelli";

interface Voce {
  id: string;
  gruppo: string;
  etichetta: string;
  sotto?: string;
  href: string;
}

export default function RicercaGlobale() {
  const { dati } = useGestionale();
  const router = useRouter();
  const [aperto, setAperto] = useState(false);

  const opzioni = useMemo<Voce[]>(() => {
    const out: Voce[] = [];
    for (const e of dati.eventi) {
      out.push({ id: `ev-${e.id}`, gruppo: "Eventi", etichetta: e.nome, sotto: TIPI_EVENTO[e.tipo]?.etichetta, href: `/eventi/${e.id}` });
    }
    for (const ed of dati.edizioni) {
      const ev = dati.eventi.find((e) => e.id === ed.eventoId);
      out.push({ id: `ed-${ed.id}`, gruppo: "Edizioni", etichetta: ed.nome, sotto: ev?.nome, href: `/eventi/${ed.eventoId}/${ed.id}` });
    }
    for (const a of dati.articoli) {
      out.push({ id: `art-${a.id}`, gruppo: "Articoli", etichetta: a.nome, sotto: a.categoria, href: `/prezziario?tab=articoli&q=${encodeURIComponent(a.nome)}` });
    }
    for (const m of dati.materiePrime) {
      out.push({ id: `mp-${m.id}`, gruppo: "Materie prime", etichetta: m.nome, sotto: m.codice, href: `/inventario?q=${encodeURIComponent(m.nome)}` });
    }
    for (const f of dati.fornitori) {
      out.push({ id: `fo-${f.id}`, gruppo: "Fornitori", etichetta: f.nome, sotto: f.contatto, href: `/prezziario?tab=fornitori` });
    }
    for (const m of dati.movimenti.slice().sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 200)) {
      out.push({
        id: `mo-${m.id}`,
        gruppo: "Movimenti",
        etichetta: m.descrizione,
        sotto: `${m.data} · ${m.categoria}`,
        href: `/movimenti?q=${encodeURIComponent(m.descrizione)}`,
      });
    }
    return out;
  }, [dati]);

  return (
    <Autocomplete
      sx={{ width: { xs: 140, sm: 260 }, display: { xs: aperto ? "flex" : "none", sm: "flex" } }}
      options={opzioni}
      groupBy={(o) => o.gruppo}
      getOptionLabel={(o) => o.etichetta}
      filterOptions={(opts, { inputValue }) => {
        const q = inputValue.toLowerCase().trim();
        if (!q) return opts.slice(0, 20);
        return opts.filter((o) => `${o.etichetta} ${o.sotto ?? ""} ${o.gruppo}`.toLowerCase().includes(q)).slice(0, 30);
      }}
      onChange={(_, v) => {
        if (v) router.push(v.href);
        setAperto(false);
      }}
      onOpen={() => setAperto(true)}
      onClose={() => setAperto(false)}
      renderOption={(props, o) => {
        const { key, ...rest } = props as { key: string } & object;
        return (
          <Box component="li" key={key} {...rest}>
            <Box>
              <Typography variant="body2">{o.etichetta}</Typography>
              {o.sotto && (
                <Typography variant="caption" color="text.secondary">
                  {o.sotto}
                </Typography>
              )}
            </Box>
          </Box>
        );
      }}
      renderInput={(p) => (
        <TextField
          {...p}
          size="small"
          placeholder="Cerca..."
          slotProps={{
            ...p.slotProps,
            input: {
              ...(p.slotProps?.input as object),
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      blurOnSelect
      clearOnBlur
      noOptionsText="Nessun risultato"
    />
  );
}
