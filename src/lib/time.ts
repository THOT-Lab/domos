// Les dates sont manipulées en « numéro de jour » (jours depuis 1970, UTC) : pas d'heure, pas de fuseau.
export const DAY = 86400000;
export const dayOf = (iso: string) => Math.round(Date.parse(iso.slice(0, 10) + "T00:00:00Z") / DAY);
export const isoOf = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
export const today = () => { const d = new Date(); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
export const parts = (day: number) => { const d = new Date(day * DAY); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };
export const doy = (day: number) => { const { y } = parts(day); return day - Math.round(Date.UTC(y, 0, 1) / DAY); };
export const dayFromYmd = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m, d) / DAY);

export const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const fmtDay = (day: number, long = false) => { const p = parts(day); return `${p.d === 1 ? "1er" : p.d} ${(long ? MONTHS_LONG : MONTHS)[p.m]} ${p.y}`; };
export const fmtDayShort = (day: number) => { const p = parts(day); return `${p.d === 1 ? "1er" : p.d} ${MONTHS[p.m]}`; };
export const fmtMonth = (day: number) => { const p = parts(day); return `${MONTHS[p.m]} ${p.y}`; };

const nf = (digits: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const f0 = nf(0), f1 = nf(1), f2 = nf(2);
export const n0 = (v: number) => f0.format(Math.round(v) || 0);
export const n1 = (v: number) => f1.format(v || 0);
export const n2 = (v: number) => f2.format(v || 0);
export const signed = (v: number, digits = 0) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${nf(digits).format(Math.abs(v))}`;
export const eur = (v: number) => `${f0.format(Math.round(v))} €`;
export const eur2 = (v: number) => `${f2.format(v)} €`;
