"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PostAddOutlined from "@mui/icons-material/PostAddOutlined";
import { useGestionale } from "@/components/Gestionale";
import MovimentoDialog, { movimentoVuoto } from "@/components/MovimentoDialog";
import { CampoNumero, RigaValore, Sezione } from "@/components/ui";
import { storicoParte } from "@/lib/calcoli";
import { ingressoVuoto } from "@/lib/modelli";
import { euro, numero, percento } from "@/lib/format";
import type { Ingresso, Movimento } from "@/lib/types";
import { Storico } from "./MenuEdizione";
import type { PropsParte } from "./tipi";

export default function IngressoParte({ ed, parte, calc, aggiornaParte }: PropsParte) {
  const { dati } = useGestionale();
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const ing = parte.ingresso ?? ingressoVuoto();
  const coperti = parte.tipo === "servizio";
  const et = coperti
    ? { prezzo: "Prezzo menu fisso", unita: "coperti", previsti: "Coperti previsti", pre: "Prevendite", giorno: "Venduti la sera", presenze: "Persone sedute" }
    : { prezzo: "Quota d'iscrizione", unita: "iscritti", previsti: "Iscritti previsti", pre: "Iscrizioni anticipate", giorno: "Iscrizioni sul posto", presenze: "Partecipanti presenti" };

  const storico = useMemo(
    () => storicoParte(ed, dati.edizioni, parte.nome, (p) => (p.ingresso ? (p.ingresso.prevendite || 0) + (p.ingresso.venditeGiorno || 0) : undefined)),
    [ed, dati.edizioni, parte.nome],
  );

  const set = (patch: Partial<Ingresso>) => aggiornaParte((p) => ({ ingresso: { ...(p.ingresso ?? ingressoVuoto()), ...patch } }));
  const paganti = (ing.prevendite || 0) + (ing.venditeGiorno || 0);
  const assenti = paganti - (ing.presenze || 0);

  return (
    <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" } }}>
      <Card>
        <CardContent>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" } }}>
            <CampoNumero label={et.prezzo} euro valore={ing.prezzo} onCambia={(v) => set({ prezzo: v })} />
            <Box>
              <CampoNumero label={et.previsti} valore={ing.previsti} onCambia={(v) => set({ previsti: v })} fullWidth />
              <Storico dato={storico} um={et.unita} onUsa={(v) => set({ previsti: v })} />
            </Box>
            <Box sx={{ display: { xs: "none", md: "block" } }} />
            <CampoNumero label={et.pre} valore={ing.prevendite} onCambia={(v) => set({ prevendite: v })} />
            <CampoNumero label={et.giorno} valore={ing.venditeGiorno} onCambia={(v) => set({ venditeGiorno: v })} />
            <CampoNumero label={et.presenze} valore={ing.presenze} onCambia={(v) => set({ presenze: v })} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {coperti
              ? "Il ricavo della cena è prezzo × coperti pagati (prevendite + sera). I piatti serviti contano solo come costo nella scheda Piatti."
              : "La quota è l'unico ricavo: il cibo delle tappe conta solo come costo."}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              startIcon={<PostAddOutlined />}
              disabled={!paganti || !ing.prezzo}
              onClick={() =>
                setMovimento(
                  movimentoVuoto({
                    descrizione: `${coperti ? "Incasso" : "Iscrizioni"} ${parte.nome} - ${ed.nome}`,
                    tipo: "entrata",
                    importo: paganti * ing.prezzo,
                    stato: "ufficiale",
                    categoria: "Incassi evento",
                    edizioneId: ed.id,
                    data: ed.data,
                  }),
                )
              }
            >
              Registra l&apos;incasso nei movimenti
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Sezione titolo="Riepilogo">
        <RigaValore etichetta={`Incasso previsto (${numero(ing.previsti)} ${et.unita})`} valore={euro(calc.previsto.ingressi)} />
        <RigaValore etichetta={`Incasso reale (${numero(paganti)} ${et.unita})`} valore={euro(calc.reale.ingressi)} forte />
        <RigaValore etichetta="Quota in prevendita" valore={percento(paganti ? ing.prevendite / paganti : undefined)} />
        <RigaValore etichetta="Rispetto al previsto" valore={percento(ing.previsti ? paganti / ing.previsti : undefined)} />
        {ing.presenze > 0 && (
          <RigaValore
            etichetta={assenti >= 0 ? "Pagati ma assenti" : "Presenti senza biglietto"}
            valore={numero(Math.abs(assenti))}
            tono={assenti < 0 ? "negativo" : undefined}
          />
        )}
        {calc.reale.costoMenu > 0 && paganti > 0 && (
          <RigaValore etichetta={`Costo cibo per ${coperti ? "coperto" : "iscritto"}`} valore={euro(calc.reale.costoMenu / paganti)} />
        )}
      </Sezione>
      <MovimentoDialog movimento={movimento} onChiudi={() => setMovimento(null)} />
    </Box>
  );
}
