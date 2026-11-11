import type { Edizione } from "@/lib/types";

export type Aggiorna = (patch: Partial<Edizione> | ((e: Edizione) => Partial<Edizione>)) => void;
