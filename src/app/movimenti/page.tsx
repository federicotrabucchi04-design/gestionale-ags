"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddOutlined from "@mui/icons-material/AddOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import SwapVertOutlined from "@mui/icons-material/SwapVertOutlined";
import { useGestionale } from "@/components/Gestionale";
import MovimentoDialog, { movimentoVuoto } from "@/components/MovimentoDialog";
import { CampoScelta, Etichetta, Griglia, Intestazione, Kpi, Vuoto } from "@/components/ui";
import { edizioniDelMovimento, importoFirmato, movimentoOrdinario, movimentoSuEdizione, nelAnno, quoteMovimento } from "@/lib/calcoli";
import { data, euro } from "@/lib/format";
import type { Movimento } from "@/lib/types";

type Ambito = "tutti" | "ordinaria" | "eventi";

export default function Movimenti() {
  const { dati, anno, salva, notifica } = useGestionale();
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [ambito, setAmbito] = useState<Ambito>("tutti");
  const [stato, setStato] = useState<"" | "ufficiale" | "previsto">("");
  const [tipo, setTipo] = useState<"" | "entrata" | "uscita">("");
  const [edizione, setEdizione] = useState("");
  const [cerca, setCerca] = useState("");
  const mobile = useMediaQuery("(max-width:900px)");

  const nomeEdizione = (id: string) => dati.edizioni.find((x) => x.id === id)?.nome;
  const etichettaEdizioni = (m: Movimento) => {
    const ids = edizioniDelMovimento(m);
    if (!ids.length) return undefined;
    if (ids.length === 1) return nomeEdizione(ids[0]);
    return quoteMovimento(m)
      .map((q) => `${nomeEdizione(q.edizioneId) ?? "?"} ${euro(q.importo)}`)
      .join(" · ");
  };
  const nomeFornitore = (id?: string) => dati.fornitori.find((f) => f.id === id)?.nome;

  const lista = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return dati.movimenti
      .filter((m) => nelAnno(m.data, anno))
      .filter((m) => (ambito === "ordinaria" ? movimentoOrdinario(m) : ambito === "eventi" ? !movimentoOrdinario(m) : true))
      .filter((m) => !stato || m.stato === stato)
      .filter((m) => !tipo || m.tipo === tipo)
      .filter((m) => !edizione || movimentoSuEdizione(m, edizione))
      .filter(
        (m) =>
          !q ||
          [m.descrizione, m.categoria, m.note, nomeFornitore(m.fornitoreId), etichettaEdizioni(m)]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(q)),
      )
      .sort((a, b) => (a.data === b.data ? 0 : a.data < b.data ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dati, anno, ambito, stato, tipo, edizione, cerca]);

  const tot = useMemo(() => {
    const t = { entrate: 0, uscite: 0, previste: 0 };
    for (const m of lista) {
      if (m.stato === "previsto") {
        if (m.tipo === "uscita") t.previste += m.importo;
        continue;
      }
      if (m.tipo === "entrata") t.entrate += m.importo;
      else t.uscite += m.importo;
    }
    return t;
  }, [lista]);

  const edizioniAnno = dati.edizioni
    .filter((e) => nelAnno(e.data, anno))
    .map((e) => ({ valore: e.id, etichetta: e.nome }));

  const segnaUfficiale = (m: Movimento) => {
    salva("movimenti", { ...m, stato: "ufficiale" });
    notifica(m.tipo === "uscita" ? "Segnato come pagato" : "Segnato come incassato");
  };

  return (
    <>
      <Intestazione
        titolo="Movimenti"
        sottotitolo={`Entrate e uscite dell'anno sociale ${anno}: gestione ordinaria ed eventi`}
        azioni={
          !mobile && (
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setMovimento(movimentoVuoto())}>
              Nuovo movimento
            </Button>
          )
        }
      />

      <Griglia min={180}>
        <Kpi etichetta="Entrate ufficiali" valore={euro(tot.entrate)} tono="positivo" />
        <Kpi etichetta="Uscite ufficiali" valore={euro(tot.uscite)} tono="negativo" />
        <Kpi etichetta="Saldo" valore={euro(tot.entrate - tot.uscite)} tono={tot.entrate - tot.uscite >= 0 ? "positivo" : "negativo"} />
        <Kpi etichetta="Spese previste" valore={euro(tot.previste)} tono={tot.previste ? "attenzione" : "neutro"} />
      </Griglia>

      <Card sx={{ mt: 3 }}>
        <Box sx={{ p: 2, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "2fr repeat(4, 1fr)" } }}>
          <TextField
            placeholder="Cerca descrizione, fornitore, categoria..."
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
            sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> } }}
          />
          <CampoScelta
            label="Ambito"
            valore={ambito}
            onCambia={setAmbito}
            opzioni={[
              { valore: "tutti", etichetta: "Tutti" },
              { valore: "ordinaria", etichetta: "Gestione ordinaria" },
              { valore: "eventi", etichetta: "Eventi" },
            ]}
          />
          <CampoScelta
            label="Stato"
            valore={stato}
            onCambia={setStato}
            vuoto="Tutti"
            opzioni={[
              { valore: "ufficiale", etichetta: "Ufficiale" },
              { valore: "previsto", etichetta: "Previsto" },
            ]}
          />
          <CampoScelta
            label="Tipo"
            valore={tipo}
            onCambia={setTipo}
            vuoto="Tutti"
            opzioni={[
              { valore: "entrata", etichetta: "Entrate" },
              { valore: "uscita", etichetta: "Uscite" },
            ]}
          />
          <CampoScelta label="Edizione" valore={edizione} onCambia={setEdizione} vuoto="Tutte" opzioni={edizioniAnno} />
        </Box>

        {lista.length === 0 ? (
          <Vuoto
            icona={<SwapVertOutlined />}
            titolo="Nessun movimento"
            testo="Aggiungi entrate e uscite: solo quelle ufficiali entrano nel totale in cassa, le previste diventano spese da pagare."
            azione={
              <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setMovimento(movimentoVuoto())}>
                Nuovo movimento
              </Button>
            }
          />
        ) : mobile ? (
          <List disablePadding>
            {lista.map((m) => (
              <ListItemButton key={m.id} onClick={() => setMovimento(m)} divider>
                <ListItemText
                  primary={m.descrizione}
                  secondary={
                    <>
                      {data(m.data)} · {etichettaEdizioni(m) ?? "Ordinaria"}
                      {m.stato === "previsto" && " · previsto"}
                    </>
                  }
                />
                <Typography sx={{ fontWeight: 500, color: m.tipo === "entrata" ? "success.main" : "error.main", opacity: m.stato === "previsto" ? 0.6 : 1 }}>
                  {euro(importoFirmato(m))}
                </Typography>
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Box className="tabella-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Descrizione</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Evento</TableCell>
                  <TableCell>Fornitore</TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell className="num">Importo</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {lista.map((m) => (
                  <TableRow key={m.id} hover onClick={() => setMovimento(m)} sx={{ cursor: "pointer" }}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{data(m.data)}</TableCell>
                    <TableCell>
                      {m.descrizione}
                      {m.note && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {m.note}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{m.categoria}</TableCell>
                    <TableCell>
                      {etichettaEdizioni(m) ?? (
                        <Typography variant="body2" color="text.secondary">
                          Ordinaria
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{nomeFornitore(m.fornitoreId) ?? ""}</TableCell>
                    <TableCell>
                      {m.stato === "ufficiale" ? <Etichetta tono="positivo">Ufficiale</Etichetta> : <Etichetta tono="attenzione">Previsto</Etichetta>}
                    </TableCell>
                    <TableCell className="num" sx={{ fontWeight: 500, color: m.tipo === "entrata" ? "success.main" : "error.main" }}>
                      {euro(importoFirmato(m))}
                    </TableCell>
                    <TableCell sx={{ width: 48 }}>
                      {m.stato === "previsto" && (
                        <Tooltip title={m.tipo === "uscita" ? "Segna come pagato" : "Segna come incassato"}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              segnaUfficiale(m);
                            }}
                          >
                            <CheckCircleOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
      <Stack sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {lista.length} movimenti. Tocca un movimento per modificarlo.
        </Typography>
      </Stack>

      {mobile && (
        <Fab color="primary" variant="extended" onClick={() => setMovimento(movimentoVuoto())} sx={{ position: "fixed", right: 16, bottom: 88 }}>
          <AddOutlined sx={{ mr: 1 }} />
          Nuovo
        </Fab>
      )}
      <MovimentoDialog movimento={movimento} onChiudi={() => setMovimento(null)} />
    </>
  );
}
