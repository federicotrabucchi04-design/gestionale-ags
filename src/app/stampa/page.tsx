"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import { useGestionale } from "@/components/Gestionale";
import { calcolaEdizione } from "@/lib/calcoli";
import { esportaAnnoExcel, esportaEdizioneExcel } from "@/lib/export";
import { data as fmtData, dataLunga, euro, percento } from "@/lib/format";
import { TIPI_EVENTO } from "@/lib/modelli";
import { bilancioAnno, contoEconomico } from "@/lib/report";

export default function StampaPagina() {
  const { dati, anno } = useGestionale();
  const sp = useSearchParams();
  const edizioneId = sp.get("edizione") ?? "";
  const [completo, setCompleto] = useState(sp.get("completo") !== "0");

  const ed = dati.edizioni.find((e) => e.id === edizioneId);
  const evento = ed ? dati.eventi.find((e) => e.id === ed.eventoId) : undefined;
  const calc = useMemo(() => (ed ? calcolaEdizione(ed, dati) : undefined), [ed, dati]);
  const bil = useMemo(() => (!ed ? bilancioAnno(anno, dati) : undefined), [ed, anno, dati]);

  const titolo = ed ? `${ed.nome} · ${fmtData(ed.data)}` : `Bilancio anno sociale ${anno}`;

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, sm: 3 }, "@media print": { p: 0, maxWidth: "none" } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 3, alignItems: { sm: "center" }, justifyContent: "space-between", "@media print": { display: "none" } }}
      >
        <Typography variant="h5">Stampa / PDF</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          <FormControlLabel control={<Switch checked={completo} onChange={(e) => setCompleto(e.target.checked)} />} label="Versione completa" />
          <Button
            variant="outlined"
            startIcon={<DownloadOutlined />}
            onClick={() => void (ed && calc ? esportaEdizioneExcel(ed, calc, dati, completo) : esportaAnnoExcel(anno, dati, completo))}
          >
            Excel
          </Button>
          <Button variant="contained" startIcon={<PrintOutlined />} onClick={() => window.print()}>
            Stampa o salva PDF
          </Button>
        </Stack>
      </Stack>

      <Typography variant="overline" color="text.secondary">
        Gestionale AGS
      </Typography>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        {titolo}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {ed
          ? `${TIPI_EVENTO[evento?.tipo ?? "altro"]?.etichetta ?? ""} · ${evento?.nome ?? ""} · stampato il ${dataLunga(new Date().toISOString().slice(0, 10))}`
          : `Stampato il ${dataLunga(new Date().toISOString().slice(0, 10))} · ${completo ? "completo" : "sintetico"}`}
      </Typography>

      {ed && calc && (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Conto economico
          </Typography>
          <Table size="small" sx={{ mb: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell>Voce</TableCell>
                <TableCell align="right">Previsto</TableCell>
                <TableCell align="right">Reale</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contoEconomico(calc).map((r) => (
                <TableRow key={r.voce} sx={r.forte ? { bgcolor: "#f8f9fb" } : undefined}>
                  <TableCell sx={{ fontWeight: r.forte ? 700 : 400 }}>{r.voce}</TableCell>
                  <TableCell align="right">{r.pct ? percento(r.previsto) : euro(r.previsto)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: r.forte ? 700 : 400 }}>
                    {r.pct ? percento(r.reale) : euro(r.reale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {calc.unita.length > 1 && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Serate e parti
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell align="right">Ricavi</TableCell>
                    <TableCell align="right">Costi</TableCell>
                    <TableCell align="right">Comuni</TableCell>
                    <TableCell align="right">Margine</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {calc.unita.map((u) => {
                    const v = calc.haReali ? u.reale : u.previsto;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>{u.nome}</TableCell>
                        <TableCell align="right">{euro(v.ricavi)}</TableCell>
                        <TableCell align="right">{euro(v.costi)}</TableCell>
                        <TableCell align="right">{euro(v.comuni)}</TableCell>
                        <TableCell align="right">{euro(v.margine)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}

          {completo && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Cassa
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  <TableRow>
                    <TableCell>Entrate ufficiali</TableCell>
                    <TableCell align="right">{euro(calc.cassa.entrateUfficiali)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Uscite ufficiali</TableCell>
                    <TableCell align="right">{euro(-calc.cassa.usciteUfficiali)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Netto</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {euro(calc.cassa.netto)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {calc.menu.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Menu
                  </Typography>
                  <Table size="small" sx={{ mb: 3 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Articolo</TableCell>
                        <TableCell align="right">Qtà</TableCell>
                        <TableCell align="right">Ricavo</TableCell>
                        <TableCell align="right">Margine</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calc.menu.map((m) => (
                        <TableRow key={m.riga.id}>
                          <TableCell>{m.articolo?.nome}</TableCell>
                          <TableCell align="right">{calc.haReali ? m.reale.qta : m.previsto.qta}</TableCell>
                          <TableCell align="right">{euro(calc.haReali ? m.reale.ricavo : m.previsto.ricavo)}</TableCell>
                          <TableCell align="right">{euro(calc.haReali ? m.reale.margineDopoExtra : m.previsto.margineDopoExtra)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </>
          )}
        </>
      )}

      {bil && (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Cassa
          </Typography>
          <Table size="small" sx={{ mb: 3 }}>
            <TableBody>
              {[
                ["Apertura", bil.cassa.apertura],
                ["Entrate ufficiali", bil.cassa.entrateUfficiali],
                ["Uscite ufficiali", -bil.cassa.usciteUfficiali],
                ["Cassa attuale", bil.cassa.cassa],
                ["Disponibilità netta", bil.cassa.disponibilitaNetta],
              ].map(([voce, v]) => (
                <TableRow key={String(voce)}>
                  <TableCell>{voce}</TableCell>
                  <TableCell align="right">{euro(v as number)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Eventi dell&apos;anno
          </Typography>
          <Table size="small" sx={{ mb: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Edizione</TableCell>
                <TableCell align="right">Ricavi</TableCell>
                <TableCell align="right">Margine</TableCell>
                <TableCell align="right">Netto cassa</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bil.eventi.map((e) => {
                const t = e.calc.haReali ? e.calc.reale : e.calc.previsto;
                return (
                  <TableRow key={e.edizione.id}>
                    <TableCell>{fmtData(e.edizione.data)}</TableCell>
                    <TableCell>{e.edizione.nome}</TableCell>
                    <TableCell align="right">{euro(t.ricavi)}</TableCell>
                    <TableCell align="right">{euro(t.margineFinale)}</TableCell>
                    <TableCell align="right">{euro(e.calc.cassa.netto)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {completo && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Per categoria
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Categoria</TableCell>
                    <TableCell align="right">Entrate</TableCell>
                    <TableCell align="right">Uscite</TableCell>
                    <TableCell align="right">Netto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bil.categorie.map((c) => (
                    <TableRow key={c.categoria}>
                      <TableCell>{c.categoria}</TableCell>
                      <TableCell align="right">{euro(c.entrate)}</TableCell>
                      <TableCell align="right">{euro(c.uscite)}</TableCell>
                      <TableCell align="right">{euro(c.entrate - c.uscite)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </>
      )}
    </Box>
  );
}
