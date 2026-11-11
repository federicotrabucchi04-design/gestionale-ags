"use client";

import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import TableViewOutlined from "@mui/icons-material/TableViewOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import { useGestionale } from "@/components/Gestionale";
import { CampoNumero, Intestazione, RigaValore, Sezione } from "@/components/ui";
import { annoPrecedente, aperturaAnno } from "@/lib/calcoli";
import { esportaExcel, esportaJson, leggiBackup } from "@/lib/backup";
import { euro } from "@/lib/format";
import { EMAIL_PROPRIETARIO, type Impostazioni } from "@/lib/types";

export default function ImpostazioniPagina() {
  const { dati, anno, salvaImpostazioni, salvaAccesso, sostituisciTutto, notifica, conferma, locale } = useGestionale();
  const imp = dati.impostazioni;
  const forzato = imp.saldiApertura[anno];
  const calcolato = aperturaAnno(anno, { ...imp, saldiApertura: Object.fromEntries(Object.entries(imp.saldiApertura).filter(([a]) => a !== anno)) }, dati.movimenti);
  const [valoreApertura, setValoreApertura] = useState<number>(forzato ?? calcolato);
  const [email, setEmail] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const impostaApertura = (v: number | undefined) => {
    const saldi = { ...imp.saldiApertura };
    if (v === undefined) delete saldi[anno];
    else saldi[anno] = v;
    salvaImpostazioni({ saldiApertura: saldi });
    notifica(v === undefined ? "Apertura calcolata dall'anno precedente" : "Saldo di apertura salvato");
  };

  const importa = async (f: File) => {
    try {
      const nuovi = leggiBackup(await f.text());
      const conteggio = Object.values(nuovi).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
      if (!(await conferma("Importare il backup?", `Verranno scritti ${conteggio} elementi. Quelli con lo stesso identificativo saranno sovrascritti, gli altri restano.`, "Importa"))) return;
      setInCorso(true);
      await sostituisciTutto(nuovi);
      notifica(`Import completato: ${conteggio} elementi`);
    } catch (e) {
      notifica(e instanceof Error ? e.message : "Import non riuscito", "error");
    } finally {
      setInCorso(false);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <>
      <Intestazione titolo="Impostazioni" sottotitolo="Saldo di apertura, liste a tendina, utenti e backup" />
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, alignItems: "start" }}>
        <Box>
          <Sezione titolo={`Saldo di apertura ${anno}`} sottotitolo="Soldi in cassa al 1 ottobre">
            <RigaValore etichetta={`Calcolato dalla chiusura del ${annoPrecedente(anno)}`} valore={euro(calcolato)} />
            <RigaValore etichetta="In uso" valore={euro(forzato ?? calcolato)} forte tono="primario" />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2, alignItems: { sm: "center" } }}>
              <CampoNumero label="Saldo manuale" euro valore={valoreApertura} onCambia={setValoreApertura} sx={{ maxWidth: 200 }} />
              <Button variant="contained" onClick={() => impostaApertura(valoreApertura)}>
                Usa questo saldo
              </Button>
              {forzato !== undefined && <Button onClick={() => impostaApertura(undefined)}>Usa il calcolato</Button>}
            </Stack>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
              Usa il saldo manuale per il primo anno gestito con l&apos;app o per correggere una differenza con la cassa reale.
            </Typography>
          </Sezione>

          <Sezione titolo="Backup e dati">
            <Stack spacing={1.5}>
              <Button variant="outlined" startIcon={<TableViewOutlined />} onClick={() => void esportaExcel(dati)}>
                Scarica tutto in Excel
              </Button>
              <Button variant="outlined" startIcon={<DownloadOutlined />} onClick={() => esportaJson(dati)}>
                Scarica backup completo (JSON)
              </Button>
              <Button variant="outlined" startIcon={<UploadFileOutlined />} onClick={() => file.current?.click()} disabled={inCorso}>
                {inCorso ? "Import in corso..." : "Importa backup o dati dal vecchio Excel"}
              </Button>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importa(f);
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
              {locale
                ? "Modalità locale: i dati sono salvati solo in questo browser. Scarica spesso un backup."
                : "I dati sono salvati su Firebase e sincronizzati su tutti i dispositivi. Il backup è una copia in più da tenere sul PC."}
            </Typography>
          </Sezione>
        </Box>

        <Box>
          <Sezione titolo="Utenti autorizzati" sottotitolo="Account Google che possono aprire il gestionale">
            {locale && (
              <Alert severity="info" sx={{ mb: 2 }}>
                In modalità locale non c&apos;è login. Gli utenti valgono quando l&apos;app è collegata a Firebase.
              </Alert>
            )}
            <List dense disablePadding>
              {dati.accesso.emails.map((e) => (
                <ListItem
                  key={e}
                  disableGutters
                  secondaryAction={
                    e !== EMAIL_PROPRIETARIO && (
                      <IconButton
                        onClick={async () => {
                          if (await conferma("Rimuovere l'utente?", `${e} non potrà più accedere.`, "Rimuovi")) {
                            salvaAccesso({ ...dati.accesso, emails: dati.accesso.emails.filter((x) => x !== e) });
                          }
                        }}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText primary={e} secondary={e === EMAIL_PROPRIETARIO ? "Amministratore" : undefined} />
                </ListItem>
              ))}
            </List>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <TextField label="Email Google" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              <Button
                variant="contained"
                disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
                onClick={() => {
                  const e = email.trim().toLowerCase();
                  if (!dati.accesso.emails.includes(e)) salvaAccesso({ ...dati.accesso, emails: [...dati.accesso.emails, e] });
                  setEmail("");
                  notifica("Utente autorizzato");
                }}
              >
                Aggiungi
              </Button>
            </Stack>
          </Sezione>

          <ListaModificabile titolo="Categorie dei movimenti" chiave="categorieMovimento" />
          <ListaModificabile titolo="Tipologie di evento" chiave="tipologieEvento" />
          <ListaModificabile titolo="Categorie degli articoli" chiave="categorieArticolo" />
        </Box>
      </Box>
    </>
  );
}

function ListaModificabile({ titolo, chiave }: { titolo: string; chiave: "categorieMovimento" | "tipologieEvento" | "categorieArticolo" }) {
  const { dati, salvaImpostazioni } = useGestionale();
  const [nuova, setNuova] = useState("");
  const lista = dati.impostazioni[chiave];
  const salva = (v: Impostazioni[typeof chiave]) => salvaImpostazioni({ [chiave]: v });

  return (
    <Sezione titolo={titolo} sottotitolo="Voci proposte nei menu a tendina">
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}>
        {lista.map((v) => (
          <Chip key={v} label={v} onDelete={() => salva(lista.filter((x) => x !== v))} />
        ))}
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          const t = nuova.trim();
          if (t && !lista.includes(t)) salva([...lista, t]);
          setNuova("");
        }}
      >
        <TextField label="Nuova voce" value={nuova} onChange={(e) => setNuova(e.target.value)} />
        <Button type="submit" disabled={!nuova.trim()}>
          Aggiungi
        </Button>
      </Stack>
    </Sezione>
  );
}
