"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import AddOutlined from "@mui/icons-material/AddOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import EventDialog from "@/components/EventoDialog";
import { useGestionale } from "@/components/Gestionale";
import NuovaEdizioneDialog from "@/components/NuovaEdizioneDialog";
import { Etichetta, Griglia, Intestazione, RigaValore, Sezione, Vuoto } from "@/components/ui";
import { annoSociale, calcolaEdizione } from "@/lib/calcoli";
import { data, euro, numero, percento } from "@/lib/format";
import { TIPI_EVENTO } from "@/lib/modelli";
import { STATI } from "@/lib/stati";
import type { Evento } from "@/lib/types";

export default function EventoPagina() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { dati, elimina, notifica, conferma } = useGestionale();
  const [modifica, setModifica] = useState<Evento | null>(null);
  const [nuova, setNuova] = useState(false);
  const evento = dati.eventi.find((e) => e.id === id);

  const edizioni = useMemo(
    () =>
      dati.edizioni
        .filter((e) => e.eventoId === id)
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .map((ed) => ({ ed, calc: calcolaEdizione(ed, dati) })),
    [dati, id],
  );

  if (!evento)
    return (
      <Vuoto
        titolo="Evento non trovato"
        azione={
          <Button component={Link} href="/eventi">
            Torna agli eventi
          </Button>
        }
      />
    );

  const cronologiche = [...edizioni].reverse();
  const fmt = (v: number | null) => euro(v ?? 0);

  return (
    <>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link href="/eventi">Eventi</Link>
        <Typography color="text.primary">{evento.nome}</Typography>
      </Breadcrumbs>
      <Intestazione
        titolo={evento.nome}
        sottotitolo={[TIPI_EVENTO[evento.tipo]?.etichetta, evento.descrizione].filter(Boolean).join(" · ")}
        azioni={
          <>
            <Button startIcon={<EditOutlined />} onClick={() => setModifica(evento)}>
              Modifica
            </Button>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setNuova(true)}>
              Nuova edizione
            </Button>
          </>
        }
      />

      {edizioni.length === 0 ? (
        <Card>
          <Vuoto
            titolo="Nessuna edizione"
            testo="Crea la prima edizione: scegli la data e il listino del periodo si collega da solo."
            azione={
              <Button variant="contained" onClick={() => setNuova(true)}>
                Crea edizione
              </Button>
            }
          />
          <Divider />
          <Box sx={{ p: 2, textAlign: "right" }}>
            <Button
              color="error"
              onClick={async () => {
                if (await conferma("Eliminare l'evento?", `"${evento.nome}" verrà eliminato.`, "Elimina")) {
                  elimina("eventi", evento.id);
                  notifica("Evento eliminato");
                  router.push("/eventi");
                }
              }}
            >
              Elimina evento
            </Button>
          </Box>
        </Card>
      ) : (
        <>
          {edizioni.length > 1 && (
            <Sezione titolo="Confronto edizioni" sottotitolo="Ricavi e margini reali, edizione per edizione">
              <BarChart
                height={260}
                xAxis={[{ scaleType: "band", data: cronologiche.map((x) => x.ed.nome) }]}
                yAxis={[{ valueFormatter: (v: number) => `${Math.round(v)} €`, width: 64 }]}
                series={[
                  { data: cronologiche.map((x) => x.calc.reale.ricavi), label: "Ricavi", color: "#a8c7fa", valueFormatter: fmt },
                  { data: cronologiche.map((x) => x.calc.reale.margineFinale), label: "Margine reale", color: "#1a73e8", valueFormatter: fmt },
                  { data: cronologiche.map((x) => x.calc.cassa.netto), label: "Netto di cassa", color: "#188038", valueFormatter: fmt },
                ]}
                borderRadius={6}
              />
            </Sezione>
          )}
          <Griglia min={300}>
            {edizioni.map(({ ed, calc }) => (
              <Card key={ed.id}>
                <CardActionArea component={Link} href={`/eventi/${evento.id}/${ed.id}`} sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontSize: 18 }}>
                          {ed.nome}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {data(ed.data)} · anno {annoSociale(ed.data)}
                        </Typography>
                      </Box>
                      <Box>
                        <Etichetta tono={STATI[ed.stato].tono}>{STATI[ed.stato].etichetta}</Etichetta>
                      </Box>
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <RigaValore etichetta="Ricavi previsti / reali" valore={`${euro(calc.previsto.ricavi)} / ${euro(calc.reale.ricavi)}`} />
                    <RigaValore
                      etichetta="Margine reale"
                      valore={`${euro(calc.reale.margineFinale)} · ${percento(calc.reale.marginePct)}`}
                      tono={calc.reale.margineFinale >= 0 ? "positivo" : "negativo"}
                    />
                    <RigaValore etichetta="Netto di cassa" valore={euro(calc.cassa.netto)} forte />
                    <RigaValore
                      etichetta="Partecipanti"
                      valore={`${numero(ed.partecipantiPrevisti)} previsti · ${numero(ed.partecipantiReali)} reali`}
                    />
                    {calc.avvisi.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Etichetta tono="attenzione">{calc.avvisi.length} da controllare</Etichetta>
                      </Box>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Griglia>
        </>
      )}

      <EventDialog evento={modifica} onChiudi={() => setModifica(null)} />
      <NuovaEdizioneDialog
        evento={evento}
        aperto={nuova}
        onChiudi={() => setNuova(false)}
        onCreata={(ed) => router.push(`/eventi/${evento.id}/${ed.id}`)}
      />
    </>
  );
}
