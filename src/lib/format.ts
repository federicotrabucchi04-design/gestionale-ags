const euroFmt = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const euro4Fmt = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const numFmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 3 });
const pctFmt = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 1 });

export const euro = (v: number | undefined | null) => (v === undefined || v === null || Number.isNaN(v) ? "-" : euroFmt.format(v));
/** For unit costs that need more than two decimals (e.g. 0,0125 €). */
export const euroFine = (v: number | undefined | null) =>
  v === undefined || v === null || Number.isNaN(v) ? "-" : euro4Fmt.format(v);
export const numero = (v: number | undefined | null) => (v === undefined || v === null || Number.isNaN(v) ? "-" : numFmt.format(v));
export const percento = (v: number | undefined | null) =>
  v === undefined || v === null || !Number.isFinite(v) ? "-" : pctFmt.format(v);

export function data(iso: string | undefined): string {
  if (!iso) return "-";
  const [y, m, g] = iso.split("-");
  return `${g}/${m}/${y}`;
}

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export function meseBreve(yyyyMm: string): string {
  return `${MESI[Number(yyyyMm.slice(5, 7)) - 1]} ${yyyyMm.slice(2, 4)}`;
}

export function dataLunga(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

export function numeroDa(testo: string): number {
  const v = Number(String(testo).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}
