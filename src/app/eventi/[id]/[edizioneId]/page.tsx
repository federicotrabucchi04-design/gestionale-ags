"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import Typography from "@mui/material/Typography";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LockOpenOutlined from "@mui/icons-material/LockOpenOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import MoreVertOutlined from "@mui/icons-material/MoreVertOutlined";
import { useGestionale } from "@/components/Gestionale";
import { Etichetta, Vuoto } from "@/components/ui";
import { annoSociale, calcolaEdizione, fissaValoriMenu } from "@/lib/calcoli";
import { dataLunga } from "@/lib/format";
import { STATI } from "@/lib/stati";
import type { Edizione } from "@/lib/types";
import AcquistiEdizione from "./AcquistiEdizione";
import CostiExtraEdizione from "./CostiExtraEdizione";
import DatiEdizioneDialog from "./DatiEdizioneDialog";
import MenuEdizione from "./MenuEdizione";
import MovimentiEdizione from "./MovimentiEdizione";
import RiepilogoEdizione from "./RiepilogoEdizione";
import type { Aggiorna } from "./tipi";

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
      setBozza(originale);
    }
  }, [originale]);

  useEffect(() => {
    const prima = () => scrivi();
    window.addEventListener("beforeunload", prima);
    return () => {
      window.removeEventListener("beforeunload", prima);
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

const SCHEDE = ["riepilogo", "menu", "acquisti", "extra", "movimenti"] as const;
type Scheda = (typeof SCHEDE)[number];

export default function EdizionePagina() {
  const { id, edizioneId } = useParams<{ id: string; edizioneId: string }>();
  const router = useRouter();
  const { dati, salva, elimina, notifica, conferma } = useGestionale();
  const originale = dati.edizioni.find((e) => e.id === edizioneId);
  const evento = dati.eventi.find((e) => e.id === id);
  const { bozza, aggiorna, inSalvataggio } = useBozza(originale);
  const [scheda, setScheda] = useState<Scheda>("riepilogo");
  const [menuAzioni, setMenuAzioni] = useState<HTMLElement | null>(null);
  const [datiAperti, setDatiAperti] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la query string è disponibile solo dopo l'idratazione
    if (t && (SCHEDE as readonly string[]).includes(t)) setScheda(t as Scheda);
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
  const cambiaScheda = (s: Scheda) => {
    setScheda(s);
    window.history.replaceState(null, "", `?tab=${s}`);
  };

  const chiudi = async () => {
    if (
      await conferma(
        "Chiudere l'edizione?",
        "Prezzi e costi del menu vengono congelati: modifiche future a listini, ricette e materie prime non cambieranno più i conti di questa edizione. Potrai riaprirla.",
        "Chiudi edizione",
      )
    ) {
      aggiorna((e) => ({ stato: "chiusa", menu: fissaValoriMenu(e, dati) }));
      notifica("Edizione chiusa: valori congelati");
    }
  };

  const riapri = () => {
    aggiorna((e) => ({ stato: "conclusa", menu: e.menu.map(({ prezzoFissato, costoFissato, ...r }) => r) }));
    notifica("Edizione riaperta: valori di nuovo collegati al prezziario");
  };

  const eliminaEdizione = async () => {
    const collegati = dati.movimenti.filter((m) => m.edizioneId === bozza.id);
    const testo = collegati.length
      ? `${collegati.length} movimenti collegati resteranno in cassa come gestione ordinaria.`
      : "Menu, acquisti e costi extra di questa edizione verranno eliminati.";
    if (await conferma(`Eliminare ${bozza.nome}?`, testo, "Elimina")) {
      collegati.forEach((m) => salva("movimenti", { ...m, edizioneId: undefined }));
      elimina("edizioni", bozza.id);
      notifica("Edizione eliminata");
      router.push(`/eventi/${id}`);
    }
  };

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
            {dataLunga(bozza.data)} · anno {annoSociale(bozza.data)} · {calc.listino ? `listino ${calc.listino.nome}` : "nessun listino"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
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
                cambiaScheda("menu");
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
            <MenuItem
              onClick={() => {
                setMenuAzioni(null);
                setDatiAperti(true);
              }}
            >
              <ListItemIcon>
                <EditOutlined fontSize="small" />
              </ListItemIcon>
              Dati edizione
            </MenuItem>
            {bozza.stato !== "pianificata" && (
              <MenuItem
                onClick={() => {
                  setMenuAzioni(null);
                  aggiorna((e) => ({ stato: "pianificata", menu: e.menu.map(({ prezzoFissato, costoFissato, ...r }) => r) }));
                }}
              >
                <ListItemIcon>
                  <EditOutlined fontSize="small" />
                </ListItemIcon>
                Riporta a pianificata
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setMenuAzioni(null);
                void eliminaEdizione();
              }}
              sx={{ color: "error.main" }}
            >
              <ListItemIcon>
                <DeleteOutlined fontSize="small" color="error" />
              </ListItemIcon>
              Elimina edizione
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {stato.spiegazione}
      </Typography>

      <Card sx={{ mb: 3, position: "sticky", top: { xs: 56, sm: 64 }, zIndex: 2 }}>
        <Tabs value={scheda} onChange={(_, v) => cambiaScheda(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab value="riepilogo" label="Riepilogo" />
          <Tab value="menu" label={`Menu (${bozza.menu.length})`} />
          <Tab value="acquisti" label={`Acquisti (${bozza.acquisti.length})`} />
          <Tab value="extra" label={`Costi extra (${bozza.costiExtra.length})`} />
          <Tab value="movimenti" label={`Movimenti (${dati.movimenti.filter((m) => m.edizioneId === bozza.id).length})`} />
        </Tabs>
      </Card>

      {scheda === "riepilogo" && <RiepilogoEdizione ed={bozza} calc={calc} vai={cambiaScheda} />}
      {scheda === "menu" && <MenuEdizione ed={bozza} calc={calc} aggiorna={aggiorna} />}
      {scheda === "acquisti" && <AcquistiEdizione ed={bozza} calc={calc} aggiorna={aggiorna} />}
      {scheda === "extra" && <CostiExtraEdizione ed={bozza} calc={calc} aggiorna={aggiorna} />}
      {scheda === "movimenti" && <MovimentiEdizione ed={bozza} calc={calc} />}

      <DatiEdizioneDialog aperto={datiAperti} ed={bozza} aggiorna={aggiorna} onChiudi={() => setDatiAperti(false)} />
    </>
  );
}
