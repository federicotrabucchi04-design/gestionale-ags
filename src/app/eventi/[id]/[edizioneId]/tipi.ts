import type { CalcoloEdizione, CalcoloParte } from "@/lib/calcoli";
import type { Edizione, Parte } from "@/lib/types";

export type Aggiorna = (patch: Partial<Edizione> | ((e: Edizione) => Partial<Edizione>)) => void;
export type AggiornaParte = (patch: Partial<Parte> | ((p: Parte) => Partial<Parte>)) => void;

/** Everything a part editor needs. */
export interface PropsParte {
  ed: Edizione;
  parte: Parte;
  calc: CalcoloParte;
  calcEd: CalcoloEdizione;
  aggiornaParte: AggiornaParte;
  bloccata: boolean;
}
