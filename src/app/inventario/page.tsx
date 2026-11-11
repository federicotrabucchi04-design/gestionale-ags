"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { LineChart } from "@mui/x-charts/LineChart";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { useGestionale } from "@/components/Gestionale";
import { CampoNumero, Etichetta, Griglia, Intestazione, Kpi, Vuoto } from "@/components/ui";
import { costoUnitario, nuovoId, oggiISO, prezzoMPAl, storicoInventario, ultimoConteggio } from "@/lib/calcoli";
import { data as fmtData, euro, numero } from "@/lib/format";
import type { MateriaPrima, TipoInventario, VoceInventario } from "@/lib/types";

export default function Inventario() {
  const { dati } = useGestionale();
  const [cerca, setCerca] = useState("");
  const [soloGiacenza, setSoloGiacenza] = useState(false);
  const [dettaglio, setDettaglio] = useState<MateriaPrima | null>(null);
  const [conteggio, setConteggio] = useState(false);
  const oggi = oggiISO();

  const righe = useMemo(() => {
    const q = cerca.toLowerCase().trim();
    return dati.materiePrime
      .filter((m) => !q || `${m.codice} ${m.nome}`.toLowerCase().includes(q))
      .map((m) => {
        const storia = storicoInventario(m.id, dati, oggi);
        const saldo = storia.length ? storia[storia.length - 1].saldo : 0;
        const costoUM = costoUnitario(prezzoMPAl(dati.prezziMP, m.id, oggi));
        return { m, saldo, valore: costoUM !== undefined ? saldo * costoUM : undefined, ultimo: ultimoConteggio(dati.inventario, m.id), movimenti: storia.length };
      })
      .filter((r) => !soloGiacenza || r.saldo !== 0)
      .sort((a, b) => a.m.nome.localeCompare(b.m.nome));
  }, [dati, cerca, soloGiacenza, oggi]);

  const valoreTotale = righe.reduce((s, r) => s + (r.valore ?? 0), 0);
  const inGiacenza = righe.filter((r) => r.saldo > 0).length;
  const ultimoConteggioGlobale = [...dati.inventario].filter((v) => v.tipo === "conteggio").sort((a, b) => (a.data < b.data ? 1 : -1))[0];

  return (
    <>
      <Intestazione
        titolo="Inventario"
        sottotitolo="Si aggiorna da solo con acquisti e avanzi delle edizioni. Un conteggio sovrascrive il saldo e resta nello storico."
        azioni={
          <Button variant="contained" startIcon={<FactCheckOutlined />} onClick={() => setConteggio(true)}>
            Fai un conteggio
          </Button>
        }
      />
      <Griglia min={200}>
        <Kpi etichetta="Valore del magazzino" valore={euro(valoreTotale)} tono="primario" nota="Saldo × costo unitario di oggi" />
        <Kpi etichetta="Materie prime in giacenza" valore={numero(inGiacenza)} />
        <Kpi etichetta="Ultimo conteggio" valore={ultimoConteggioGlobale ? fmtData(ultimoConteggioGlobale.data) : "Mai"} />
      </Griglia>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 3, mb: 2, alignItems: { sm: "center" } }}>
        <TextField
          placeholder="Cerca"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          sx={{ maxWidth: { sm: 320 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> } }}
        />
        <FormControlLabel control={<Switch checked={soloGiacenza} onChange={(e) => setSoloGiacenza(e.target.checked)} />} label="Solo con giacenza" />
      </Stack>

      <Card>
        {righe.length === 0 ? (
          <Vuoto icona={<Inventory2Outlined />} titolo="Nessuna materia prima" testo="Le materie prime si creano nel Prezziario." />
        ) : (
          <Box className="tabella-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Materia prima</TableCell>
                  <TableCell className="num">Saldo</TableCell>
                  <TableCell className="num">Valore</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Ultimo conteggio</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }} className="num">
                    Movimenti
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {righe.map((r) => (
                  <TableRow key={r.m.id} hover sx={{ cursor: "pointer" }} onClick={() => setDettaglio(r.m)}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {r.m.nome}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.m.codice}
                      </Typography>
                    </TableCell>
                    <TableCell className="num" sx={{ fontWeight: 500, color: r.saldo < 0 ? "error.main" : undefined }}>
                      {numero(r.saldo)} {r.m.um}
                    </TableCell>
                    <TableCell className="num">{euro(r.valore)}</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{r.ultimo ? fmtData(r.ultimo.data) : "-"}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }} className="num">
                      {r.movimenti}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <DettaglioDialog mp={dettaglio} onChiudi={() => setDettaglio(null)} />
      <ConteggioDialog aperto={conteggio} onChiudi={() => setConteggio(false)} />
    </>
  );
}

function DettaglioDialog({ mp, onChiudi }: { mp: MateriaPrima | null; onChiudi: () => void }) {
  const { dati, salva, elimina, notifica, conferma } = useGestionale();
  const mobile = useMediaQuery("(max-width:700px)");
  const [tipo, setTipo] = useState<TipoInventario>("conteggio");
  const [dataV, setDataV] = useState(oggiISO());
  const [qta, setQta] = useState(0);
  const [note, setNote] = useState("");
  if (!mp) return null;

  const storia = storicoInventario(mp.id, dati);
  const saldo = storia.length ? storia[storia.length - 1].saldo : 0;

  const registra = () => {
    const v: VoceInventario = { id: nuovoId(), mpId: mp.id, data: dataV, tipo, quantita: qta, note: note.trim() || undefined };
    salva("inventario", v);
    notifica(tipo === "conteggio" ? "Conteggio salvato: saldo aggiornato" : "Movimento di magazzino salvato");
    setQta(0);
    setNote("");
  };

  return (
    <Dialog open onClose={onChiudi} fullWidth maxWidth="md" fullScreen={mobile}>
      <DialogTitle>
        {mp.nome}
        <Typography color="text.secondary">
          Saldo attuale: <b>{numero(saldo)} {mp.um}</b>
        </Typography>
      </DialogTitle>
      <DialogContent>
        {storia.length > 1 && (
          <LineChart
            height={220}
            xAxis={[{ scaleType: "point", data: storia.map((p) => fmtData(p.data)) }]}
            series={[{ data: storia.map((p) => p.saldo), label: `Saldo (${mp.um})`, color: "#1a73e8", curve: "stepAfter", area: true }]}
            hideLegend
            sx={{ "& .MuiLineChart-area": { fillOpacity: 0.1 } }}
          />
        )}

        <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#f8f9fb", my: 2 }}>
          <ToggleButtonGroup size="small" exclusive value={tipo} onChange={(_, v) => v && setTipo(v)} sx={{ mb: 2, flexWrap: "wrap" }}>
            <ToggleButton value="conteggio">Conteggio (sovrascrivi)</ToggleButton>
            <ToggleButton value="carico">Carico</ToggleButton>
            <ToggleButton value="scarico">Scarico</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 2fr auto" }, alignItems: "center" }}>
            <TextField label="Data" type="date" value={dataV} onChange={(e) => setDataV(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <CampoNumero label={tipo === "conteggio" ? "Quantità contata" : "Quantità"} suffisso={mp.um} valore={qta} onCambia={setQta} />
            <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }} />
            <Button variant="contained" onClick={registra} disabled={!dataV || (tipo !== "conteggio" && !(qta > 0))}>
              Registra
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
            {tipo === "conteggio"
              ? "Il saldo diventa la quantità contata da quella data; la differenza con il calcolato resta nello storico."
              : tipo === "carico"
                ? "Acquisto fuori dagli eventi o merce ricevuta."
                : "Merce buttata, scaduta o usata fuori dagli eventi."}
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Storico
        </Typography>
        {storia.length === 0 ? (
          <Typography color="text.secondary">Nessun movimento di magazzino.</Typography>
        ) : (
          <Box className="tabella-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Descrizione</TableCell>
                  <TableCell className="num">Variazione</TableCell>
                  <TableCell className="num">Saldo</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {[...storia].reverse().map((p, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtData(p.data)}</TableCell>
                    <TableCell>
                      {p.descrizione}
                      {p.conteggio && (
                        <Box sx={{ mt: 0.5 }}>
                          <Etichetta tono={Math.abs(p.conteggio.differenza) < 1e-9 ? "positivo" : "attenzione"}>
                            Calcolato {numero(p.conteggio.calcolato)} · differenza {p.conteggio.differenza > 0 ? "+" : ""}
                            {numero(p.conteggio.differenza)}
                          </Etichetta>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell className="num" sx={{ color: p.variazione > 0 ? "success.main" : p.variazione < 0 ? "error.main" : undefined }}>
                      {p.variazione > 0 ? "+" : ""}
                      {numero(p.variazione)}
                    </TableCell>
                    <TableCell className="num" sx={{ fontWeight: 500 }}>
                      {numero(p.saldo)}
                    </TableCell>
                    <TableCell>
                      {p.voceId && (
                        <IconButton
                          size="small"
                          onClick={async () => {
                            if (await conferma("Eliminare questa registrazione?", "Il saldo verrà ricalcolato.", "Elimina")) {
                              elimina("inventario", p.voceId!);
                              notifica("Registrazione eliminata");
                            }
                          }}
                        >
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onChiudi}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}

function ConteggioDialog({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const { dati, salva, notifica } = useGestionale();
  const mobile = useMediaQuery("(max-width:700px)");
  const [dataC, setDataC] = useState(oggiISO());
  const [valori, setValori] = useState<Record<string, number | undefined>>({});
  const materie = [...dati.materiePrime].filter((m) => m.attiva).sort((a, b) => a.nome.localeCompare(b.nome));
  const compilati = Object.entries(valori).filter(([, v]) => v !== undefined);

  return (
    <Dialog open={aperto} onClose={onChiudi} fullWidth maxWidth="sm" fullScreen={mobile}>
      <DialogTitle>Conteggio inventario</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Scrivi solo le quantità che hai contato: quelle lasciate vuote non cambiano.
        </Typography>
        <TextField label="Data del conteggio" type="date" value={dataC} onChange={(e) => setDataC(e.target.value)} sx={{ mb: 2, maxWidth: 220 }} slotProps={{ inputLabel: { shrink: true } }} />
        <Stack spacing={1.25}>
          {materie.map((m) => {
            const storia = storicoInventario(m.id, dati, dataC);
            const calcolato = storia.length ? storia[storia.length - 1].saldo : 0;
            return (
              <Stack key={m.id} direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                    {m.nome}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    calcolato {numero(calcolato)} {m.um}
                  </Typography>
                </Box>
                <TextField
                  sx={{ width: 140 }}
                  placeholder="-"
                  value={valori[m.id] === undefined ? "" : String(valori[m.id]).replace(".", ",")}
                  onChange={(e) => {
                    const t = e.target.value.replace(",", ".").replace(/[^\d.-]/g, "");
                    setValori({ ...valori, [m.id]: t === "" ? undefined : Number(t) });
                  }}
                  slotProps={{ htmlInput: { inputMode: "decimal" }, input: { endAdornment: <InputAdornment position="end">{m.um}</InputAdornment> } }}
                />
              </Stack>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onChiudi}>Annulla</Button>
        <Button
          variant="contained"
          disabled={compilati.length === 0 || !dataC}
          onClick={() => {
            compilati.forEach(([mpId, q]) => salva("inventario", { id: nuovoId(), mpId, data: dataC, tipo: "conteggio", quantita: q ?? 0, note: "Conteggio inventario" }));
            notifica(`Salvati ${compilati.length} conteggi`);
            setValori({});
            onChiudi();
          }}
        >
          Salva {compilati.length || ""} conteggi
        </Button>
      </DialogActions>
    </Dialog>
  );
}
