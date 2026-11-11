"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import EventBusyOutlined from "@mui/icons-material/EventBusyOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SavingsOutlined from "@mui/icons-material/SavingsOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { useGestionale } from "@/components/Gestionale";
import MovimentoDialog, { movimentoVuoto } from "@/components/MovimentoDialog";
import { Etichetta, Griglia, Intestazione, Kpi, Sezione, Vuoto } from "@/components/ui";
import { calcolaEdizione, costoArticolo, flussiMensili, nelAnno, oggiISO, riepilogoCassa } from "@/lib/calcoli";
import { data, euro, meseBreve, percento } from "@/lib/format";
import type { Movimento } from "@/lib/types";

export default function Home() {
  const { dati, anno, salva, notifica } = useGestionale();
  const [movimento, setMovimento] = useState<Movimento | null>(null);

  const cassa = useMemo(() => riepilogoCassa(anno, dati.impostazioni, dati.movimenti), [anno, dati.impostazioni, dati.movimenti]);
  const flussi = useMemo(() => flussiMensili(anno, cassa.apertura, dati.movimenti), [anno, cassa.apertura, dati.movimenti]);

  const edizioniAnno = useMemo(
    () =>
      dati.edizioni
        .filter((e) => nelAnno(e.data, anno))
        .sort((a, b) => (a.data < b.data ? -1 : 1))
        .map((e) => ({ ed: e, evento: dati.eventi.find((x) => x.id === e.eventoId), calc: calcolaEdizione(e, dati) })),
    [dati, anno],
  );

  const previste = useMemo(
    () =>
      dati.movimenti
        .filter((m) => m.stato === "previsto" && nelAnno(m.data, anno))
        .sort((a, b) => (a.data < b.data ? -1 : 1)),
    [dati.movimenti, anno],
  );

  const avvisi = useMemo(() => {
    const oggi = oggiISO();
    const out: { testo: string; href: string }[] = [];
    for (const a of dati.articoli.filter((x) => x.attivo)) {
      const c = costoArticolo(a, oggi, dati);
      if (!c.completo) out.push({ testo: `${a.nome}: ${c.avvisi[0]}`, href: "/prezziario?tab=articoli" });
    }
    for (const e of edizioniAnno) {
      if (e.calc.avvisi.length) out.push({ testo: `${e.ed.nome}: ${e.calc.avvisi[0]}`, href: `/eventi/${e.ed.eventoId}/${e.ed.id}` });
    }
    for (const m of previste) {
      if (m.data < oggi) out.push({ testo: `Spesa prevista scaduta: ${m.descrizione} (${data(m.data)})`, href: "/movimenti" });
    }
    return out;
  }, [dati, edizioniAnno, previste]);

  const mesi = flussi.map((f) => meseBreve(f.mese));
  const fmt = (v: number | null) => euro(v ?? 0);

  return (
    <>
      <Intestazione
        titolo="Home"
        sottotitolo={`Anno sociale ${anno} · dal 1 ottobre al 30 settembre`}
        azioni={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setMovimento(movimentoVuoto())}>
            Nuovo movimento
          </Button>
        }
      />

      <Griglia min={165} gap={1.5}>
        <Kpi
          grande
          etichetta="Totale in cassa"
          valore={euro(cassa.cassa)}
          tono="primario"
          icona={<AccountBalanceWalletOutlined fontSize="small" />}
          nota={`Apertura ${euro(cassa.apertura)} · entrate ${euro(cassa.entrateUfficiali)} · uscite ${euro(cassa.usciteUfficiali)}`}
        />
        <Kpi
          etichetta="Spese previste ordinarie"
          valore={euro(cassa.spesePrevisteOrdinarie)}
          tono={cassa.spesePrevisteOrdinarie > 0 ? "attenzione" : "neutro"}
          icona={<ReceiptLongOutlined fontSize="small" />}
          nota="Bollette, sede e altre spese non ancora pagate"
        />
        <Kpi
          etichetta="Spese previste eventi"
          valore={euro(cassa.spesePrevisteEventi)}
          tono={cassa.spesePrevisteEventi > 0 ? "attenzione" : "neutro"}
          icona={<EventBusyOutlined fontSize="small" />}
          nota="Fornitori e servizi degli eventi da pagare"
        />
        <Kpi
          etichetta="Disponibilità netta"
          valore={euro(cassa.disponibilitaNetta)}
          tono={cassa.disponibilitaNetta >= 0 ? "positivo" : "negativo"}
          icona={<SavingsOutlined fontSize="small" />}
          nota={cassa.entratePreviste ? `Esclude ${euro(cassa.entratePreviste)} di entrate previste` : "Cassa meno spese previste"}
        />
      </Griglia>

      <Box sx={{ display: "grid", gap: 3, mt: 3, gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" } }}>
        <Sezione titolo="Flussi di cassa" sottotitolo="Entrate e uscite ufficiali per mese">
          <BarChart
            height={280}
            xAxis={[{ scaleType: "band", data: mesi }]}
            yAxis={[{ valueFormatter: (v: number) => `${Math.round(v)} €`, width: 64 }]}
            series={[
              { data: flussi.map((f) => f.entrate), label: "Entrate", color: "#34a853", valueFormatter: fmt },
              { data: flussi.map((f) => f.uscite), label: "Uscite", color: "#ea4335", valueFormatter: fmt },
            ]}
            borderRadius={6}
          />
        </Sezione>
        <Sezione titolo="Saldo di cassa" sottotitolo="Andamento mese per mese">
          <LineChart
            height={280}
            xAxis={[{ scaleType: "point", data: mesi }]}
            yAxis={[{ valueFormatter: (v: number) => `${Math.round(v)} €`, width: 64 }]}
            series={[{ data: flussi.map((f) => f.saldo), label: "Saldo", color: "#1a73e8", area: true, valueFormatter: fmt, showMark: false }]}
            hideLegend
            sx={{ "& .MuiLineChart-area": { fillOpacity: 0.12 } }}
          />
        </Sezione>
      </Box>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" } }}>
        <Sezione
          titolo="Andamento eventi"
          sottotitolo="Margine previsto e reale di ogni edizione dell'anno"
          azioni={
            <Button component={Link} href="/eventi" size="small">
              Vai agli eventi
            </Button>
          }
        >
          {edizioniAnno.length === 0 ? (
            <Vuoto titolo="Nessuna edizione in quest'anno" testo="Crea un evento e una edizione per vedere margini e confronti." />
          ) : (
            <>
              <BarChart
                height={260}
                xAxis={[{ scaleType: "band", data: edizioniAnno.map((e) => e.ed.nome) }]}
                yAxis={[{ valueFormatter: (v: number) => `${Math.round(v)} €`, width: 64 }]}
                series={[
                  { data: edizioniAnno.map((e) => e.calc.previsto.margineFinale), label: "Margine previsto", color: "#a8c7fa", valueFormatter: fmt },
                  { data: edizioniAnno.map((e) => e.calc.reale.margineFinale), label: "Margine reale", color: "#1a73e8", valueFormatter: fmt },
                  { data: edizioniAnno.map((e) => e.calc.cassa.netto), label: "Netto di cassa", color: "#188038", valueFormatter: fmt },
                ]}
                borderRadius={6}
              />
              <List dense disablePadding>
                {edizioniAnno.map(({ ed, evento, calc }) => (
                  <ListItemButton key={ed.id} component={Link} href={`/eventi/${ed.eventoId}/${ed.id}`} sx={{ borderRadius: 2 }}>
                    <ListItemText primary={ed.nome} secondary={`${evento?.nome ?? ""} · ${data(ed.data)}`} />
                    <Stack sx={{ alignItems: "flex-end" }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {euro(calc.cassa.netto)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        margine {percento(calc.reale.marginePct)}
                      </Typography>
                    </Stack>
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </Sezione>

        <Box>
          <Sezione titolo="Spese e incassi previsti" sottotitolo="Da confermare quando pagati" senzaPadding>
            {previste.length === 0 ? (
              <Typography color="text.secondary" sx={{ px: 2.5, pb: 2.5 }}>
                Nessun movimento previsto.
              </Typography>
            ) : (
              <List dense sx={{ pt: 0 }}>
                {previste.slice(0, 8).map((m) => (
                  <ListItem
                    key={m.id}
                    secondaryAction={
                      <Button
                        size="small"
                        onClick={() => {
                          salva("movimenti", { ...m, stato: "ufficiale" });
                          notifica(m.tipo === "uscita" ? "Segnato come pagato" : "Segnato come incassato");
                        }}
                      >
                        {m.tipo === "uscita" ? "Pagato" : "Incassato"}
                      </Button>
                    }
                  >
                    <ListItemButton onClick={() => setMovimento(m)} sx={{ borderRadius: 2, pr: 10 }}>
                      <ListItemText
                        primary={m.descrizione}
                        secondary={`${data(m.data)} · ${m.tipo === "uscita" ? "-" : "+"}${euro(m.importo)}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Sezione>
          <Sezione titolo="Da controllare">
            {avvisi.length === 0 ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Etichetta tono="positivo">Tutto in ordine</Etichetta>
                <Typography variant="body2" color="text.secondary">
                  Ricette, prezzi ed edizioni sono completi.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1}>
                {avvisi.slice(0, 6).map((a, i) => (
                  <Alert
                    key={i}
                    severity="warning"
                    icon={<WarningAmberOutlined fontSize="small" />}
                    action={
                      <Button component={Link} href={a.href} size="small" color="inherit">
                        Apri
                      </Button>
                    }
                  >
                    {a.testo}
                  </Alert>
                ))}
                {avvisi.length > 6 && (
                  <Typography variant="caption" color="text.secondary">
                    e altri {avvisi.length - 6}
                  </Typography>
                )}
              </Stack>
            )}
          </Sezione>
        </Box>
      </Box>

      <MovimentoDialog movimento={movimento} onChiudi={() => setMovimento(null)} />
    </>
  );
}
