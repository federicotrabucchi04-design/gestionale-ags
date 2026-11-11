"""Converte AGS_Gestionale_Eventi.xlsx in un backup JSON importabile dal Gestionale AGS web.

Uso:
    python tools/excel_a_json.py [percorso.xlsx] [output.json]

Il file Excel viene solo letto (da una copia temporanea). Gli identificativi sono
derivati dai codici, quindi reimportare lo stesso file sovrascrive invece di duplicare.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
from datetime import date, datetime
from pathlib import Path

import openpyxl

QUI = Path(__file__).resolve().parent
EXCEL_DEFAULT = QUI.parent.parent / "AGS_Gestionale_Eventi.xlsx"
OUTPUT_DEFAULT = QUI.parent.parent / "_import" / "ags-da-excel.json"

SI = {"si", "sì", "yes", "true", "1"}


def iso(v) -> str | None:
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, str):
        m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", v.strip())
        if m:
            return f"{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}"
    return None


def num(v) -> float:
    if v is None or v == "" or v == "-":
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).replace("€", "").replace(".", "").replace(",", ".").strip())
    except ValueError:
        return 0.0


def testo(v) -> str:
    return "" if v is None else str(v).strip()


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def tabella(wb, nome: str) -> list[dict]:
    for ws in wb.worksheets:
        if nome in ws.tables:
            ref = ws.tables[nome].ref
            righe = list(ws[ref])
            intest = [testo(c.value) for c in righe[0]]
            out = []
            for r in righe[1:]:
                valori = [c.value for c in r]
                if all(v is None or testo(v) == "" for v in valori):
                    continue
                out.append(dict(zip(intest, valori)))
            return out
    print(f"  ! tabella {nome} non trovata", file=sys.stderr)
    return []


def main() -> None:
    sorgente = Path(sys.argv[1]) if len(sys.argv) > 1 else EXCEL_DEFAULT
    destinazione = Path(sys.argv[2]) if len(sys.argv) > 2 else OUTPUT_DEFAULT
    copia = Path(tempfile.gettempdir()) / "ags_import_copia.xlsx"
    shutil.copyfile(sorgente, copia)
    wb = openpyxl.load_workbook(copia, data_only=True)

    fornitori: dict[str, dict] = {}

    def fornitore(nome: str) -> str | None:
        nome = nome.strip()
        if not nome:
            return None
        k = slug(nome)
        fornitori.setdefault(k, {"id": f"forn-{k}", "nome": nome})
        return f"forn-{k}"

    # Materie prime e prezzi -------------------------------------------------
    materie: dict[str, dict] = {}
    prezzi: list[dict] = []
    for r in tabella(wb, "MateriePrimeAGS"):
        codice = testo(r.get("Cod. MP"))
        if not codice:
            continue
        mp_id = f"mp-{slug(codice)}"
        materie.setdefault(
            codice,
            {"id": mp_id, "codice": codice, "nome": testo(r.get("Nome MP")), "um": testo(r.get("U.M.")) or "pz", "attiva": True},
        )
        if testo(r.get("Note")):
            materie[codice]["note"] = testo(r.get("Note"))
        in_uso = testo(r.get("In uso")).lower() in SI
        precedenti = sum(1 for p in prezzi if p["mpId"] == mp_id and not p.get("_in_uso"))
        prezzi.append(
            {
                "id": f"prz-{slug(codice)}-{len(prezzi)}",
                "mpId": mp_id,
                "fornitoreId": fornitore(testo(r.get("Fornitore"))),
                "validoDal": "2025-09-30" if in_uso else f"2025-01-{precedenti + 1:02d}",
                "costoLotto": num(r.get("Costo lotto €")),
                "qtaLotto": num(r.get("Qtà lotto")) or 1,
                "_in_uso": in_uso,
            }
        )
    for p in prezzi:
        p.pop("_in_uso", None)
        if not p["fornitoreId"]:
            p.pop("fornitoreId")

    # Articoli, ricette e listini -------------------------------------------
    articoli: dict[str, dict] = {}
    listini: dict[str, dict] = {}
    for r in tabella(wb, "ArticoliAGS"):
        codice = testo(r.get("Cod. ART"))
        if not codice:
            continue
        art_id = f"art-{slug(codice)}"
        articoli.setdefault(
            codice,
            {
                "id": art_id,
                "codice": codice,
                "nome": testo(r.get("Articolo")),
                "categoria": testo(r.get("Categoria")) or "Bar",
                "um": testo(r.get("U.M.")) or "pz",
                "attivo": True,
                "ricetta": [],
            },
        )
        dal = iso(r.get("Valido dal")) or "2025-09-30"
        listino = listini.setdefault(
            dal,
            {"id": f"lst-{dal}", "nome": f"Listino dal {dal[8:10]}/{dal[5:7]}/{dal[:4]}", "validoDal": dal, "prezzi": {}},
        )
        if r.get("Prezzo €") not in (None, ""):
            listino["prezzi"][art_id] = num(r.get("Prezzo €"))

    for r in tabella(wb, "RicetteAGS"):
        art, mp = testo(r.get("Cod. ART")), testo(r.get("Cod. MP"))
        if art in articoli and mp in materie:
            riga = {"mpId": materie[mp]["id"], "qta": num(r.get("Qtà / pezzo"))}
            if testo(r.get("Note")):
                riga["note"] = testo(r.get("Note"))
            articoli[art]["ricetta"].append(riga)

    # Costi fissi ------------------------------------------------------------
    costi: dict[str, dict] = {}
    for r in tabella(wb, "CostiFissiAGS"):
        voce = testo(r.get("Voce"))
        if not voce:
            continue
        costi[voce] = {
            "id": f"cf-{slug(voce)}",
            "nome": voce,
            "costoTotale": num(r.get("Costo totale EUR")),
            "baseRiparto": num(r.get("Base riparto (pezzi)")),
            "articoliIds": [],
            "attivo": testo(r.get("Includi")).lower() in SI,
        }
        if testo(r.get("Note")):
            costi[voce]["note"] = testo(r.get("Note"))
    for r in tabella(wb, "InclusioniAGS"):
        voce, art = testo(r.get("Voce overhead")), testo(r.get("Cod. ART"))
        if voce in costi and art in articoli and testo(r.get("Includi")).lower() in SI:
            costi[voce]["articoliIds"].append(articoli[art]["id"])

    # Eventi ed edizioni -----------------------------------------------------
    festa = {"id": "evt-festa-con-bar", "nome": "Festa con bar", "tipologia": "Festa con bar"}
    eventi = [
        festa,
        {"id": "evt-cena-musica", "nome": "Cena con musica", "tipologia": "Cena e musica"},
        {"id": "evt-camminata", "nome": "Camminata degustazioni", "tipologia": "Camminata"},
    ]
    edizioni: dict[str, dict] = {}
    for r in tabella(wb, "EdizioniFestaAGS"):
        nome = testo(r.get("Nome edizione"))
        data = iso(r.get("Data"))
        if not nome or not data:
            continue
        ed = {
            "id": f"ed-{slug(nome)}",
            "eventoId": festa["id"],
            "nome": nome.replace("_", " "),
            "data": data,
            "stato": "conclusa",
            "menu": [],
            "acquisti": [],
            "costiExtra": [],
        }
        if num(r.get("Partecipanti")):
            ed["partecipantiReali"] = num(r.get("Partecipanti"))
        if testo(r.get("Note")):
            ed["note"] = testo(r.get("Note"))
        edizioni[nome] = ed

    for i, r in enumerate(tabella(wb, "MenuFestaAGS")):
        ed, art = edizioni.get(testo(r.get("Edizione"))), testo(r.get("Cod. ART"))
        if ed and art in articoli:
            ed["menu"].append(
                {"id": f"menu-{i}", "articoloId": articoli[art]["id"], "qtaPrevista": num(r.get("Qtà prevista")), "qtaReale": num(r.get("Qtà reale"))}
            )

    for i, r in enumerate(tabella(wb, "MagazzinoFestaAGS")):
        ed, mp = edizioni.get(testo(r.get("Edizione"))), testo(r.get("Cod. MP / Articolo"))
        if ed and mp in materie:
            lotti = num(r.get("Numero lotti/pacchi"))
            riga = {
                "id": f"acq-{i}",
                "mpId": materie[mp]["id"],
                "lottiPrevisti": lotti,
                "lottiReali": lotti,
                "daMagazzino": 0,
                "rimanenza": num(r.get("Rimanenza U.M.")),
            }
            if testo(r.get("Note")):
                riga["note"] = testo(r.get("Note"))
            ed["acquisti"].append(riga)

    for i, r in enumerate(tabella(wb, "OverheadFestaAGS")):
        ed = edizioni.get(testo(r.get("Edizione")))
        if ed and testo(r.get("Voce")):
            imp = num(r.get("Importo €"))
            ed["costiExtra"].append(
                {
                    "id": f"extra-{i}",
                    "descrizione": testo(r.get("Voce")),
                    "importoPrevisto": imp,
                    "importoReale": imp,
                    "ripartisci": testo(r.get("Includi")).lower() in SI,
                }
            )

    # Movimenti --------------------------------------------------------------
    movimenti: list[dict] = []

    def movimento(prefisso: str, i: int, data, descr, tipo, importo, stato, note, edizione_id=None, categoria=None):
        d = iso(data)
        if not d or not testo(descr) or not num(importo):
            return
        tipo_n = "entrata" if testo(tipo).lower().startswith("entr") else "uscita"
        m = {
            "id": f"{prefisso}-{i}",
            "data": d,
            "descrizione": testo(descr),
            "tipo": tipo_n,
            "importo": abs(num(importo)),
            "stato": "ufficiale" if testo(stato).lower().startswith("uff") else "previsto",
            "categoria": categoria or "Altro",
        }
        if edizione_id:
            m["edizioneId"] = edizione_id
        if testo(note):
            m["note"] = testo(note)
        for k, f in fornitori.items():
            if f["nome"].lower() in m["descrizione"].lower():
                m["fornitoreId"] = f["id"]
        movimenti.append(m)

    ws = wb["Gestione Ordinaria"]
    for i, riga in enumerate(ws.iter_rows(min_row=7, max_row=56, max_col=7, values_only=True)):
        data, descr, cat, tipo, importo, stato, note = riga
        movimento("ord", i, data, descr, tipo, importo, stato, note, categoria=testo(cat) or "Altro")

    for i, r in enumerate(tabella(wb, "MovimentiFestaAGS")):
        ed = edizioni.get(testo(r.get("Edizione")))
        descr = testo(r.get("Descrizione"))
        tipo = testo(r.get("Tipo"))
        categoria = "Incassi evento" if tipo.lower().startswith("entr") else ("Musica e servizi" if "musica" in descr.lower() else "Fornitori")
        movimento("fest", i, r.get("Data"), descr, tipo, r.get("Importo €"), r.get("Stato"), r.get("Note"), ed["id"] if ed else None, categoria)

    # Inventario manuale -----------------------------------------------------
    inventario = []
    for i, r in enumerate(tabella(wb, "InventarioManualeAGS")):
        mp, d, q = testo(r.get("Cod. MP")), iso(r.get("Data")), num(r.get("Quantità (+/−)"))
        if mp in materie and d and q:
            inventario.append(
                {"id": f"inv-{i}", "mpId": materie[mp]["id"], "data": d, "tipo": "carico" if q > 0 else "scarico", "quantita": abs(q), "note": testo(r.get("Tipo"))}
            )

    # Saldo di apertura ------------------------------------------------------
    home = wb["Home Page"]
    anno = testo(home["E12"].value)
    override = home["H14"].value
    saldi = {}
    if anno and override not in (None, ""):
        saldi[anno] = num(override)

    backup = {
        "app": "gestionale-ags",
        "versione": 1,
        "creato": datetime.now().isoformat(timespec="seconds"),
        "dati": {
            "fornitori": list(fornitori.values()),
            "materiePrime": list(materie.values()),
            "prezziMP": prezzi,
            "articoli": list(articoli.values()),
            "listini": list(listini.values()),
            "costiFissi": list(costi.values()),
            "eventi": eventi,
            "edizioni": list(edizioni.values()),
            "movimenti": movimenti,
            "inventario": inventario,
            "impostazioni": {"id": "impostazioni", "saldiApertura": saldi},
        },
    }
    destinazione.parent.mkdir(parents=True, exist_ok=True)
    destinazione.write_text(json.dumps(backup, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Scritto {destinazione}")
    for k, v in backup["dati"].items():
        print(f"  {k}: {len(v) if isinstance(v, list) else v}")


if __name__ == "__main__":
    main()
