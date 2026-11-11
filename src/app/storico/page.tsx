"use client";

import { useMemo } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { BarChart } from "@mui/x-charts/BarChart";
import { useGestionale } from "@/components/Gestionale";
import { Intestazione, Sezione, Vuoto } from "@/components/ui";
import { anniDisponibili, annoSociale, calcolaEdizione, nelAnno, riepilogoCassa } from "@/lib/calcoli";
import { data, euro, numero, percento } from "@/lib/format";

export default function Storico() {
  const { dati } = useGestionale();

  const anni = useMemo(
    () =>
      anniDisponibili(dati)
        .slice()
        .sort()
        .map((anno) => {
          const c = riepilogoCassa(anno, dati.impostazioni, dati.movimenti);
          const edizioni = dati.edizioni.filter((e) => nelAnno(e.data, anno)).map((e) => calcolaEdizione(e, dati));
          return {
            anno,
            c,
            ordinaria: dati.movimenti
              .filter((m) => !m.edizioneId && m.stato === "ufficiale" && nelAnno(m.data, anno))
              .reduce((s, m) => s + (m.tipo === "entrata" ? m.importo : -m.importo), 0),
            eventi: edizioni.reduce((s, e) => s + e.cassa.netto, 0),
            nEdizioni: edizioni.length,
          };
        }),
    [dati],
  );

  const edizioni = useMemo(
    () =>
      [...dati.edizioni]
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .map((ed) => ({ ed, evento: dati.eventi.find((e) => e.id === ed.eventoId), calc: calcolaEdizione(ed, dati) })),
    [dati],
  );

  const fmt = (v: number | null) => euro(v ?? 0);

  return (
    <>
      <Intestazione titolo="Storico anni" sottotitolo="Riepilogo calcolato dai movimenti: ogni anno parte dalla chiusura del precedente" />
      {anni.length === 0 ? (
        <Vuoto titolo="Nessun dato" />
      ) : (
        <>
          <Sezione titolo="Saldo a fine anno">
            <BarChart
              height={240}
              xAxis={[{ scaleType: "band", data: anni.map((a) => a.anno) }]}
              yAxis={[{ valueFormatter: (v: number) => `${Math.round(v)} €`, width: 64 }]}
              series={[
                { data: anni.map((a) => a.ordinaria), label: "Gestione ordinaria", color: "#a8c7fa", valueFormatter: fmt, stack: "netto" },
                { data: anni.map((a) => a.eventi), label: "Eventi", color: "#1a73e8", valueFormatter: fmt, stack: "netto" },
                { data: anni.map((a) => a.c.cassa), label: "Cassa a fine anno", color: "#188038", valueFormatter: fmt },
              ]}
              borderRadius={4}
            />
          </Sezione>
          <Sezione titolo="Anni sociali" senzaPadding>
            <Box className="tabella-scroll">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Anno</TableCell>
                    <TableCell className="num">Apertura</TableCell>
                    <TableCell className="num">Entrate</TableCell>
                    <TableCell className="num">Uscite</TableCell>
                    <TableCell className="num">Ordinaria</TableCell>
                    <TableCell className="num">Eventi</TableCell>
                    <TableCell className="num">Chiusura</TableCell>
                    <TableCell className="num">Edizioni</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...anni].reverse().map((a) => (
                    <TableRow key={a.anno}>
                      <TableCell sx={{ fontWeight: 500 }}>{a.anno}</TableCell>
                      <TableCell className="num">{euro(a.c.apertura)}</TableCell>
                      <TableCell className="num">{euro(a.c.entrateUfficiali)}</TableCell>
                      <TableCell className="num">{euro(a.c.usciteUfficiali)}</TableCell>
                      <TableCell className="num">{euro(a.ordinaria)}</TableCell>
                      <TableCell className="num">{euro(a.eventi)}</TableCell>
                      <TableCell className="num" sx={{ fontWeight: 600 }}>
                        {euro(a.c.cassa)}
                      </TableCell>
                      <TableCell className="num">{a.nEdizioni}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Sezione>
          <Sezione titolo="Tutte le edizioni" senzaPadding>
            <Box className="tabella-scroll">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Edizione</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Anno</TableCell>
                    <TableCell className="num">Partecipanti</TableCell>
                    <TableCell className="num">Ricavi menu</TableCell>
                    <TableCell className="num">Margine</TableCell>
                    <TableCell className="num">%</TableCell>
                    <TableCell className="num">Netto cassa</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {edizioni.map(({ ed, evento, calc }) => (
                    <TableRow key={ed.id} hover>
                      <TableCell>
                        <Link href={`/eventi/${ed.eventoId}/${ed.id}`} style={{ fontWeight: 500, textDecoration: "none" }}>
                          {ed.nome}
                        </Link>
                        <Box component="div" sx={{ color: "text.secondary", fontSize: 12 }}>
                          {evento?.nome}
                        </Box>
                      </TableCell>
                      <TableCell>{data(ed.data)}</TableCell>
                      <TableCell>{annoSociale(ed.data)}</TableCell>
                      <TableCell className="num">{numero(ed.partecipantiReali ?? ed.partecipantiPrevisti)}</TableCell>
                      <TableCell className="num">{euro(calc.reale.ricavi)}</TableCell>
                      <TableCell className="num">{euro(calc.reale.margineFinale)}</TableCell>
                      <TableCell className="num">{percento(calc.reale.marginePct)}</TableCell>
                      <TableCell className="num" sx={{ fontWeight: 500 }}>
                        {euro(calc.cassa.netto)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Sezione>
        </>
      )}
    </>
  );
}
