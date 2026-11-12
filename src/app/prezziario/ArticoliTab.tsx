"use client";

import { useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
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
import LocalBarOutlined from "@mui/icons-material/LocalBarOutlined";
import ComposizionePrezzo from "@/components/ComposizionePrezzo";
import { useGestionale } from "@/components/Gestionale";
import { CampoNumero, Etichetta, Vuoto } from "@/components/ui";
import { costoArticolo, listinoAl, nuovoId, oggiISO, prossimoCodice } from "@/lib/calcoli";
import { righeMenu } from "@/lib/modelli";
import { data as fmtData, euro, euroFine, percento } from "@/lib/format";
import type { Articolo } from "@/lib/types";

export default function ArticoliTab() {
  const { dati } = useGestionale();
  const [alData, setAlData] = useState(oggiISO());
  const [aperto, setAperto] = useState<Articolo | null>(null);
  const [soloAttivi, setSoloAttivi] = useState(true);
  const listino = listinoAl(dati.listini, alData);

  const righe = useMemo(
    () =>
      [...dati.articoli]
        .filter((a) => !soloAttivi || a.attivo)
        .sort((a, b) => a.codice.localeCompare(b.codice))
        .map((a) => {
          const costo = costoArticolo(a, alData, dati);
          const prezzo = listino?.prezzi[a.id];
          return { a, costo, prezzo, margine: prezzo !== undefined ? prezzo - costo.costoVivo : undefined };
        }),
    [dati, alData, listino, soloAttivi],
  );

  const nuovo = (): Articolo => ({
    id: nuovoId(),
    codice: prossimoCodice("ART-", dati.articoli.map((a) => a.codice)),
    nome: "",
    categoria: dati.impostazioni.categorieArticolo[0] ?? "Bar",
    um: "pz",
    attivo: true,
    ricetta: [],
  });

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
        <TextField
          label="Costi e prezzi al giorno"
          type="date"
          value={alData}
          onChange={(e) => setAlData(e.target.value || oggiISO())}
          sx={{ maxWidth: { sm: 220 } }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Listino applicato: <b>{listino ? `${listino.nome} (dal ${fmtData(listino.validoDal)})` : "nessuno"}</b>
        </Typography>
        <FormControlLabel control={<Switch checked={soloAttivi} onChange={(e) => setSoloAttivi(e.target.checked)} />} label="Solo attivi" />
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAperto(nuovo())}>
          Nuovo articolo
        </Button>
      </Stack>

      <Card>
        {righe.length === 0 ? (
          <Vuoto
            icona={<LocalBarOutlined />}
            titolo="Nessun articolo"
            testo="Crea gli articoli che vendi (birra, panino...) e la loro ricetta: il costo si calcola dalle materie prime."
            azione={<Button variant="contained" onClick={() => setAperto(nuovo())}>Nuovo articolo</Button>}
          />
        ) : (
          <Box className="tabella-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Codice</TableCell>
                  <TableCell>Articolo</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Categoria</TableCell>
                  <TableCell className="num">Prezzo</TableCell>
                  <TableCell className="num">Costo vivo</TableCell>
                  <TableCell className="num">Margine</TableCell>
                  <TableCell className="num">%</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Stato</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {righe.map(({ a, costo, prezzo, margine }) => (
                  <TableRow key={a.id} hover sx={{ cursor: "pointer", opacity: a.attivo ? 1 : 0.55 }} onClick={() => setAperto(a)}>
                    <TableCell sx={{ color: "text.secondary" }}>{a.codice}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{a.nome}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{a.categoria}</TableCell>
                    <TableCell className="num">{euro(prezzo)}</TableCell>
                    <TableCell className="num">{costo.completo ? euroFine(costo.costoVivo) : "-"}</TableCell>
                    <TableCell className="num" sx={{ color: margine !== undefined && margine < 0 ? "error.main" : undefined }}>
                      {costo.completo ? euroFine(margine) : "-"}
                    </TableCell>
                    <TableCell className="num">{costo.completo && prezzo ? percento((margine ?? 0) / prezzo) : "-"}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {!costo.completo ? (
                        <Etichetta tono="attenzione">{costo.avvisi[0]}</Etichetta>
                      ) : prezzo === undefined ? (
                        <Etichetta tono="attenzione">Senza prezzo</Etichetta>
                      ) : (
                        <Etichetta tono="positivo">OK</Etichetta>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <ArticoloDialog articolo={aperto} alData={alData} onChiudi={() => setAperto(null)} />
    </>
  );
}

function ArticoloDialog({ articolo, alData, onChiudi }: { articolo: Articolo | null; alData: string; onChiudi: () => void }) {
  const { dati, salva, elimina, notifica, conferma } = useGestionale();
  const [a, setA] = useState<Articolo | null>(articolo);
  const mobile = useMediaQuery("(max-width:900px)");
  const [origine, setOrigine] = useState(articolo);
  if (articolo !== origine) {
    setOrigine(articolo);
    setA(articolo);
  }
  if (!a) return null;

  const esistente = dati.articoli.some((x) => x.id === a.id);
  const set = (p: Partial<Articolo>) => setA({ ...a, ...p });
  const costo = costoArticolo(a, alData, dati);
  const listino = listinoAl(dati.listini, alData);
  const mpOrdinate = [...dati.materiePrime].sort((x, y) => x.nome.localeCompare(y.nome));
  const usato = dati.edizioni.filter((e) => righeMenu(e).some((m) => m.articoloId === a.id)).length;

  return (
    <Dialog open onClose={onChiudi} fullWidth maxWidth="lg" fullScreen={mobile}>
      <DialogTitle>{esistente ? a.nome || "Articolo" : "Nuovo articolo"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "3fr 2fr" }, pt: 1 }}>
          <Box>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 2fr 1fr 1fr" } }}>
              <TextField label="Codice" value={a.codice} onChange={(e) => set({ codice: e.target.value })} />
              <TextField label="Nome" value={a.nome} onChange={(e) => set({ nome: e.target.value })} autoFocus={!esistente} />
              <Autocomplete
                freeSolo
                options={dati.impostazioni.categorieArticolo}
                value={a.categoria}
                onInputChange={(_, v) => set({ categoria: v })}
                renderInput={(p) => <TextField {...p} label="Categoria" />}
              />
              <TextField label="Unità" value={a.um} onChange={(e) => set({ um: e.target.value })} />
            </Box>
            <FormControlLabel
              sx={{ mt: 1 }}
              control={<Switch checked={a.attivo} onChange={(e) => set({ attivo: e.target.checked })} />}
              label="Articolo attivo (in vendita)"
            />

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
              Ricetta per 1 {a.um}
            </Typography>
            <Stack spacing={1.5}>
              {a.ricetta.map((r, i) => {
                const mp = dati.materiePrime.find((m) => m.id === r.mpId);
                const riga = costo.righe[i];
                return (
                  <Stack key={i} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Autocomplete
                      sx={{ flex: 3 }}
                      options={mpOrdinate}
                      value={mp ?? null}
                      getOptionLabel={(o) => `${o.codice} · ${o.nome}`}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      onChange={(_, v) => set({ ricetta: a.ricetta.map((x, j) => (j === i ? { ...x, mpId: v?.id ?? "" } : x)) })}
                      renderInput={(p) => <TextField {...p} label="Materia prima" />}
                    />
                    <CampoNumero
                      sx={{ flex: 1.3 }}
                      label="Quantità"
                      valore={r.qta}
                      suffisso={mp?.um}
                      onCambia={(v) => set({ ricetta: a.ricetta.map((x, j) => (j === i ? { ...x, qta: v } : x)) })}
                    />
                    <Typography variant="body2" sx={{ width: 80, textAlign: "right", display: { xs: "none", sm: "block" } }}>
                      {riga?.costoUM !== undefined ? euroFine(riga.costo) : "-"}
                    </Typography>
                    <IconButton onClick={() => set({ ricetta: a.ricetta.filter((_, j) => j !== i) })} aria-label="Rimuovi">
                      <DeleteOutlined />
                    </IconButton>
                  </Stack>
                );
              })}
              <Box>
                <Button startIcon={<AddOutlined />} onClick={() => set({ ricetta: [...a.ricetta, { mpId: "", qta: 0 }] })}>
                  Aggiungi ingrediente
                </Button>
              </Box>
            </Stack>
            <TextField sx={{ mt: 2 }} label="Note" value={a.note ?? ""} onChange={(e) => set({ note: e.target.value })} multiline />
          </Box>

          <Box>
            <Card sx={{ p: 2.5, bgcolor: "#f8f9fb" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Composizione del prezzo
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>
                Costi al {fmtData(alData)} · {listino ? listino.nome : "nessun listino"}
              </Typography>
              <ComposizionePrezzo costo={costo} prezzo={listino?.prezzi[a.id]} />
            </Card>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Prezzo nei listini
            </Typography>
            {[...dati.listini]
              .sort((x, y) => (x.validoDal < y.validoDal ? 1 : -1))
              .map((l) => (
                <Stack key={l.id} direction="row" sx={{ justifyContent: "space-between", py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {l.nome} · dal {fmtData(l.validoDal)}
                  </Typography>
                  <Typography variant="body2">{euro(l.prezzi[a.id])}</Typography>
                </Stack>
              ))}
            <Typography variant="caption" color="text.secondary">
              I prezzi di vendita si modificano nella scheda Listini prezzi.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {esistente && (
          <Button
            color="error"
            sx={{ mr: "auto" }}
            onClick={async () => {
              const testo = usato
                ? `L'articolo è usato in ${usato} edizioni: conviene disattivarlo invece di eliminarlo.`
                : `"${a.nome}" verrà eliminato.`;
              if (await conferma("Eliminare l'articolo?", testo, "Elimina")) {
                elimina("articoli", a.id);
                notifica("Articolo eliminato");
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
          disabled={!a.nome.trim() || !a.codice.trim()}
          onClick={() => {
            salva("articoli", { ...a, nome: a.nome.trim(), ricetta: a.ricetta.filter((r) => r.mpId) });
            notifica("Articolo salvato");
            onChiudi();
          }}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}
