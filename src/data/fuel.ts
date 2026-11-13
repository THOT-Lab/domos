// Relevés de la cuve de fuel, transcrits du carnet manuscrit (photos du 8 novembre 2026, dossier « App Domos »).
// Un relevé = un niveau de jauge en % à une date. Une recharge = une livraison en litres. L'ordre du carnet est conservé.
export type FuelEntry =
  | { id: string; kind: "reading"; date: string; level: number; approx?: boolean; note?: string }
  | { id: string; kind: "refill"; date: string; liters: number; approx?: boolean; note?: string };

export type Season = { on: string; off?: string; note?: string };
export type Marker = { date: string; label: string; detail?: string };

const r = (date: string, level: number, extra: { approx?: boolean; note?: string } = {}): FuelEntry => ({ id: `r${date}-${level}`, kind: "reading", date, level, ...extra });
const f = (date: string, extra: { approx?: boolean; note?: string } = {}): FuelEntry => ({ id: `f${date}`, kind: "refill", date, liters: 1000, ...extra });

export const FUEL_SEED: FuelEntry[] = [
  r("2020-10-13", 40, { approx: true, note: "Date notée « ≈ » dans le carnet" }),
  f("2020-11-15", { approx: true, note: "Recharge notée entre le 13 oct. et le 15 déc. 2020, sans date" }),
  r("2020-12-15", 50, { approx: true, note: "Date notée « ≈ » dans le carnet" }),
  f("2021-02-24", { approx: true, note: "Date notée « ≈ », pas de niveau relevé ce jour-là" }),
  r("2021-03-31", 47, { approx: true, note: "Date notée « ≈ » dans le carnet" }),
  r("2021-06-01", 43),
  r("2021-10-31", 43),
  r("2021-12-05", 33),
  r("2021-12-12", 30),
  r("2022-01-01", 20),
  r("2022-01-08", 18),
  f("2022-01-09", { approx: true, note: "Recharge entre le 8 et le 12 janv." }),
  r("2022-01-12", 48),
  r("2022-01-22", 45),
  r("2022-01-30", 41),
  r("2022-02-05", 39),
  r("2022-02-19", 35, { note: "Chiffre corrigé à la main dans le carnet" }),
  r("2022-02-25", 33),
  r("2022-03-12", 28),
  r("2022-03-20", 28),
  r("2022-03-25", 25),
  r("2022-04-02", 23),
  r("2022-04-24", 20),
  r("2022-05-07", 20),
  r("2022-11-08", 20),
  f("2022-11-09", { approx: true, note: "Recharge entre le 8 et le 28 nov." }),
  r("2022-11-28", 47),
  r("2022-12-17", 42, { note: "Le carnet indique « 2024 » : lu 2022 d'après la chronologie" }),
  r("2023-01-03", 39, { note: "Chiffre surchargé dans le carnet" }),
  r("2023-01-08", 37),
  r("2023-01-29", 30),
  r("2023-02-11", 22.5),
  r("2023-02-27", 18.5),
  f("2023-02-28", { approx: true, note: "Recharge entre le 27 févr. et le 1er mars" }),
  r("2023-03-01", 49),
  r("2023-04-21", 43),
  r("2023-11-03", 43),
  r("2023-11-11", 41),
  r("2023-12-02", 38),
  r("2023-12-28", 30),
  r("2024-01-13", 26),
  r("2024-01-20", 23),
  r("2024-01-27", 20),
  r("2024-02-10", 15),
  f("2024-02-11", { approx: true, note: "Recharge entre le 10 et le 12 févr." }),
  r("2024-02-12", 45),
  r("2024-03-16", 41),
  r("2024-03-31", 40),
  r("2024-04-30", 36),
  r("2024-11-13", 36),
  r("2024-11-30", 33),
  r("2024-12-26", 25),
  r("2025-01-16", 15, { note: "Le carnet indique « 2024 » : lu 2025 d'après la chronologie" }),
  f("2025-01-16"),
  r("2025-01-16", 48, { note: "Relevé juste après la livraison" }),
  r("2025-04-19", 30),
  r("2025-11-02", 30),
  f("2025-11-03", { approx: true, note: "Recharge entre le 2 nov. et le 12 déc." }),
  r("2025-12-12", 50),
  r("2025-12-29", 48),
  r("2026-01-31", 38),
  r("2026-02-24", 31),
  r("2026-03-12", 28),
  r("2026-04-06", 23),
  r("2026-11-02", 23),
  f("2026-11-03", { approx: true, note: "Recharge entre le 2 et le 5 nov." }),
  r("2026-11-05", 53),
].map((e, i) => ({ ...e, id: `${e.id}-${i}` }));

// Périodes de chauffe : « allumage » et « arrêt chaudière » du carnet. Hors de ces périodes la chaudière est coupée.
export const SEASONS_SEED: Season[] = [
  { on: "2020-10-13", off: "2021-06-01", note: "Chaudière 55 °C puis 65 °C, puis 50 °C" },
  { on: "2021-10-31", off: "2022-05-07", note: "Chaudière 60 °C, puis 55 °C en mars" },
  { on: "2022-11-08", off: "2023-04-21", note: "Chaudière 60 °C, consigne 19 °C / 18 °C" },
  { on: "2023-11-03", off: "2024-04-30", note: "Consigne 19 °C" },
  { on: "2024-11-13", off: "2025-04-19", note: "Consigne 19 °C" },
  { on: "2025-11-02", off: "2026-04-06" },
  { on: "2026-11-02" },
];

export const MARKERS: Marker[] = [{ date: "2021-08-15", label: "Isolation des combles", detail: "« Rénovation isolant combles », notée entre juin et octobre 2021" }];

// Bilans de saison écrits à la main dans la marge du carnet (en points de jauge), pour comparaison.
export const HAND_TOTALS: Record<string, number> = { "2020/21": 65, "2021/22": 56 };
