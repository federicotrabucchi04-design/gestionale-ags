"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import AddOutlined from "@mui/icons-material/AddOutlined";
import CelebrationOutlined from "@mui/icons-material/CelebrationOutlined";
import EventDialog, { eventoVuoto } from "@/components/EventoDialog";
import { useGestionale } from "@/components/Gestionale";
import { Etichetta, Griglia, Intestazione, Vuoto } from "@/components/ui";
import { calcolaEdizione } from "@/lib/calcoli";
import { data, euro } from "@/lib/format";
import type { Evento } from "@/lib/types";

export default function Eventi() {
  const { dati } = useGestionale();
  const router = useRouter();
  const [nuovo, setNuovo] = useState<Evento | null>(null);
  const [archiviati, setArchiviati] = useState(false);

  const schede = useMemo(
    () =>
      dati.eventi
        .filter((e) => archiviati || !e.archiviato)
        .map((e) => {
          const edizioni = dati.edizioni
            .filter((x) => x.eventoId === e.id)
            .sort((a, b) => (a.data < b.data ? -1 : 1))
            .map((ed) => ({ ed, calc: calcolaEdizione(ed, dati) }));
          return { e, edizioni, ultima: edizioni[edizioni.length - 1] };
        })
        .sort((a, b) => ((a.ultima?.ed.data ?? "") < (b.ultima?.ed.data ?? "") ? 1 : -1)),
    [dati, archiviati],
  );

  return (
    <>
      <Intestazione
        titolo="Eventi"
        sottotitolo="Ogni evento ha più edizioni: menu, acquisti e costi previsti e reali, collegati al listino del periodo"
        azioni={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setNuovo(eventoVuoto())}>
            Nuovo evento
          </Button>
        }
      />
      {dati.eventi.some((e) => e.archiviato) && (
        <FormControlLabel
          sx={{ mb: 1 }}
          control={<Switch checked={archiviati} onChange={(e) => setArchiviati(e.target.checked)} />}
          label="Mostra eventi archiviati"
        />
      )}

      {schede.length === 0 ? (
        <Card>
          <Vuoto
            icona={<CelebrationOutlined />}
            titolo="Nessun evento"
            testo="Crea un evento (es. Festa del Bosco) e poi aggiungi le sue edizioni anno per anno."
            azione={
              <Button variant="contained" onClick={() => setNuovo(eventoVuoto())}>
                Crea il primo evento
              </Button>
            }
          />
        </Card>
      ) : (
        <Griglia min={300}>
          {schede.map(({ e, edizioni, ultima }) => (
            <Card key={e.id} sx={{ opacity: e.archiviato ? 0.6 : 1 }}>
              <CardActionArea component={Link} href={`/eventi/${e.id}`} sx={{ height: "100%" }}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontSize: 18 }}>
                        {e.nome}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {e.tipologia} · {edizioni.length} {edizioni.length === 1 ? "edizione" : "edizioni"}
                      </Typography>
                    </Box>
                    {e.archiviato && <Etichetta>Archiviato</Etichetta>}
                  </Stack>
                  {edizioni.length > 1 && (
                    <Box sx={{ mt: 1.5 }}>
                      <SparkLineChart data={edizioni.map((x) => x.calc.cassa.netto)} height={44} color="#1a73e8" area curve="natural" />
                    </Box>
                  )}
                  <Divider sx={{ my: 1.5 }} />
                  {ultima ? (
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Ultima edizione
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {ultima.ed.nome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {data(ultima.ed.data)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" color="text.secondary">
                          Netto di cassa
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: ultima.calc.cassa.netto >= 0 ? "success.main" : "error.main" }}>
                          {euro(ultima.calc.cassa.netto)}
                        </Typography>
                      </Box>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Nessuna edizione ancora.
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Griglia>
      )}

      <EventDialog evento={nuovo} onChiudi={() => setNuovo(null)} onCreato={(e) => router.push(`/eventi/${e.id}`)} />
    </>
  );
}
