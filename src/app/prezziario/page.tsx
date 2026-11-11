"use client";

import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { Intestazione } from "@/components/ui";
import ArticoliTab from "./ArticoliTab";
import CostiFissiTab from "./CostiFissiTab";
import FornitoriTab from "./FornitoriTab";
import ListiniTab from "./ListiniTab";
import MateriePrimeTab from "./MateriePrimeTab";

const SCHEDE = [
  { id: "articoli", etichetta: "Articoli e ricette" },
  { id: "listini", etichetta: "Listini prezzi" },
  { id: "materie", etichetta: "Materie prime" },
  { id: "fornitori", etichetta: "Fornitori" },
  { id: "costi", etichetta: "Costi fissi" },
] as const;

type Scheda = (typeof SCHEDE)[number]["id"];

export default function Prezziario() {
  const [scheda, setScheda] = useState<Scheda>("articoli");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la query string è disponibile solo dopo l'idratazione
    if (t && SCHEDE.some((s) => s.id === t)) setScheda(t as Scheda);
  }, []);

  const cambia = (s: Scheda) => {
    setScheda(s);
    window.history.replaceState(null, "", `?tab=${s}`);
  };

  return (
    <>
      <Intestazione
        titolo="Prezziario"
        sottotitolo="Listini datati, costi delle materie prime, ricette e composizione del prezzo di ogni articolo"
      />
      <Card sx={{ mb: 3 }}>
        <Tabs value={scheda} onChange={(_, v) => cambia(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          {SCHEDE.map((s) => (
            <Tab key={s.id} value={s.id} label={s.etichetta} />
          ))}
        </Tabs>
      </Card>
      {scheda === "articoli" && <ArticoliTab />}
      {scheda === "listini" && <ListiniTab />}
      {scheda === "materie" && <MateriePrimeTab />}
      {scheda === "fornitori" && <FornitoriTab />}
      {scheda === "costi" && <CostiFissiTab />}
    </>
  );
}
