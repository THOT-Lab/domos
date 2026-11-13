// Petits outils statistiques : moindres carrés pondérés, sans dépendance.
export type Fit = { slope: number; intercept: number; r2: number; n: number; se: number };

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
export const wmean = (xs: number[], w: number[]) => sum(xs.map((x, i) => x * w[i])) / (sum(w) || 1);
export const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
};

// Droite y = a + b·x (pondérée). `origin` force a = 0.
export function linreg(x: number[], y: number[], w?: number[], origin = false): Fit {
  const n = x.length;
  const ww = w ?? x.map(() => 1);
  const W = sum(ww);
  if (n < 2 || !W) return { slope: 0, intercept: 0, r2: 0, n, se: 0 };
  const mx = origin ? 0 : wmean(x, ww);
  const my = origin ? 0 : wmean(y, ww);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += ww[i] * (x[i] - mx) ** 2; sxy += ww[i] * (x[i] - mx) * (y[i] - my); }
  const slope = sxx ? sxy / sxx : 0;
  const intercept = origin ? 0 : my - slope * mx;
  const ybar = wmean(y, ww);
  let sse = 0, sst = 0;
  for (let i = 0; i < n; i++) { sse += ww[i] * (y[i] - intercept - slope * x[i]) ** 2; sst += ww[i] * (y[i] - ybar) ** 2; }
  const dof = Math.max(1, n - (origin ? 1 : 2));
  const se = sxx ? Math.sqrt(sse / W * n / dof / (sxx / W * n)) : 0;
  return { slope, intercept, r2: sst ? 1 - sse / sst : 0, n, se };
}

// Résout A·c = b (petit système) par élimination de Gauss avec pivot.
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]));
}

// Moindres carrés pondérés à plusieurs variables : rows[i]·c ≈ y[i].
export function lstsq(rows: number[][], y: number[], w: number[]) {
  const k = rows[0]?.length ?? 0;
  const A = Array.from({ length: k }, () => Array(k).fill(0));
  const b = Array(k).fill(0);
  rows.forEach((row, i) => {
    for (let p = 0; p < k; p++) { b[p] += w[i] * row[p] * y[i]; for (let q = 0; q < k; q++) A[p][q] += w[i] * row[p] * row[q]; }
  });
  const coef = solve(A, b);
  const sse = sum(rows.map((row, i) => w[i] * (y[i] - sum(row.map((v, p) => v * coef[p]))) ** 2));
  return { coef, sse };
}
