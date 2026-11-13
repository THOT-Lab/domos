// Factures d'eau, transcrites de la feuille « Consommation eau » (photo du 8 novembre 2026).
export type WaterBill = { id: string; start: string; end: string; m3: number; eur: number; note?: string };

const b = (start: string, end: string, m3: number, eur: number, note?: string): WaterBill => ({ id: `${start}_${end}`, start, end, m3, eur, note });

export const WATER_SEED: WaterBill[] = [
  b("2019-06-01", "2019-09-30", 22, 70.63),
  b("2019-10-01", "2020-06-01", 59, 182.14),
  b("2020-06-01", "2020-10-01", 42, 135.49),
  b("2020-10-01", "2021-06-01", 81, 241.46),
  b("2021-06-01", "2021-10-01", 45, 144.85),
  b("2021-10-01", "2022-06-01", 72, 229.81),
  b("2022-06-01", "2022-10-01", 36, 126.72),
  b("2022-10-01", "2023-06-01", 75, 261.75, "Premier chiffre du montant surchargé sur la feuille"),
  b("2023-06-01", "2023-10-01", 39, 148.5),
  b("2023-10-01", "2024-07-01", 91, 347.41),
  b("2024-07-01", "2024-11-04", 47, 198.14),
  b("2024-11-04", "2025-05-31", 79, 276.76, "La feuille indique un début au 01/10/2024, qui chevauche la facture précédente : début ramené au 04/11/2024"),
  b("2025-06-01", "2025-09-30", 75, 264.33),
  b("2025-10-01", "2026-05-31", 109, 347.49, "La feuille indique « 01/10/2026 » : lu 01/10/2025"),
];
