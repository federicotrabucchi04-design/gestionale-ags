"use client";

import { useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import { useGestionale } from "@/components/Gestionale";
import ListaSpesa from "@/components/ListaSpesa";
import NuovaMateriaRapida from "@/components/NuovaMateriaRapida";
import { Aiuto, CampoNumero, Vuoto } from "@/components/ui";
import { nuovoId, saldoInventario, suggerimentoAcquisto, usoStorico, type DatoStorico } from "@/lib/calcoli";
import { euro, numero } from "@/lib/format";
import type { MateriaPrima, RigaAcquisto } from "@/lib/types";
import { Storico } from "./MenuEdizione";
import type { PropsParte } from "./tipi";

/** Share of what was available that was actually used, as a coloured number. */
export function UsoPct({ valore }: { valore?: number }) {
  if (valore === undefined) return <Typography variant="body2" color="text.disabled">–</Typography>;
  const colore = valore < 0 || valore > 1.0001 ? "error.main" : valore >= 0.85 ? "success.main" : valore >= 0.6 ? "warning.main" : "error.main";
  return (
    <Typography variant="body2" sx={{ fontWeight: 700, color: colore, fontSize: 15 }}>
      {Math.round(valore * 100)}%
    </Typography>
  );
}

interface Info {
  giacenza: number;
  storico: DatoStorico;
  suggeriti?: number;
}

export default function AcquistiEdizione({ ed, parte, calc, calcEd, aggiornaParte }: PropsParte) {
  const { dati } = useGestionale();
  const mobile = useMediaQuery("(max-width:1200px)");
  const [nuova, setNuova] = useState<string | null>(null);
  const [spesa, setSpesa] = useState(false);
  const materiali = parte.tipo === "materiali";
  const conScadenza = (mp?: MateriaPrima) => (mp?.genere ?? "consumo") === "consumo";

  const info = useMemo(() => {
    const altre = { ...dati, edizioni: dati.edizioni.filter((e) => e.id !== ed.id) };
    const m = new Map<string, Info>();
    for (const r of parte.acquisti) {
      const giacenza = saldoInventario(r.mpId, altre, ed.data);
      const storico = usoStorico(r.mpId, ed, dati, parte.nome);
      const qta = suggerimentoAcquisto(storico, ed.partecipantiPrevisti, giacenza);
      const lotto = calc.acquisti.find((a) => a.riga.id === r.id)?.qtaLotto;
      m.set(r.id, { giacenza, storico, suggeriti: qta !== undefined && lotto ? Math.ceil(qta / lotto - 1e-9) : undefined });
    }
    return m;
  }, [dati, ed, parte.acquisti, parte.nome, calc.acquisti]);

  const genereParte = materiali ? "materiale" : "consumo";
  const disponibili = dati.materiePrime
    .filter((m) => m.attiva && !parte.acquisti.some((a) => a.mpId === m.id))
    .sort((a, b) => {
      const ga = (a.genere ?? "consumo") === genereParte ? 0 : 1;
      const gb = (b.genere ?? "consumo") === genereParte ? 0 : 1;
      return ga - gb || a.nome.localeCompare(b.nome);
    });

  const aggiungi = (mpId: string) =>
    aggiornaParte((p) => ({ acquisti: [...p.acquisti, { id: nuovoId(), mpId, lottiPrevisti: 0, lottiReali: 0, daMagazzino: 0, rimanenza: 0 }] }));
  const setRiga = (id: string, patch: Partial<RigaAcquisto>) =>
    aggiornaParte((p) => ({ acquisti: p.acquisti.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const togli = (id: string) => aggiornaParte((p) => ({ acquisti: p.acquisti.filter((a) => a.id !== id) }));

  const tot = calc.acquisti.reduce(
    (t, a) => ({
      prev: t.prev + a.costoPrevisto,
      reale: t.reale + a.costoAcquisto,
      consumato: t.consumato + a.costoConsumato,
      avanzi: t.avanzi + a.valoreAvanzo,
    }),
    { prev: 0, reale: 0, consumato: 0, avanzi: 0 },
  );

  const suggerito = (id: string) => {
    const i = info.get(id);
    if (i?.suggeriti === undefined) return <Typography component="span" variant="body2" color="text.disabled">–</Typography>;
    return (
      <Tooltip title="Uso medio delle ultime edizioni (riscalato sui partecipanti previsti, se noti) meno quanto c'è in magazzino. Clic per usarlo.">
        <Link component="button" type="button" underline="hover" onClick={() => setRiga(id, { lottiPrevisti: i.suggeriti! })} sx={{ fontSize: 14 }}>
          {numero(i.suggeriti)} conf.
        </Link>
      </Tooltip>
    );
  };

  const scadenza = (r: RigaAcquisto) => (
    <TextField
      type="date"
      size="small"
      label="Scadenza avanzo"
      value={r.scadenza ?? ""}
      onChange={(e) => setRiga(r.id, { scadenza: e.target.value || undefined })}
      slotProps={{ inputLabel: { shrink: true } }}
      sx={{ mt: 1, minWidth: 150 }}
    />
  );

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
        <Autocomplete
          sx={{ flex: 1, maxWidth: { sm: 360 } }}
          options={disponibili}
          groupBy={(m) => ((m.genere ?? "consumo") === "materiale" ? "Materiali" : "Cibo e bevande")}
          getOptionLabel={(m) => `${m.nome} (${m.codice})`}
          value={null}
          onChange={(_, m) => m && aggiungi(m.id)}
          renderInput={(p) => <TextField {...p} label={materiali ? "Aggiungi materiale" : "Aggiungi materia prima"} />}
          blurOnSelect
          clearOnBlur
        />
        <Button startIcon={<AddOutlined />} onClick={() => setNuova("")}>
          {materiali ? "Nuovo materiale" : "Nuova voce"}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<ShoppingCartOutlined />} onClick={() => setSpesa(true)}>
          Lista della spesa
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Per ogni voce: quanto si usa di solito, cosa c&apos;è già in magazzino, quanto comprare. A fine evento inserisci quanto hai preso dal magazzino e quanto
        riporti: l&apos;uso e l&apos;inventario si calcolano da soli.
      </Typography>

      {parte.acquisti.length === 0 ? (
        <Card>
          <Vuoto
            titolo={materiali ? "Nessun materiale" : "Nessun acquisto"}
            testo={
              materiali
                ? "Aggiungi legno, viti, luci, addobbi: quello che avanza va nelle scorte e il costo dell'evento viene depurato dagli avanzi."
                : "Aggiungi le materie prime da comprare: lotti e costi arrivano dal prezziario alla data dell'evento."
            }
          />
        </Card>
      ) : mobile ? (
        <Stack spacing={1.5}>
          {calc.acquisti.map((a) => {
            const i = info.get(a.riga.id);
            return (
              <Card key={a.riga.id}>
                <CardContent sx={{ pb: "16px !important" }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 500 }}>{a.mp?.nome ?? "Voce eliminata"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.prezzo ? `Confezione: ${numero(a.qtaLotto)} ${a.mp?.um} a ${euro(a.prezzo.costoLotto)}` : "Manca il prezzo a questa data"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <UsoPct valore={a.percentualeConsumo} />
                      <IconButton size="small" onClick={() => togli(a.riga.id)} aria-label="Togli">
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2">
                      In magazzino <b>{numero(i?.giacenza)}</b> {a.mp?.um}
                    </Typography>
                    {i && <Storico dato={i.storico} um={a.mp?.um} />}
                    <Typography variant="body2" component="span">
                      Suggerito {suggerito(a.riga.id)}
                    </Typography>
                  </Stack>
                  <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "1fr 1fr", mt: 1.5 }}>
                    <CampoNumero label="Confezioni previste" valore={a.riga.lottiPrevisti} onCambia={(v) => setRiga(a.riga.id, { lottiPrevisti: v })} />
                    <CampoNumero label="Confezioni comprate" valore={a.riga.lottiReali} onCambia={(v) => setRiga(a.riga.id, { lottiReali: v })} />
                    <CampoNumero label="Presi dal magazzino" suffisso={a.mp?.um} valore={a.riga.daMagazzino} onCambia={(v) => setRiga(a.riga.id, { daMagazzino: v })} />
                    <CampoNumero label="Riportati in magazzino" suffisso={a.mp?.um} valore={a.riga.rimanenza} onCambia={(v) => setRiga(a.riga.id, { rimanenza: v })} />
                  </Box>
                  {a.riga.rimanenza > 0 && conScadenza(a.mp) && scadenza(a.riga)}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Usati {numero(a.consumo)} {a.mp?.um} · costo usato {euro(a.costoConsumato)} · spesa {euro(a.costoAcquisto)}
                  </Typography>
                  {a.consumo < 0 && (
                    <Typography variant="body2" color="error">
                      Riporti più di quanto avevi: controlla i numeri.
                    </Typography>
                  )}
                  {i && a.riga.daMagazzino > i.giacenza + 1e-9 && (
                    <Typography variant="body2" color="warning.main">
                      Prendi dal magazzino più di quanto risulta ({numero(i.giacenza)} {a.mp?.um}).
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
          <Card sx={{ bgcolor: "#f8f9fb" }}>
            <CardContent>
              <Typography sx={{ fontWeight: 600 }}>
                Spesa prevista {euro(tot.prev)} · reale {euro(tot.reale)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Costo di quanto usato {euro(tot.consumato)} · valore riportato in magazzino {euro(tot.avanzi)}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      ) : (
        <Card>
          <Box className="tabella-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{materiali ? "Materiale" : "Materia prima"}</TableCell>
                  <TableCell className="num">
                    Uso medio
                    <Aiuto testo="Quanto si è usato nelle ultime 3 edizioni dello stesso evento (passa sopra per il dettaglio)" />
                  </TableCell>
                  <TableCell className="num">
                    In magazzino
                    <Aiuto testo="Giacenza alla data dell'edizione, senza contare questa edizione" />
                  </TableCell>
                  <TableCell className="num">Suggerito</TableCell>
                  <TableCell sx={{ width: 95 }}>Conf. previste</TableCell>
                  <TableCell className="num">Spesa prev.</TableCell>
                  <TableCell sx={{ width: 95 }}>Conf. comprate</TableCell>
                  <TableCell sx={{ width: 115 }}>
                    Presi
                    <Aiuto testo="Quantità presa dal magazzino, già pagata in passato" />
                  </TableCell>
                  <TableCell sx={{ width: 115 }}>
                    Riportati
                    <Aiuto testo="Avanzo che torna in magazzino a fine evento" />
                  </TableCell>
                  <TableCell className="num">Usati</TableCell>
                  <TableCell className="num">% uso</TableCell>
                  <TableCell className="num">Spesa reale</TableCell>
                  <TableCell className="num">Costo usato</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {calc.acquisti.map((a) => {
                  const i = info.get(a.riga.id);
                  const troppo = i && a.riga.daMagazzino > i.giacenza + 1e-9;
                  return (
                    <TableRow key={a.riga.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {a.mp?.nome ?? "Eliminata"}
                        <Typography variant="caption" color={a.prezzo ? "text.secondary" : "warning.main"} component="div">
                          {a.prezzo ? `conf. ${numero(a.qtaLotto)} ${a.mp?.um} · ${euro(a.prezzo.costoLotto)}` : "Senza prezzo a questa data"}
                        </Typography>
                      </TableCell>
                      <TableCell className="num">{i?.storico.media !== undefined ? <Storico dato={i.storico} um={a.mp?.um} /> : "–"}</TableCell>
                      <TableCell className="num">
                        {numero(i?.giacenza)} {a.mp?.um}
                      </TableCell>
                      <TableCell className="num">
                        {suggerito(a.riga.id)}
                      </TableCell>
                      <TableCell>
                        <CampoNumero valore={a.riga.lottiPrevisti} onCambia={(v) => setRiga(a.riga.id, { lottiPrevisti: v })} />
                      </TableCell>
                      <TableCell className="num">{euro(a.costoPrevisto)}</TableCell>
                      <TableCell>
                        <CampoNumero valore={a.riga.lottiReali} onCambia={(v) => setRiga(a.riga.id, { lottiReali: v })} />
                      </TableCell>
                      <TableCell>
                        <CampoNumero
                          valore={a.riga.daMagazzino}
                          onCambia={(v) => setRiga(a.riga.id, { daMagazzino: v })}
                          error={troppo}
                          helperText={troppo ? `ce ne sono ${numero(i!.giacenza)}` : undefined}
                        />
                      </TableCell>
                      <TableCell>
                        <CampoNumero valore={a.riga.rimanenza} onCambia={(v) => setRiga(a.riga.id, { rimanenza: v })} error={a.consumo < 0} />
                        {a.riga.rimanenza > 0 && conScadenza(a.mp) && scadenza(a.riga)}
                      </TableCell>
                      <TableCell className="num" sx={{ color: a.consumo < 0 ? "error.main" : undefined, whiteSpace: "nowrap" }}>
                        {numero(a.consumo)} {a.mp?.um}
                      </TableCell>
                      <TableCell className="num">
                        <UsoPct valore={a.percentualeConsumo} />
                      </TableCell>
                      <TableCell className="num">{euro(a.costoAcquisto)}</TableCell>
                      <TableCell className="num">{euro(a.costoConsumato)}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => togli(a.riga.id)} aria-label="Togli">
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ "& td": { fontWeight: 600, color: "text.primary", fontSize: 14, bgcolor: "#f8f9fb" } }}>
                  <TableCell colSpan={5}>Totale</TableCell>
                  <TableCell className="num">{euro(tot.prev)}</TableCell>
                  <TableCell colSpan={2} />
                  <TableCell className="num">{euro(tot.avanzi)}</TableCell>
                  <TableCell colSpan={2} />
                  <TableCell className="num">{euro(tot.reale)}</TableCell>
                  <TableCell className="num">{euro(tot.consumato)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </Box>
          {tot.avanzi > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Spesa {euro(tot.reale)}, di cui {euro(tot.avanzi)} torna in magazzino come avanzo: il costo puro di questa parte è {euro(tot.consumato)}.
            </Typography>
          )}
        </Card>
      )}

      <NuovaMateriaRapida
        nome={nuova}
        genere={genereParte}
        data={ed.data}
        onChiudi={(mp) => {
          setNuova(null);
          if (mp) aggiungi(mp.id);
        }}
      />
      <ListaSpesa aperta={spesa} ed={ed} calc={calcEd} onChiudi={() => setSpesa(false)} />
    </>
  );
}
