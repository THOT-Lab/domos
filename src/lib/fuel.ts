import type { FuelEntry, Season } from "../data/fuel";
import { knownUntil, temp } from "./meteo";
import { linreg, lstsq, mean, sum, type Fit } from "./stats";
import { dayFromYmd, dayOf, doy, parts, today } from "./time";

// ── Modèle ───────────────────────────────────────────────────────────────────────────────────────────────────────
// La chaudière ne sert qu'au chauffage (la jauge ne bouge pas l'été). On pose donc la loi des degrés-jours :
//   litres du jour = k × max(0, Tbase − T extérieure), quand la chaudière est allumée.
// Trois inconnues sont tirées des relevés eux-mêmes, par moindres carrés : k (L par degré-jour), Tbase, et ce que
// 1000 L représentent sur la jauge (donc la capacité de la cuve).

export type Interval = {
  a: number; b: number; days: number; l0: number; l1: number; refillL: number;
  usedPts: number; usedL: number; dju: number; heatDays: number; season: number; // index de saison, −1 hors chauffe
  rate: number; djuRate: number; predL: number;
};
export type SeasonStat = {
  label: string; on: number; off: number; open: boolean; approx: boolean; days: number;
  liters: number; dju: number; k: number; meanTemp: number; normalized: number; refills: number;
};
export type Forecast = {
  from: number; level0: number; todayLevel: number; todayLiters: number;
  path: { day: number; level: number; lo: number; hi: number }[];
  orderDay: number | null; orderLo: number | null; orderHi: number | null; emptyDay: number | null;
  nextSeasonNeed: number;
};
export type FuelAnalysis = ReturnType<typeof analyzeFuel>;

export const ORDER_LEVEL = 15; // seuil de commande, en % de jauge

const seasonLabel = (on: number) => { const y = parts(on).y; return `${y}/${String((y + 1) % 100).padStart(2, "0")}`; };

export function analyzeFuel(entriesIn: FuelEntry[], seasonsIn: Season[], opts: { base?: number } = {}) {
  const entries = entriesIn.map((e, i) => ({ ...e, day: dayOf(e.date), i })).sort((p, q) => p.day - q.day || p.i - q.i);
  const readings = entries.filter((e) => e.kind === "reading") as (Extract<FuelEntry, { kind: "reading" }> & { day: number; i: number })[];
  const refills = entries.filter((e) => e.kind === "refill") as (Extract<FuelEntry, { kind: "refill" }> & { day: number; i: number })[];
  const now = today();
  const seasons = seasonsIn.map((s) => ({ on: dayOf(s.on), off: s.off ? dayOf(s.off) : Infinity, open: !s.off, note: s.note }));
  const seasonAt = (day: number) => seasons.findIndex((s) => day >= s.on && day < s.off);
  const heating = (day: number) => seasonAt(day) >= 0;
  const dd = (day: number, base: number) => (heating(day) ? Math.max(0, base - temp(day)) : 0);

  // Intervalles entre deux relevés consécutifs, avec les livraisons tombées entre les deux.
  const raw = readings.slice(1).map((r1, j) => {
    const r0 = readings[j];
    const refillL = sum(refills.filter((f) => f.i > r0.i && f.i < r1.i).map((f) => f.liters));
    return { a: r0.day, b: r1.day, days: r1.day - r0.day, l0: r0.level, l1: r1.level, refillL };
  });

  // Ajustement conjoint : (l0 − l1) = k'·DJU − C·(livraison / 1000 L). k' en points de jauge par degré-jour, C en points pour 1000 L.
  const fitAt = (base: number) => {
    const rows: number[][] = [], y: number[] = [], w: number[] = [];
    for (const it of raw) {
      let dju = 0;
      for (let d = it.a; d < it.b; d++) dju += dd(d, base);
      if (!dju && !it.refillL) continue;
      rows.push([dju, -it.refillL / 1000]); y.push(it.l0 - it.l1); w.push(1 / Math.max(it.days, 3));
    }
    const { coef, sse } = lstsq(rows, y, w);
    return { base, kPts: coef[0], C: coef[1], sse };
  };
  const scan = Array.from({ length: 29 }, (_, i) => fitAt(11 + i * 0.25)); // 11 → 18 °C
  const best = scan.reduce((p, q) => (q.sse < p.sse ? q : p));
  const chosen = opts.base != null ? fitAt(opts.base) : best;
  const base = chosen.base;
  const ptsPer1000 = best.C > 5 ? best.C : 31; // la capacité ne dépend presque pas de la base : on garde l'optimum
  const capacity = 100000 / ptsPer1000;
  const litersPerPt = capacity / 100;
  const k = chosen.kPts * litersPerPt; // litres par degré-jour

  const intervals: Interval[] = raw.map((it) => {
    let dju = 0, heatDays = 0;
    for (let d = it.a; d < it.b; d++) { dju += dd(d, base); if (heating(d)) heatDays++; }
    const usedPts = it.l0 - it.l1 + (it.refillL / 1000) * ptsPer1000;
    const usedL = usedPts * litersPerPt;
    const days = Math.max(it.days, 0);
    return { ...it, usedPts, usedL, dju, heatDays, season: seasonAt(it.a + Math.floor(days / 2)), rate: days ? usedL / days : 0, djuRate: days ? dju / days : 0, predL: k * dju };
  });

  // Consommation jour par jour : chaque intervalle est réparti au prorata des degrés-jours (à défaut, uniformément).
  const first = readings[0]?.day ?? now, last = readings[readings.length - 1]?.day ?? now;
  const daily = new Float64Array(Math.max(1, last - first));
  for (const it of intervals) {
    if (it.days <= 0) continue;
    const used = Math.max(0, it.usedL);
    for (let d = it.a; d < it.b; d++) daily[d - first] = it.dju > 0 ? (used * dd(d, base)) / it.dju : it.heatDays ? (heating(d) ? used / it.heatDays : 0) : used / it.days;
  }

  // Courbe de niveau reconstituée : elle passe par chaque relevé, descend selon la consommation du jour, remonte aux livraisons.
  const level: { day: number; level: number }[] = [];
  for (const it of intervals) {
    const fills = refills.filter((f) => f.day >= it.a && f.day <= it.b && f.i > readings.find((r) => r.day === it.a && r.level === it.l0)!.i);
    let cur = it.l0;
    const scale = it.usedL > 0 ? 1 : 0;
    level.push({ day: it.a, level: cur });
    let pending = it.refillL;
    for (let d = it.a; d < it.b; d++) {
      const f = pending > 0 ? fills.find((x) => x.day === d) : undefined;
      if (f) { level.push({ day: d, level: cur }); cur += (f.liters / 1000) * ptsPer1000; pending -= f.liters; level.push({ day: d, level: cur }); }
      cur -= (scale * daily[d - first]) / litersPerPt;
      if (d + 1 < it.b) level.push({ day: d + 1, level: cur });
    }
    if (pending > 0) { level.push({ day: it.b, level: cur }); cur += (pending / 1000) * ptsPer1000; }
    level.push({ day: it.b, level: it.l1 });
  }

  // Régression affichée : litres par jour en fonction des degrés-jours par jour, sur les intervalles de chauffe.
  const pts = intervals.filter((it) => it.days >= 5 && it.heatDays >= it.days * 0.8);
  const scatter = pts.map((it) => ({ x: it.djuRate, y: it.rate, w: it.days, it }));
  const line: Fit = { ...linreg(scatter.map((p) => p.x), scatter.map((p) => p.y), scatter.map((p) => p.w), true), slope: k };
  {
    const w = scatter.map((p) => p.w), ybar = sum(scatter.map((p, i) => p.y * w[i])) / (sum(w) || 1);
    const sse = sum(scatter.map((p, i) => w[i] * (p.y - k * p.x) ** 2)), sst = sum(scatter.map((p, i) => w[i] * (p.y - ybar) ** 2));
    line.r2 = sst ? 1 - sse / sst : 0;
  }
  const free = linreg(scatter.map((p) => p.x), scatter.map((p) => p.y), scatter.map((p) => p.w));

  // Saisons de chauffe.
  const seasonStats: SeasonStat[] = seasons.map((s, i) => {
    const off = Math.min(s.off, last);
    let liters = 0, dju = 0, tsum = 0, n = 0;
    for (let d = Math.max(s.on, first); d < off; d++) { liters += daily[d - first]; dju += dd(d, base); tsum += temp(d); n++; }
    return {
      label: seasonLabel(s.on), on: s.on, off, open: s.open, approx: i === 0, days: n, liters, dju, k: dju ? liters / dju : 0, meanTemp: n ? tsum / n : 0, normalized: 0,
      refills: sum(refills.filter((f) => f.day >= s.on - 20 && f.day < (s.open ? Infinity : s.off)).map((f) => f.liters)),
    };
  }).filter((s) => s.days > 0);
  const complete = seasonStats.filter((s) => !s.open);
  const djuNormal = mean(complete.map((s) => s.dju));
  seasonStats.forEach((s) => (s.normalized = s.k * djuNormal));
  // Régime récent : les quatre dernières saisons terminées (la maison a changé de comportement à partir de 2022/23).
  const after = complete.slice(-4);
  const early = complete.slice(0, Math.max(0, complete.length - 4));
  const kOf = (xs: SeasonStat[]) => sum(xs.map((s) => s.liters)) / (sum(xs.map((s) => s.dju)) || 1);
  const kRange = { lo: Math.min(...after.map((s) => s.k)), hi: Math.max(...after.map((s) => s.k)), mean: kOf(after), early: early.length ? kOf(early) : kOf(after) };
  const trendL = linreg(complete.map((_, i) => i), complete.map((s) => s.liters));
  const trendK = linreg(complete.map((_, i) => i), complete.map((s) => s.k));
  const climate = linreg(complete.map((s) => s.dju), complete.map((s) => s.liters));

  // Saisonnalité : litres par mois, saison par saison, puis profil moyen (mois entièrement couverts par une saison terminée).
  const MONTH_ORDER = [9, 10, 11, 0, 1, 2, 3, 4]; // octobre → mai
  const monthly = seasonStats.map((s) => {
    const y0 = parts(s.on).y;
    return MONTH_ORDER.map((m) => {
      const y = m >= 9 ? y0 : y0 + 1;
      const a = dayFromYmd(y, m, 1), b = dayFromYmd(y, m + 1, 1);
      let liters = 0, dju = 0, tsum = 0;
      for (let d = a; d < b; d++) { if (d >= first && d < last) liters += daily[d - first]; dju += Math.max(0, base - temp(d)); tsum += temp(d); }
      const covered = a >= first && b <= last;
      return { m, y, liters, dju, days: b - a, meanTemp: tsum / (b - a), covered };
    });
  });
  const profile = MONTH_ORDER.map((m, j) => {
    const cells = monthly.map((row, i) => ({ c: row[j], s: seasonStats[i] })).filter(({ c, s }) => c.covered && !s.approx);
    const ls = cells.map(({ c }) => c.liters);
    return { m, liters: mean(ls), min: ls.length ? Math.min(...ls) : 0, max: ls.length ? Math.max(...ls) : 0, perDay: mean(cells.map(({ c }) => c.liters / c.days)), meanTemp: mean(cells.map(({ c }) => c.meanTemp)), n: ls.length };
  });
  const profileTotal = sum(profile.map((p) => p.liters));

  // Projection : à partir du dernier relevé, météo observée puis prévue puis normale ; fourchette = saison la plus sobre / la plus gourmande.
  const offDoy = Math.round(mean(seasons.filter((s) => !s.open).map((s) => doy(s.off))));
  const onDoy = Math.round(mean(seasons.map((s) => doy(s.on))));
  const lastSeasonOpen = seasons.length > 0 && seasons[seasons.length - 1].open;
  const willHeat = (day: number) => {
    if (day <= last) return heating(day);
    const k0 = doy(day);
    const typical = k0 >= onDoy || k0 < offDoy;
    if (lastSeasonOpen && day < dayFromYmd(parts(seasons[seasons.length - 1].on).y + 1, 0, 1) + offDoy) return true;
    return typical;
  };
  const lastReading = readings[readings.length - 1];
  const forecast: Forecast = { from: last, level0: lastReading?.level ?? 0, todayLevel: lastReading?.level ?? 0, todayLiters: 0, path: [], orderDay: null, orderLo: null, orderHi: null, emptyDay: null, nextSeasonNeed: 0 };
  if (lastReading) {
    let lv = lastReading.level, lo = lv, hi = lv;
    const kk = kRange.mean > 0 ? kRange.mean : k, ratioLo = kRange.hi / kRange.mean, ratioHi = kRange.lo / kRange.mean;
    forecast.path.push({ day: last, level: lv, lo, hi });
    for (let d = last; d < last + 540; d++) {
      const c = willHeat(d) ? (kk * Math.max(0, base - temp(d))) / litersPerPt : 0;
      lv -= c; lo -= c * ratioLo; hi -= c * ratioHi;
      const day = d + 1;
      forecast.path.push({ day, level: Math.max(0, lv), lo: Math.max(0, lo), hi: Math.max(0, hi) });
      if (day === Math.max(now, last)) forecast.todayLevel = lv;
      if (forecast.orderDay == null && lv <= ORDER_LEVEL) forecast.orderDay = day;
      if (forecast.orderLo == null && lo <= ORDER_LEVEL) forecast.orderLo = day;
      if (forecast.orderHi == null && hi <= ORDER_LEVEL) forecast.orderHi = day;
      if (forecast.emptyDay == null && lv <= 0) forecast.emptyDay = day;
      if (hi <= 2) break;
    }
    forecast.todayLiters = forecast.todayLevel * litersPerPt;
    forecast.nextSeasonNeed = kRange.mean * djuNormal;
  }

  const totalL = sum(intervals.map((it) => Math.max(0, it.usedL)));
  const yearsSpan = (last - first) / 365.25;
  const heatDaysAll = sum(complete.map((s) => s.days));
  return {
    entries, readings, refills, seasons, intervals, daily, first, last, level,
    base, bestBase: best.base, scan: scan.map((s) => ({ base: s.base, sse: s.sse })), k, capacity, ptsPer1000, litersPerPt,
    scatter, line, free, seasonStats, complete, after, early, djuNormal, kRange, trendL, trendK, climate,
    monthly, profile, profileTotal, MONTH_ORDER, forecast, weatherUntil: knownUntil(),
    totals: {
      liters: totalL, delivered: sum(refills.map((f) => f.liters)), perYear: yearsSpan ? totalL / yearsSpan : 0,
      perSeason: mean(complete.map((s) => s.liters)), perSeasonAfter: mean(after.map((s) => s.liters)),
      perHeatDay: heatDaysAll ? sum(complete.map((s) => s.liters)) / heatDaysAll : 0,
      peakMonth: profile.reduce((p, q) => (q.liters > p.liters ? q : p), profile[0]),
    },
  };
}
