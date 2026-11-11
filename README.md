# Gestionale AGS

Web app per cassa, eventi, prezziario e inventario dell'associazione (Next.js + MUI, dati su Firebase Firestore, pubblicata su Vercel).

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # test dei calcoli
```

Senza le variabili `NEXT_PUBLIC_FIREBASE_*` (vedi `.env.example`) l'app gira in **modalità locale**: i dati restano nel browser.

## Firebase

- Accesso con Google; può entrare il proprietario e chi è elencato in Impostazioni > Utenti autorizzati.
- Regole in `firestore.rules`, da pubblicare con `npx firebase-tools deploy --only firestore:rules`.

## Import dal vecchio Excel

```bash
python tools/excel_a_json.py   # crea ../_import/ags-da-excel.json
```

Poi in app: Impostazioni > Backup > Importa backup JSON.
