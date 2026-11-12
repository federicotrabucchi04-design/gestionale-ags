"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LockOpenOutlined from "@mui/icons-material/LockOpenOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import MoreVertOutlined from "@mui/icons-material/MoreVertOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import TableViewOutlined from "@mui/icons-material/TableViewOutlined";
import ChecklistEdizione from "@/components/ChecklistEdizione";
import { useGestionale } from "@/components/Gestionale";
import ListaSpesa from "@/components/ListaSpesa";
import { Etichetta, Vuoto } from "@/components/ui";
import {
  annoSociale,
  calcolaEdizione,
  fissaValori,
  movimentoSuEdizione,
  normalizzaQuoteMovimento,
  sbloccaValori,
} from "@/lib/calcoli";
import { checklistEdizione } from "@/lib/checklist";
import { esportaEdizioneExcel } from "@/lib/export";
import { dataLunga, euro } from "@/lib/format";
import { TIPI_EVENTO, copiaPrevistiSuReali, schermate } from "@/lib/modelli";
import { STATI } from "@/lib/stati";
import type { Edizione, Parte } from "@/lib/types";
import CostiComuni from "./CostiComuni";
import DatiEdizioneDialog from "./DatiEdizioneDialog";
import MovimentiEdizione from "./MovimentiEdizione";
import { SchermataEdizione, SezioneParte, SolaLettura, sezioniParte, type IdSezione } from "./ParteEdizione";
import RiepilogoEdizione from "./RiepilogoEdizione";
import StrutturaDialog from "./StrutturaDialog";
import type { Aggiorna, PropsParte } from "./tipi";

/** Local draft of the edition, saved automatically shortly after each change. */
function useBozza(originale: Edizione | undefined) {
  const { salva } = useGestionale();
  const [bozza, setBozza] = useState(originale);
  const rif = useRef(originale);
  const sporca = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [inSalvataggio, setInSalvataggio] = useState(false);

  const scrivi = useCallback(() => {
    if (!sporca.current || !rif.current) return;
    salva("edizioni", rif.current);
    sporca.current = false;
    setInSalvataggio(false);
  }, [salva]);

  useEffect(() => {
    if (!sporca.current) {
      rif.current = originale;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- allinea la bozza ai dati arrivati dal database quando non ci sono modifiche locali
      setBozza(originale);
    }
  }, [originale]);

  useEffect(() => {
    const prima = () => scrivi();
    window.addEventListener("beforeunload", prima);
    window.addEventListener("pagehide", prima);
    return () => {
      window.removeEventListener("beforeunload", prima);
      window.removeEventListener("pagehide", prima);
      clearTimeout(timer.current);
      scrivi();
    };
  }, [scrivi]);

  const aggiorna: Aggiorna = (patch) => {
    if (!rif.current) return;
    const corrente = rif.current;
    const nuovo = { ...corrente, ...(typeof patch === "function" ? patch(corrente) : patch) };
    rif.current = nuovo;
    sporca.current = true;
    setBozza(nuovo);
    setInSalvataggio(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(scrivi, 700);
  };

  return { bozza, aggiorna, inSalvataggio };
}

export default function EdizionePagina() {
  const { id, edizioneId } = useParams<{ id: string; edizioneId: string }>();
  const router = useRouter();
  const { dati, salva, elimina, notifica, conferma } = useGestionale();
  const originale = dati.edizioni.find((e) => e.id === edizioneId);
  const evento = dati.eventi.find((e) => e.id === id);
  const { bozza, aggiorna, inSalvataggio } = useBozza(originale);
  const [scheda, setScheda] = useState("riepilogo");
  const [menuAzioni, setMenuAzioni] = useState<HTMLElement | null>(null);
  const [datiAperti, setDatiAperti] = useState(false);
  const [strutturaAperta, setStrutturaAperta] = useState(false);
  const [spesa, setSpesa] = useState(false);
  const [vistaPrev, setVistaPrev] = useState<boolean | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la query string è disponibile solo dopo l'idratazione
    if (t) setScheda(t);
  }, []);

  const calc = useMemo(() => (bozza ? calcolaEdizione(bozza, dati) : undefined), [bozza, dati]);

  if (!bozza || !calc || !evento)
    return (
      <Vuoto
        titolo="Edizione non trovata"
        azione={
          <Button component={Link} href={`/eventi/${id}`}>
            Torna all&apos;evento
          </Button>
        }
      />
    );

  const stato = STATI[bozza.stato];
  const bloccata = bozza.stato === "chiusa";
  const previsione = vistaPrev ?? bozza.stato === "pianificata";
  const elenco = schermate(bozza);
  const piatta = elenco.length === 1 && elenco[0].parti.length === 1 && !bozza.serate?.length;
  const unica = piatta ? elenco[0].parti[0] : undefined;
  const mostraComuni = calc.unita.length > 1 || bozza.comuni.length > 0;
  const nMovimenti = dati.movimenti.filter((m) => movimentoSuEdizione(m, bozza.id)).length;
  const passi = checklistEdizione(bozza, calc, dati.movimenti);

  const schede: { id: string; etichetta: string }[] = [
    { id: "riepilogo", etichetta: "Riepilogo" },
    ...(unica ? sezioniParte(unica).map((s) => ({ id: `s:${s.id}`, etichetta: s.etichetta })) : elenco.map((s) => ({ id: s.id, etichetta: s.nome }))),
    ...(mostraComuni ? [{ id: "comuni", etichetta: `Costi comuni (${bozza.comuni.length})` }] : []),
    { id: "movimenti", etichetta: `Movimenti (${nMovimenti})` },
  ];
  const schedaValida = schede.some((s) => s.id === scheda) ? scheda : "riepilogo";

  const cambiaScheda = (s: string) => {
    const vecchie: Record<string, string> = { menu: "s:menu", acquisti: "s:acquisti", extra: "s:extra" };
    const v = unica && vecchie[s] ? vecchie[s] : s;
    setScheda(v);
    window.history.replaceState(null, "", `?tab=${encodeURIComponent(v)}`);
  };

  const propsParte = (p: Parte): PropsParte => ({
    ed: bozza,
    parte: p,
    calc: calc.parti.find((c) => c.parte.id === p.id)!,
    calcEd: calc,
    bloccata,
    aggiornaParte: (patch) => aggiorna((e) => ({ parti: e.parti.map((x) => (x.id === p.id ? { ...x, ...(typeof patch === "function" ? patch(x) : patch) } : x)) })),
  });

  const chiudi = async () => {
    const gap = Math.abs(calc.quadratura.ricavi);
    const avvisi = [...calc.avvisi];
    if (gap > 20) avvisi.unshift(`Incassi e ricavi differiscono di ${euro(gap)}`);
    if (calc.cassa.uscitePreviste > 0) avvisi.unshift(`Ci sono ancora ${euro(calc.cassa.uscitePreviste)} di uscite previste da pagare`);
    const extra =
      avvisi.length > 0
        ? `\n\nAttenzione:\n• ${avvisi.slice(0, 5).join("\n• ")}${avvisi.length > 5 ? `\n• …e altri ${avvisi.length - 5}` : ""}`
        : "";
    if (
      await conferma(
        "Chiudere l'edizione?",
        `Prezzi e costi vengono congelati e l'edizione diventa di sola lettura: modifiche future a listini, ricette e prezzi non cambieranno più i suoi conti. Potrai riaprirla.${extra}`,
        avvisi.length ? "Chiudi comunque" : "Chiudi edizione",
      )
    ) {
      aggiorna((e) => ({ stato: "chiusa", parti: fissaValori(e, dati) }));
      notifica("Edizione chiusa: valori congelati");
    }
  };

  const riapri = () => {
    aggiorna((e) => ({ stato: "conclusa", parti: sbloccaValori(e.parti) }));
    notifica("Edizione riaperta: valori di nuovo collegati al prezziario");
  };

  const eliminaEdizione = async () => {
    const collegati = dati.movimenti.filter((m) => movimentoSuEdizione(m, bozza.id));
    const testo = collegati.length
      ? `${collegati.length} movimenti collegati perderanno la quota su questa edizione (restano in cassa).`
      : "Menu, acquisti e costi di questa edizione verranno eliminati.";
    if (await conferma(`Eliminare ${bozza.nome}?`, testo, "Elimina")) {
      collegati.forEach((m) => {
        const quote = (m.quote?.length ? m.quote : m.edizioneId ? [{ edizioneId: m.edizioneId, importo: m.importo }] : []).filter(
          (q) => q.edizioneId !== bozza.id,
        );
        salva("movimenti", normalizzaQuoteMovimento({ ...m, quote, edizioneId: undefined }));
      });
      elimina("edizioni", bozza.id);
      notifica("Edizione eliminata");
      router.push(`/eventi/${id}`);
    }
  };

  const voceMenu = (icona: ReactNode, testo: string, azione: () => void, colore?: string) => (
    <MenuItem
      onClick={() => {
        setMenuAzioni(null);
        azione();
      }}
      sx={colore ? { color: colore } : undefined}
    >
      <ListItemIcon>{icona}</ListItemIcon>
      {testo}
    </MenuItem>
  );

  let contenuto: ReactNode;
  if (schedaValida === "riepilogo") contenuto = <RiepilogoEdizione ed={bozza} calc={calc} vai={cambiaScheda} />;
  else if (schedaValida === "movimenti") contenuto = <MovimentiEdizione ed={bozza} calc={calc} />;
  else if (schedaValida === "comuni")
    contenuto = (
      <SolaLettura attiva={bloccata}>
        <CostiComuni ed={bozza} calc={calc} aggiorna={aggiorna} />
      </SolaLettura>
    );
  else if (unica && schedaValida.startsWith("s:")) contenuto = <SezioneParte sezione={schedaValida.slice(2) as IdSezione} {...propsParte(unica)} />;
  else {
    const s = elenco.find((x) => x.id === schedaValida)!;
    const u = calc.unita.find((x) => x.id === s.id);
    contenuto = (
      <SchermataEdizione
        key={s.id}
        schermata={s}
        calcParti={calc.parti}
        props={propsParte}
        previsione={previsione}
        unita={s.serata && u ? (previsione ? u.previsto : u.reale) : undefined}
      />
    );
  }

  return (
    <>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link href="/eventi">Eventi</Link>
        <Link href={`/eventi/${evento.id}`}>{evento.nome}</Link>
        <Typography color="text.primary">{bozza.nome}</Typography>
      </Breadcrumbs>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, justifyContent: "space-between", alignItems: { sm: "center" } }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 26, sm: 32 } }}>
              {bozza.nome}
            </Typography>
            <Etichetta tono={stato.tono}>{stato.etichetta}</Etichetta>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {TIPI_EVENTO[evento.tipo]?.etichetta} · {dataLunga(bozza.data)} · anno {annoSociale(bozza.data)}
            {calc.menu.some((m) => !m.offerto) && ` · ${calc.listino ? `listino ${calc.listino.nome}` : "nessun listino"}`}
            {bozza.presepe && ` · presepe ${bozza.presepe}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Chip
            size="small"
            variant="outlined"
            icon={inSalvataggio ? <CloudSyncOutlined /> : <CloudDoneOutlined />}
            label={inSalvataggio ? "Salvataggio..." : "Salvato"}
          />
          {bozza.stato === "pianificata" && (
            <Button
              variant="contained"
              startIcon={<CheckCircleOutlined />}
              onClick={() => {
                aggiorna({ stato: "conclusa" });
                setVistaPrev(false);
                notifica("Edizione conclusa: inserisci le quantità reali");
              }}
            >
              Segna conclusa
            </Button>
          )}
          {bozza.stato === "conclusa" && (
            <Button variant="outlined" startIcon={<LockOutlined />} onClick={chiudi}>
              Chiudi edizione
            </Button>
          )}
          {bozza.stato === "chiusa" && (
            <Button variant="outlined" startIcon={<LockOpenOutlined />} onClick={riapri}>
              Riapri
            </Button>
          )}
          <IconButton onClick={(e) => setMenuAzioni(e.currentTarget)} aria-label="Altre azioni">
            <MoreVertOutlined />
          </IconButton>
          <Menu anchorEl={menuAzioni} open={!!menuAzioni} onClose={() => setMenuAzioni(null)}>
            {!bloccata && voceMenu(<EditOutlined fontSize="small" />, "Dati edizione", () => setDatiAperti(true))}
            {!bloccata && voceMenu(<AccountTreeOutlined fontSize="small" />, "Struttura: serate e parti", () => setStrutturaAperta(true))}
            {!bloccata &&
              voceMenu(<ContentCopyOutlined fontSize="small" />, "Copia previsti → reali", async () => {
                if (
                  await conferma(
                    "Copiare i previsti sui reali?",
                    "Le quantità e gli importi previsti vengono copiati nei campi reali dove questi sono ancora a zero. Puoi correggerli dopo.",
                    "Copia",
                  )
                ) {
                  aggiorna((e) => copiaPrevistiSuReali(e));
                  setVistaPrev(false);
                  notifica("Previsti copiati sui reali");
                }
              })}
            {voceMenu(<ShoppingCartOutlined fontSize="small" />, "Lista della spesa", () => setSpesa(true))}
            {voceMenu(<PrintOutlined fontSize="small" />, "Stampa o PDF", () => window.open(`/stampa?edizione=${bozza.id}`, "_blank"))}
            {voceMenu(<TableViewOutlined fontSize="small" />, "Excel completo", () => void esportaEdizioneExcel(bozza, calc, dati, true))}
            {voceMenu(<TableViewOutlined fontSize="small" />, "Excel sintetico", () => void esportaEdizioneExcel(bozza, calc, dati, false))}
            {bozza.stato !== "pianificata" &&
              voceMenu(<EditOutlined fontSize="small" />, "Riporta a pianificata", () => aggiorna((e) => ({ stato: "pianificata", parti: sbloccaValori(e.parti) })))}
            {voceMenu(<DeleteOutlined fontSize="small" color="error" />, "Elimina edizione", () => void eliminaEdizione(), "error.main")}
          </Menu>
        </Stack>
      </Stack>

      {bloccata ? (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button onClick={riapri}>Riapri</Button>}>
          Edizione chiusa: i dati sono in sola lettura. Riaprila per correggere qualcosa.
        </Alert>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {stato.spiegazione}
        </Typography>
      )}

      {!bloccata && (
        <ChecklistEdizione
          passi={passi}
          onVai={(s) => {
            if (!unica && s.startsWith("s:")) {
              const prima = elenco[0]?.id;
              if (prima) cambiaScheda(prima);
              return;
            }
            cambiaScheda(s);
          }}
        />
      )}

      <Card sx={{ mb: 3, position: "sticky", top: { xs: 56, sm: 64 }, zIndex: 2, display: "flex", alignItems: "center" }}>
        <Tabs value={schedaValida} onChange={(_, v) => cambiaScheda(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ flex: 1, minWidth: 0 }}>
          {schede.map((s) => (
            <Tab key={s.id} value={s.id} label={s.etichetta} />
          ))}
        </Tabs>
        {!unica && elenco.some((s) => s.id === schedaValida) && (
          <ToggleButtonGroup size="small" exclusive value={previsione ? "p" : "r"} onChange={(_, v) => v && setVistaPrev(v === "p")} sx={{ mx: 1, display: { xs: "none", sm: "flex" } }}>
            <ToggleButton value="p">Previsto</ToggleButton>
            <ToggleButton value="r">Reale</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Card>

      {contenuto}

      <DatiEdizioneDialog aperto={datiAperti} ed={bozza} aggiorna={aggiorna} onChiudi={() => setDatiAperti(false)} />
      <StrutturaDialog
        ed={bozza}
        aperto={strutturaAperta}
        onChiudi={() => setStrutturaAperta(false)}
        onApplica={(s) => {
          aggiorna(s);
          setStrutturaAperta(false);
          notifica("Struttura aggiornata");
        }}
      />
      <ListaSpesa aperta={spesa} ed={bozza} calc={calc} onChiudi={() => setSpesa(false)} />
    </>
  );
}
