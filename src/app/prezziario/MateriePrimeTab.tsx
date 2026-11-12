"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
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
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import EggOutlined from "@mui/icons-material/EggOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { useGestionale } from "@/components/Gestionale";
import { CampoNumero, CampoScelta, Etichetta, Vuoto } from "@/components/ui";
import { costoUnitario, nuovoId, oggiISO, prezzoMPAl, prossimoCodice } from "@/lib/calcoli";
import { righeAcquisto } from "@/lib/modelli";
import { data as fmtData, euro, euroFine, numero } from "@/lib/format";
import type { MateriaPrima, PrezzoMP } from "@/lib/types";

export default function MateriePrimeTab() {
  const { dati } = useGestionale();
  const [aperta, setAperta] = useState<MateriaPrima | null>(null);
  const [cerca, setCerca] = useState("");
  const oggi = oggiISO();

  const righe = useMemo(() => {
    const q = cerca.toLowerCase().trim();
    return [...dati.materiePrime]
      .filter((m) => !q || `${m.codice} ${m.nome}`.toLowerCase().includes(q))
      .sort((a, b) => a.codice.localeCompare(b.codice))
      .map((m) => {
        const prezzo = prezzoMPAl(dati.prezziMP, m.id, oggi);
        return {
          m,
          prezzo,
          costoUM: costoUnitario(prezzo),
          fornitore: dati.fornitori.find((f) => f.id === prezzo?.fornitoreId)?.nome,
          storico: dati.prezziMP.filter((p) => p.mpId === m.id).length,
          ricette: dati.articoli.filter((a) => a.ricetta.some((r) => r.mpId === m.id)).length,
        };
      });
  }, [dati, cerca, oggi]);

  const nuova = (): MateriaPrima => ({
    id: nuovoId(),
    codice: prossimoCodice("MP-", dati.materiePrime.map((m) => m.codice)),
    nome: "",
    um: "pz",
    attiva: true,
    genere: "consumo",
  });

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
        <TextField
          placeholder="Cerca materia prima"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          sx={{ maxWidth: { sm: 320 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> } }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Prezzi in vigore oggi. Un nuovo prezzo con data non cambia i costi delle edizioni passate.
        </Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAperta(nuova())}>
          Nuova materia prima
        </Button>
      </Stack>

      <Card>
        {righe.length === 0 ? (
          <Vuoto
            icona={<EggOutlined />}
            titolo="Nessuna materia prima"
            testo="Inserisci ingredienti e materiali (birra, pane, bicchieri...) con il costo del lotto e il fornitore."
            azione={<Button variant="contained" onClick={() => setAperta(nuova())}>Nuova materia prima</Button>}
          />
        ) : (
          <Box className="tabella-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Codice</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Lotto</TableCell>
                  <TableCell className="num">Costo / unità</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Fornitore</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Dal</TableCell>
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Uso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {righe.map(({ m, prezzo, costoUM, fornitore, storico, ricette }) => (
                  <TableRow key={m.id} hover sx={{ cursor: "pointer", opacity: m.attiva ? 1 : 0.55 }} onClick={() => setAperta(m)}>
                    <TableCell sx={{ color: "text.secondary" }}>{m.codice}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {m.nome}
                      {m.genere === "materiale" && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {" "}
                          · materiale
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {prezzo ? `${euro(prezzo.costoLotto)} / ${numero(prezzo.qtaLotto)} ${m.um}` : <Etichetta tono="attenzione">Senza prezzo</Etichetta>}
                    </TableCell>
                    <TableCell className="num">{costoUM !== undefined ? `${euroFine(costoUM)} / ${m.um}` : "-"}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{fornitore ?? ""}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" }, whiteSpace: "nowrap" }}>
                      {prezzo ? fmtData(prezzo.validoDal) : ""}
                      {storico > 1 && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {storico} prezzi in storico
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                      <Typography variant="body2" color="text.secondary">
                        {ricette ? `${ricette} ${ricette === 1 ? "ricetta" : "ricette"}` : "non usata"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <MateriaDialog materia={aperta} onChiudi={() => setAperta(null)} />
    </>
  );
}

function MateriaDialog({ materia, onChiudi }: { materia: MateriaPrima | null; onChiudi: () => void }) {
  const { dati, salva, elimina, notifica, conferma } = useGestionale();
  const [m, setM] = useState<MateriaPrima | null>(materia);
  const [prezzi, setPrezzi] = useState<PrezzoMP[]>([]);
  const [rimossi, setRimossi] = useState<string[]>([]);
  const mobile = useMediaQuery("(max-width:700px)");

  const [origine, setOrigine] = useState<MateriaPrima | null>(null);
  if (materia !== origine) {
    setOrigine(materia);
    setM(materia);
    setRimossi([]);
    if (materia) {
      const esist = dati.prezziMP.filter((p) => p.mpId === materia.id).sort((a, b) => (a.validoDal < b.validoDal ? 1 : -1));
      setPrezzi(
        esist.length
          ? esist
          : [{ id: nuovoId(), mpId: materia.id, validoDal: oggiISO(), costoLotto: 0, qtaLotto: 1 }],
      );
    }
  }

  if (!m) return null;
  const esistente = dati.materiePrime.some((x) => x.id === m.id);
  const usata =
    dati.articoli.filter((a) => a.ricetta.some((r) => r.mpId === m.id)).length +
    dati.edizioni.filter((e) => righeAcquisto(e).some((r) => r.mpId === m.id)).length;
  const fornitori = [...dati.fornitori].sort((a, b) => a.nome.localeCompare(b.nome)).map((f) => ({ valore: f.id, etichetta: f.nome }));
  const setP = (id: string, patch: Partial<PrezzoMP>) => setPrezzi(prezzi.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const date = prezzi.map((p) => p.validoDal);
  const doppie = date.some((d, i) => date.indexOf(d) !== i);

  return (
    <Dialog open onClose={onChiudi} fullWidth maxWidth="md" fullScreen={mobile}>
      <DialogTitle>{esistente ? m.nome || "Materia prima" : "Nuova materia prima"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 2, pt: 1, gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 2fr 1fr" } }}>
          <TextField label="Codice" value={m.codice} onChange={(e) => setM({ ...m, codice: e.target.value })} />
          <TextField label="Nome" value={m.nome} onChange={(e) => setM({ ...m, nome: e.target.value })} autoFocus={!esistente} />
          <TextField
            label="Unità di misura"
            value={m.um}
            onChange={(e) => setM({ ...m, um: e.target.value })}
            helperText="kg, l, pz..."
          />
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2, alignItems: { sm: "center" } }}>
          <CampoScelta
            label="Genere"
            valore={m.genere ?? "consumo"}
            onCambia={(genere) => setM({ ...m, genere })}
            opzioni={[
              { valore: "consumo", etichetta: "Cibo e bevande (magazzino)" },
              { valore: "materiale", etichetta: "Materiale (scorte informali: legno, viti, addobbi)" },
            ]}
            sx={{ minWidth: 280 }}
          />
          <FormControlLabel
            control={<Switch checked={m.attiva} onChange={(e) => setM({ ...m, attiva: e.target.checked })} />}
            label="In uso"
          />
        </Stack>
        <TextField sx={{ mt: 1 }} label="Note" value={m.note ?? ""} onChange={(e) => setM({ ...m, note: e.target.value })} />

        <Divider sx={{ my: 2.5 }} />
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Prezzi e fornitori
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ogni prezzo vale dalla sua data. Per un cambio di prezzo o fornitore aggiungi una riga: lo storico resta.
            </Typography>
          </Box>
          <Button
            startIcon={<AddOutlined />}
            onClick={() =>
              setPrezzi([
                { id: nuovoId(), mpId: m.id, validoDal: oggiISO(), costoLotto: prezzi[0]?.costoLotto ?? 0, qtaLotto: prezzi[0]?.qtaLotto ?? 1, fornitoreId: prezzi[0]?.fornitoreId },
                ...prezzi,
              ])
            }
          >
            Nuovo prezzo
          </Button>
        </Stack>
        <Stack spacing={2} divider={<Divider flexItem />}>
          {prezzi.map((p, i) => (
            <Box key={p.id} sx={{ display: "grid", gap: 1.5, alignItems: "center", gridTemplateColumns: { xs: "1fr 1fr", sm: "1.2fr 1.4fr 1fr 1fr 1fr auto" } }}>
              <TextField
                label="Valido dal"
                type="date"
                value={p.validoDal}
                onChange={(e) => setP(p.id, { validoDal: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <CampoScelta label="Fornitore" valore={p.fornitoreId ?? ""} onCambia={(v) => setP(p.id, { fornitoreId: v || undefined })} vuoto="Nessuno" opzioni={fornitori} />
              <CampoNumero label="Costo lotto" euro valore={p.costoLotto} onCambia={(v) => setP(p.id, { costoLotto: v })} />
              <CampoNumero label="Qtà per lotto" suffisso={m.um} valore={p.qtaLotto} onCambia={(v) => setP(p.id, { qtaLotto: v })} />
              <Box>
                <Typography variant="caption" color="text.secondary" component="div">
                  Costo / {m.um}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {euroFine(costoUnitario(p))}
                </Typography>
                {i === 0 && <Etichetta tono="primario">Più recente</Etichetta>}
              </Box>
              <IconButton
                aria-label="Elimina prezzo"
                onClick={() => {
                  setPrezzi(prezzi.filter((x) => x.id !== p.id));
                  setRimossi([...rimossi, p.id]);
                }}
              >
                <DeleteOutlined />
              </IconButton>
            </Box>
          ))}
        </Stack>
        {doppie && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            Due prezzi hanno la stessa data: cambiane una.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {esistente && (
          <Button
            color="error"
            sx={{ mr: "auto" }}
            onClick={async () => {
              const testo = usata ? `È usata in ${usata} ricette o edizioni: conviene disattivarla.` : `"${m.nome}" e i suoi prezzi verranno eliminati.`;
              if (await conferma("Eliminare la materia prima?", testo, "Elimina")) {
                dati.prezziMP.filter((p) => p.mpId === m.id).forEach((p) => elimina("prezziMP", p.id));
                elimina("materiePrime", m.id);
                notifica("Materia prima eliminata");
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
          disabled={!m.nome.trim() || doppie}
          onClick={() => {
            salva("materiePrime", { ...m, nome: m.nome.trim() });
            rimossi.forEach((id) => elimina("prezziMP", id));
            prezzi.filter((p) => p.validoDal && p.qtaLotto > 0).forEach((p) => salva("prezziMP", { ...p, mpId: m.id }));
            notifica("Materia prima salvata");
            onChiudi();
          }}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}
