import type { WaterBill } from "../data/water";
import { linreg, lstsq, mean, std, sum } from "./stats";
import { dayOf, parts, dayFromYmd } from "./time";

// Les factures couvrent des périodes inégales (≈ 4 mois d'été, ≈ 8 mois d'hiver) : tout est ramené en litres par jour.
export type Period = WaterBill & { a: number; b: number; days: number; mid: number; rate: number; unit: number; summer: boolean; z: number; label: string };
export type WaterAnalysis = ReturnType<typeof analyzeWater>;

export function analyzeWater(bills: WaterBill[]) {
  const periods: Period[] = bills
    .map((w) => {
      const a = dayOf(w.start), b = dayOf(w.end), days = Math.max(1, b - a);
      const pa = parts(a), pb = parts(b);
      // Été = période dont le milieu tombe entre juin et septembre.
      const mm = parts(a + Math.floor(days / 2)).m;
      const summer = mm >= 5 && mm <= 8;
      const label = summer ? `Été ${pa.y}` : `Hiver ${pa.y}/${String(pb.y % 100).padStart(2, "0")}`;
      return { ...w, a, b, days, mid: a + days / 2, rate: (w.m3 * 1000) / days, unit: w.eur / w.m3, summer, z: 0, label };
    })
    .sort((p, q) => p.a - q.a);

  // Consommation jour par jour (uniforme dans chaque facture), pour refaire des années civiles.
  const first = periods[0]?.a ?? 0, last = periods.length ? Math.max(...periods.map((p) => p.b)) : 0;
  const daily = new Float64Array(Math.max(1, last - first));
  const cost = new Float64Array(Math.max(1, last - first));
  for (const p of periods) for (let d = p.a; d < p.b; d++) { daily[d - first] += p.m3 / p.days; cost[d - first] += p.eur / p.days; }
  const years: { y: number; m3: number; eur: number; days: number; full: boolean }[] = [];
  for (let y = parts(first).y; y <= parts(last - 1).y; y++) {
    const a = Math.max(first, dayFromYmd(y, 0, 1)), b = Math.min(last, dayFromYmd(y + 1, 0, 1));
    let m3 = 0, e = 0;
    for (let d = a; d < b; d++) { m3 += daily[d - first]; e += cost[d - first]; }
    years.push({ y, m3, eur: e, days: b - a, full: b - a >= 365 });
  }

  // Référence = les factures jusqu'au printemps 2025 (la première exclue : emménagement probable). Écart en nombre d'écarts-types.
  const cut = dayOf("2025-06-01");
  const ref = periods.filter((p) => p.b <= cut).slice(1);
  const refMean = mean(ref.map((p) => p.rate)), refStd = std(ref.map((p) => p.rate));
  periods.forEach((p) => (p.z = refStd ? (p.rate - refMean) / refStd : 0));
  const anomalies = periods.filter((p) => p.z > 2.5);
  const excessM3 = sum(anomalies.map((p) => ((p.rate - refMean) * p.days) / 1000));
  const excessEur = sum(anomalies.map((p) => (((p.rate - refMean) * p.days) / 1000) * p.unit));

  const yr = (day: number) => (day - first) / 365.25;
  const trend = linreg(periods.map((p) => yr(p.mid)), periods.map((p) => p.rate), periods.map((p) => p.days));
  const trendRef = linreg(ref.map((p) => yr(p.mid)), ref.map((p) => p.rate), ref.map((p) => p.days));
  const summers = periods.filter((p) => p.summer), winters = periods.filter((p) => !p.summer);
  const wrate = (xs: Period[]) => (sum(xs.map((p) => p.m3)) * 1000) / (sum(xs.map((p) => p.days)) || 1);
  const season = { summer: wrate(summers.filter((p) => p.b <= cut)), winter: wrate(winters.filter((p) => p.b <= cut)), summerAll: wrate(summers), winterAll: wrate(winters) };

  // Prix : facture = abonnement (par jour) + prix au m³ ; et prix tout compris par m³ dans le temps.
  const tariff = lstsq(periods.map((p) => [p.days, p.m3]), periods.map((p) => p.eur), periods.map(() => 1));
  const price = linreg(periods.map((p) => yr(p.mid)), periods.map((p) => p.unit), periods.map((p) => p.m3));
  const priceStart = price.intercept, priceEnd = price.intercept + price.slope * yr(periods[periods.length - 1]?.mid ?? first);
  const cagr = priceStart > 0 ? (priceEnd / priceStart) ** (1 / Math.max(1, yr(periods[periods.length - 1]?.mid ?? first))) - 1 : 0;

  const lastP = periods[periods.length - 1];
  const totalM3 = sum(periods.map((p) => p.m3)), totalEur = sum(periods.map((p) => p.eur)), totalDays = sum(periods.map((p) => p.days));
  const fullYears = years.filter((y) => y.full);
  return {
    periods, years, fullYears, first, last, yr, ref, refMean, refStd, anomalies, excessM3, excessEur, trend, trendRef, season,
    tariff: { perYear: tariff.coef[0] * 365, perM3: tariff.coef[1] }, price, cagr, lastP,
    totals: { m3: totalM3, eur: totalEur, rate: (totalM3 * 1000) / (totalDays || 1), unit: totalEur / (totalM3 || 1), perYearM3: mean(fullYears.map((y) => y.m3)), perYearEur: mean(fullYears.map((y) => y.eur)) },
  };
}
