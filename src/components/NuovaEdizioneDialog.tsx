"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import { annoSociale, listinoAl, nuovoId, oggiISO } from "@/lib/calcoli";
import { data as fmtData } from "@/lib/format";
import { FORMULE_SERATA, TIPI_EVENTO, copiaStruttura, strutturaBase } from "@/lib/modelli";
import type { Edizione, Evento, FormulaSerata } from "@/lib/types";
import { CampoNumero, CampoScelta } from "./ui";
import { useGestionale } from "./Gestionale";

interface SerataBozza {
  nome: string;
  formula: FormulaSerata;
  /** Days after the edition date. */
  giorno: number;
}

const SERATE_BOSCO: SerataBozza[] = [
  { nome: "Venerdì", formula: "bar", giorno: 0 },
  { nome: "Sabato", formula: "cenaFissa", giorno: 1 },
  { nome: "Domenica", formula: "pranzoCena", giorno: 2 },
  { nome: "Lunedì", formula: "cenaCarta", giorno: 3 },
];

function piuGiorni(data: string, n: number): string {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function giorniTra(da: string, a: string): number {
  return Math.round((new Date(`${a}T12:00:00`).getTime() - new Date(`${da}T12:00:00`).getTime()) / 86400000);
}

export default function NuovaEdizioneDialog({
  evento,
  aperto,
  onChiudi,
  onCreata,
}: {
  evento: Evento;
  aperto: boolean;
  onChiudi: () => void;
  onCreata: (e: Edizione) => void;
}) {
  const { dati, salva, notifica } = useGestionale();
  const mobile = useMediaQuery("(max-width:600px)");
  const precedenti = useMemo(
    () => dati.edizioni.filter((e) => e.eventoId === evento.id).sort((a, b) => (a.data < b.data ? 1 : -1)),
    [dati.edizioni, evento.id],
  );
  const [nome, setNome] = useState("");
  const [dataEd, setDataEd] = useState(oggiISO());
  const [partecipanti, setPartecipanti] = useState(0);
  const [listinoId, setListinoId] = useState("");
  const [origine, setOrigine] = useState("");
  const [copia, setCopia] = useState({ menu: true, acquisti: true, extra: true });
  const [serate, setSerate] = useState<SerataBozza[]>(SERATE_BOSCO);
  const [lotteria, setLotteria] = useState(true);
  const [tappe, setTappe] = useState(5);
  const [quota, setQuota] = useState(0);
  const [presepe, setPresepe] = useState<"vivente" | "fermo">("fermo");

  const [eraAperto, setEraAperto] = useState(false);
  if (aperto !== eraAperto) {
    setEraAperto(aperto);
    if (aperto) {
      const oggi = oggiISO();
      const ultima = precedenti[0];
      setNome(`${evento.nome} ${oggi.slice(0, 4)}`);
      setDataEd(oggi);
      setPartecipanti(ultima?.partecipantiReali || ultima?.partecipantiPrevisti || 0);
      setListinoId("");
      setOrigine(ultima?.id ?? "");
      setCopia({ menu: true, acquisti: true, extra: true });
      setSerate(SERATE_BOSCO);
      setLotteria(true);
      setTappe(5);
      setQuota(0);
      setPresepe(ultima?.presepe ?? "fermo");
    }
  }

  const listinoAuto = listinoAl(dati.listini, dataEd);
  const sorgente = precedenti.find((e) => e.id === origine);
  const doppione = dati.edizioni.some((e) => e.eventoId === evento.id && e.nome.trim().toLowerCase() === nome.trim().toLowerCase());
  const conta = (f: (p: Edizione["parti"][number]) => number) => sorgente?.parti.reduce((s, p) => s + f(p), 0) ?? 0;

  const crea = () => {
    const struttura = sorgente
      ? { ...copiaStruttura(sorgente, dataEd, copia), ...(evento.tipo === "natale" ? { presepe } : {}) }
      : {
          comuni: [],
          ...strutturaBase(evento.tipo, dataEd, {
            serate: serate.map((s) => ({ nome: s.nome, formula: s.formula, data: piuGiorni(dataEd, s.giorno) })),
            lotteria,
            tappe,
            presepe,
          }),
        };
    if (!sorgente && evento.tipo === "cammina" && quota)
      struttura.parti = struttura.parti.map((p) => (p.tipo === "ingressi" && p.ingresso ? { ...p, ingresso: { ...p.ingresso, prezzo: quota, previsti: partecipanti } } : p));
    const ed: Edizione = {
      id: nuovoId(),
      eventoId: evento.id,
      nome: nome.trim(),
      data: dataEd,
      listinoId: listinoId || undefined,
      partecipantiPrevisti: partecipanti || undefined,
      stato: "pianificata",
      ...struttura,
    };
    salva("edizioni", ed);
    notifica("Edizione creata");
    onChiudi();
    onCreata(ed);
  };

  const opzioniModello = () => {
    switch (evento.tipo) {
      case "bosco":
        return (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Scegli le serate e la formula di ognuna: ogni serata avrà le sue schede (servizio e bar dopo cena separati).
            </Typography>
            {serate.map((s, i) => (
              <Box key={i} sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr 1fr auto", sm: "1fr 1fr 1.6fr auto" }, alignItems: "center" }}>
                <TextField size="small" label="Serata" value={s.nome} onChange={(e) => setSerate(serate.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
                <TextField
                  size="small"
                  type="date"
                  label="Data"
                  value={piuGiorni(dataEd, s.giorno)}
                  onChange={(e) => e.target.value && setSerate(serate.map((x, j) => (j === i ? { ...x, giorno: giorniTra(dataEd, e.target.value) } : x)))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <CampoScelta
                  size="small"
                  label="Formula"
                  valore={s.formula}
                  onCambia={(formula) => setSerate(serate.map((x, j) => (j === i ? { ...x, formula } : x)))}
                  opzioni={Object.entries(FORMULE_SERATA).map(([valore, etichetta]) => ({ valore: valore as FormulaSerata, etichetta }))}
                  sx={{ gridColumn: { xs: "1 / 3", sm: "auto" } }}
                />
                <IconButton onClick={() => setSerate(serate.filter((_, j) => j !== i))} disabled={serate.length === 1} aria-label="Togli serata">
                  <DeleteOutlined />
                </IconButton>
              </Box>
            ))}
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Button
                size="small"
                startIcon={<AddOutlined />}
                onClick={() => setSerate([...serate, { nome: `Serata ${serate.length + 1}`, formula: "bar", giorno: (serate[serate.length - 1]?.giorno ?? -1) + 1 }])}
              >
                Aggiungi serata
              </Button>
              <FormControlLabel control={<Checkbox checked={lotteria} onChange={(e) => setLotteria(e.target.checked)} />} label="Lotteria" />
            </Stack>
          </Stack>
        );
      case "cammina":
        return (
          <Stack direction="row" spacing={2}>
            <CampoNumero label="Numero di tappe" valore={tappe} onCambia={(v) => setTappe(Math.max(1, Math.min(20, Math.round(v))))} />
            <CampoNumero label="Quota d'iscrizione" euro valore={quota} onCambia={setQuota} />
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={aperto} onClose={onChiudi} fullWidth maxWidth="sm" fullScreen={mobile}>
      <DialogTitle>Nuova edizione di {evento.nome}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <TextField
            label="Nome edizione"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            error={doppione}
            helperText={doppione ? "Esiste già un'edizione con questo nome" : undefined}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label={evento.tipo === "bosco" ? "Data prima serata" : "Data"}
              type="date"
              value={dataEd}
              onChange={(e) => setDataEd(e.target.value)}
              helperText={dataEd ? `Anno sociale ${annoSociale(dataEd)}` : undefined}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <CampoNumero label="Partecipanti previsti" valore={partecipanti} onCambia={setPartecipanti} />
          </Stack>
          <CampoScelta
            label="Listino prezzi"
            valore={listinoId}
            onCambia={setListinoId}
            vuoto={listinoAuto ? `Automatico: ${listinoAuto.nome} (dal ${fmtData(listinoAuto.validoDal)})` : "Automatico (nessun listino valido)"}
            opzioni={[...dati.listini]
              .sort((a, b) => (a.validoDal < b.validoDal ? 1 : -1))
              .map((l) => ({ valore: l.id, etichetta: `${l.nome} (dal ${fmtData(l.validoDal)})` }))}
            helperText="Di solito lascia Automatico: usa il listino valido alla data dell'edizione."
          />
          {!listinoAuto && !listinoId && evento.tipo !== "natale" && (
            <Alert severity="warning">Nessun listino valido a questa data: crealo nel Prezziario per avere i prezzi del menu.</Alert>
          )}
          {evento.tipo === "natale" && (
            <CampoScelta
              label="Presepe"
              valore={presepe}
              onCambia={setPresepe}
              opzioni={[
                { valore: "vivente", etichetta: "Presepe vivente" },
                { valore: "fermo", etichetta: "Presepe fermo" },
              ]}
            />
          )}

          <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#f8f9fb" }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Struttura
            </Typography>
            {precedenti.length > 0 && (
              <CampoScelta
                label="Parti da"
                valore={origine}
                onCambia={setOrigine}
                vuoto={`Modello vuoto "${TIPI_EVENTO[evento.tipo].etichetta}"`}
                opzioni={precedenti.map((e) => ({ valore: e.id, etichetta: `Copia di ${e.nome} (${fmtData(e.data)})` }))}
                sx={{ mb: 1 }}
              />
            )}
            {sorgente ? (
              <Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Copio {sorgente.parti.length === 1 ? "la struttura" : `${sorgente.parti.length} parti${sorgente.serate?.length ? ` in ${sorgente.serate.length} serate` : ""}`}: le quantità
                  reali diventano le nuove previsioni, le date delle serate si spostano con la nuova data.
                </Typography>
                <FormControlLabel
                  control={<Checkbox checked={copia.menu} onChange={(e) => setCopia({ ...copia, menu: e.target.checked })} />}
                  label={`Menu e piatti (${conta((p) => p.menu.length)} righe)`}
                />
                <FormControlLabel
                  control={<Checkbox checked={copia.acquisti} onChange={(e) => setCopia({ ...copia, acquisti: e.target.checked })} />}
                  label={`Acquisti e materiali (${conta((p) => p.acquisti.length)} righe)`}
                />
                <FormControlLabel
                  control={<Checkbox checked={copia.extra} onChange={(e) => setCopia({ ...copia, extra: e.target.checked })} />}
                  label={`Costi extra e comuni (${conta((p) => p.costiExtra.length) + sorgente.comuni.length})`}
                />
              </Stack>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {TIPI_EVENTO[evento.tipo].descrizione}.
                </Typography>
                {opzioniModello()}
              </>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onChiudi}>Annulla</Button>
        <Button variant="contained" disabled={!nome.trim() || !dataEd || doppione || (!sorgente && evento.tipo === "bosco" && !serate.length)} onClick={crea}>
          Crea edizione
        </Button>
      </DialogActions>
    </Dialog>
  );
}
