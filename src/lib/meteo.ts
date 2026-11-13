import baked from "../data/meteo.json";
import { dayOf, doy } from "./time";

// Température moyenne quotidienne à la maison (Open-Meteo, réanalyse ERA5). Au-delà de l'archive : prévisions chargées
// au lancement si le réseau répond, sinon normale du jour (moyenne des années de l'archive, lissée sur 15 jours).
const start = dayOf(baked.start);
const temps: number[] = baked.t;
const rain: number[] = baked.p;
const extra = new Map<number, number>();

const normals = (() => {
  const acc = Array.from({ length: 366 }, () => ({ s: 0, n: 0 }));
  temps.forEach((t, i) => { const k = doy(start + i); acc[k].s += t; acc[k].n++; });
  const raw = acc.map((a) => (a.n ? a.s / a.n : NaN));
  return raw.map((_, k) => {
    let s = 0, n = 0;
    for (let j = -7; j <= 7; j++) { const v = raw[(k + j + 366) % 366]; if (!Number.isNaN(v)) { s += v; n++; } }
    return s / n;
  });
})();

export const meteoStart = start;
export const meteoEnd = start + temps.length - 1;
export const meteoInfo = { source: baked.source, lat: baked.lat, lon: baked.lon, start: baked.start, end: baked.end };
export const normalTemp = (day: number) => normals[doy(day)];
export const knownUntil = () => Math.max(meteoEnd, ...extra.keys());
export const temp = (day: number) => {
  const i = day - start;
  if (i >= 0 && i < temps.length) return temps[i];
  return extra.get(day) ?? normalTemp(day);
};
export const rainOf = (day: number) => rain[day - start] ?? 0;

// Complète l'archive avec les derniers jours et les prévisions à 16 jours. Sans réseau, l'application reste entière.
export async function loadForecast(): Promise<boolean> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${baked.lat}&longitude=${baked.lon}&daily=temperature_2m_mean&past_days=31&forecast_days=16&timezone=Europe%2FParis`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const { daily } = await res.json();
    daily.time.forEach((iso: string, i: number) => { const v = daily.temperature_2m_mean[i]; if (typeof v === "number") extra.set(dayOf(iso), v); });
    return true;
  } catch {
    return false;
  }
}
