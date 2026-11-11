"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import { archivio, TUTTE_LE_COLLEZIONI, type Collezione } from "@/lib/archivio";
import { annoSociale, oggiISO } from "@/lib/calcoli";
import { firebaseAuth, firebaseConfigurato } from "@/lib/firebase";
import {
  ACCESSO_DEFAULT,
  DATI_VUOTI,
  IMPOSTAZIONI_DEFAULT,
  type Accesso,
  type Dati,
  type Impostazioni,
  type NomeCollezione,
} from "@/lib/types";

type Elemento<C extends NomeCollezione> = Dati[C][number];

interface Contesto {
  dati: Dati;
  utente: { email: string; nome?: string; foto?: string } | null;
  locale: boolean;
  anno: string;
  setAnno: (a: string) => void;
  salva: <C extends NomeCollezione>(coll: C, el: Elemento<C>) => void;
  elimina: (coll: NomeCollezione, id: string) => void;
  salvaImpostazioni: (patch: Partial<Impostazioni>) => void;
  salvaAccesso: (a: Accesso) => void;
  sostituisciTutto: (dati: Partial<Dati>) => Promise<void>;
  notifica: (msg: string, tipo?: "success" | "error" | "info") => void;
  conferma: (titolo: string, testo: string, etichetta?: string) => Promise<boolean>;
  esci: () => void;
}

const Ctx = createContext<Contesto | null>(null);

export function useGestionale(): Contesto {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGestionale fuori dal provider");
  return c;
}

function Caricamento({ testo }: { testo: string }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <Box sx={{ textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          {testo}
        </Typography>
      </Box>
    </Box>
  );
}

function Accedi({ errore, onAccedi }: { errore?: string; onAccedi: () => void }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
      <Paper variant="outlined" sx={{ p: { xs: 4, sm: 6 }, maxWidth: 420, width: "100%", textAlign: "center" }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "20px",
            bgcolor: "primary.main",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            mx: "auto",
            mb: 3,
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          AGS
        </Box>
        <Typography variant="h5" gutterBottom>
          Gestionale AGS
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Cassa, eventi, prezziario e magazzino dell&apos;associazione.
        </Typography>
        {errore && (
          <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>
            {errore}
          </Alert>
        )}
        <Button variant="contained" size="large" onClick={onAccedi} fullWidth>
          Accedi con Google
        </Button>
      </Paper>
    </Box>
  );
}

const CHIAVE_ANNO = "gestionale-ags:anno";

export function GestionaleProvider({ children }: { children: ReactNode }) {
  const [utente, setUtente] = useState<User | null | undefined>(firebaseConfigurato ? undefined : null);
  const [erroreAccesso, setErroreAccesso] = useState<string>();
  const [dati, setDati] = useState<Dati>(DATI_VUOTI);
  const [caricate, setCaricate] = useState<Set<Collezione>>(new Set());
  // Empty until mounted: the app is browser-only (login, local cache, today's date).
  const [anno, setAnnoState] = useState("");
  const [avviso, setAvviso] = useState<{ msg: string; tipo: "success" | "error" | "info" } | null>(null);
  const [dialogo, setDialogo] = useState<{ titolo: string; testo: string; etichetta: string } | null>(null);
  const risolvi = useRef<(v: boolean) => void>(undefined);

  const abilitato = !!anno && (!firebaseConfigurato || !!utente);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage non esiste durante il prerender
    setAnnoState(localStorage.getItem(CHIAVE_ANNO) || annoSociale(oggiISO()));
  }, []);

  useEffect(() => {
    if (!firebaseConfigurato) return;
    return onAuthStateChanged(firebaseAuth(), (u) => setUtente(u));
  }, []);

  useEffect(() => {
    if (!abilitato) return;
    const stop = TUTTE_LE_COLLEZIONI.map((coll) =>
      archivio.ascolta(
        coll,
        (docs) => {
          setDati((prec) => {
            if (coll === "config") {
              const imp = docs.find((d) => d.id === "impostazioni") as Partial<Impostazioni> | undefined;
              const acc = docs.find((d) => d.id === "accesso") as Accesso | undefined;
              return {
                ...prec,
                impostazioni: { ...IMPOSTAZIONI_DEFAULT, ...imp, id: "impostazioni" },
                accesso: acc ?? ACCESSO_DEFAULT,
              };
            }
            return { ...prec, [coll]: docs };
          });
          setCaricate((s) => (s.has(coll) ? s : new Set(s).add(coll)));
        },
        (e) => {
          if (String(e.message).toLowerCase().includes("permission")) {
            setErroreAccesso("Questo account Google non è autorizzato. Chiedi a un amministratore di aggiungerti.");
            if (firebaseConfigurato) void signOut(firebaseAuth());
          } else setAvviso({ msg: `Errore di sincronizzazione: ${e.message}`, tipo: "error" });
        },
      ),
    );
    return () => stop.forEach((s) => s());
  }, [abilitato]);

  const notifica = useCallback<Contesto["notifica"]>((msg, tipo = "success") => setAvviso({ msg, tipo }), []);

  const errore = useCallback(
    (e: unknown) => notifica(`Salvataggio non riuscito: ${e instanceof Error ? e.message : String(e)}`, "error"),
    [notifica],
  );

  const valore = useMemo<Contesto>(
    () => ({
      dati,
      utente: firebaseConfigurato
        ? utente
          ? { email: utente.email ?? "", nome: utente.displayName ?? undefined, foto: utente.photoURL ?? undefined }
          : null
        : { email: "Modalità locale" },
      locale: archivio.locale,
      anno,
      setAnno: (a) => {
        setAnnoState(a);
        localStorage.setItem(CHIAVE_ANNO, a);
      },
      salva: (coll, el) => {
        archivio.salva(coll, el as never).catch(errore);
      },
      elimina: (coll, id) => {
        archivio.elimina(coll, id).catch(errore);
      },
      salvaImpostazioni: (patch) => {
        archivio.salva("config", { ...dati.impostazioni, ...patch, id: "impostazioni" } as never).catch(errore);
      },
      salvaAccesso: (a) => {
        archivio.salva("config", a as never).catch(errore);
      },
      sostituisciTutto: async (nuovi) => {
        const { impostazioni, accesso, ...colls } = nuovi;
        const payload: Record<string, unknown[]> = { ...colls };
        const config: unknown[] = [];
        if (impostazioni) config.push(impostazioni);
        if (accesso) config.push(accesso);
        if (config.length) payload.config = config;
        await archivio.sostituisciTutto(payload as never);
      },
      notifica,
      conferma: (titolo, testo, etichetta = "Conferma") =>
        new Promise<boolean>((res) => {
          risolvi.current = res;
          setDialogo({ titolo, testo, etichetta });
        }),
      esci: () => {
        if (firebaseConfigurato) void signOut(firebaseAuth());
      },
    }),
    [dati, utente, anno, errore, notifica],
  );

  const chiudiDialogo = (v: boolean) => {
    risolvi.current?.(v);
    setDialogo(null);
  };

  if (!anno || utente === undefined) return <Caricamento testo="Avvio..." />;
  if (firebaseConfigurato && !utente)
    return (
      <Accedi
        errore={erroreAccesso}
        onAccedi={() => {
          setErroreAccesso(undefined);
          signInWithPopup(firebaseAuth(), new GoogleAuthProvider()).catch((e: Error) => {
            if (!String(e.message).includes("popup-closed")) setErroreAccesso(`Accesso non riuscito: ${e.message}`);
          });
        }}
      />
    );
  if (caricate.size < TUTTE_LE_COLLEZIONI.length) return <Caricamento testo="Carico i dati..." />;

  return (
    <Ctx.Provider value={valore}>
      {children}
      <Snackbar
        open={!!avviso}
        autoHideDuration={avviso?.tipo === "error" ? 8000 : 3000}
        onClose={() => setAvviso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: { xs: 90, md: 24 } }}
      >
        <Alert severity={avviso?.tipo ?? "success"} variant="filled" onClose={() => setAvviso(null)} sx={{ width: "100%" }}>
          {avviso?.msg}
        </Alert>
      </Snackbar>
      <Dialog open={!!dialogo} onClose={() => chiudiDialogo(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialogo?.titolo}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{dialogo?.testo}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => chiudiDialogo(false)}>Annulla</Button>
          <Button variant="contained" color="error" onClick={() => chiudiDialogo(true)}>
            {dialogo?.etichetta}
          </Button>
        </DialogActions>
      </Dialog>
    </Ctx.Provider>
  );
}
