import { scaleBand, scaleLinear } from "d3-scale";
import { motion } from "framer-motion";
import { useId, useState } from "react";
import type { WaterAnalysis } from "../lib/water";
import { dayFromYmd, eur, eur2, fmtDay, n0, n1, n2, parts } from "../lib/time";
import { Frame, Row } from "./chart";
import { EASE } from "./ui";

const ACC = "rgb(var(--acc))", ACC2 = "rgb(var(--acc2))", INK = "rgb(var(--ink))", INK2 = "rgb(var(--ink2))", NEG = "rgb(var(--neg))", CARD = "rgb(var(--card))";

// ── Débit par facture : chaque rectangle couvre la période facturée, sa hauteur est le débit moyen en litres par jour ──
export function PeriodChart({ a }: { a: WaterAnalysis }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);
  const H = 360, m = { l: 48, r: 14, t: 26, b: 30 };
  const P = a.periods;
  const yMax = Math.max(...P.map((p) => p.rate)) * 1.14;
  const hp = hover ? P[hover.i] : null;
  return (
    <Frame
      height={H}
      onLeave={() => setHover(null)}
      hover={hp && hover ? {
        x: hover.px, y: hover.py,
        content: (
          <>
            <b>{hp.label}</b>{hp.z > 2.5 && <span className="ml-2 text-[10.5px] font-bold uppercase tracking-wider text-neg">hors norme</span>}
            <Row k="Du" v={fmtDay(hp.a)} />
            <Row k="Au" v={fmtDay(hp.b)} />
            <Row k="Volume" v={`${n0(hp.m3)} m³ en ${hp.days} j`} />
            <Row k="Débit moyen" v={`${n0(hp.rate)} L/j`} />
            <Row k="Écart à la référence" v={`${hp.z >= 0 ? "+" : "−"}${n1(Math.abs(hp.z))} σ`} />
            <Row k="Facture" v={eur2(hp.eur)} />
            <Row k="Prix tout compris" v={`${n2(hp.unit)} €/m³`} />
            {hp.note && <div className="mt-1 max-w-[260px] whitespace-normal text-[11px] text-warn">{hp.note}</div>}
          </>
        ),
      } : null}
    >
      {(W) => {
        const x = scaleLinear([a.first - 20, a.last + 20], [m.l, W - m.r]);
        const y = scaleLinear([0, yMax], [H - m.b, m.t]);
        const years: number[] = [];
        for (let yy = parts(a.first).y + 1; dayFromYmd(yy, 0, 1) < a.last; yy++) years.push(yy);
        const lo = Math.max(0, a.refMean - 2 * a.refStd), hi = a.refMean + 2 * a.refStd;
        const ty = (d: number) => a.trendRef.intercept + a.trendRef.slope * a.yr(d);
        const refEnd = a.ref[a.ref.length - 1]?.b ?? a.last;
        return (
          <>
            <defs>
              <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ACC2} /><stop offset="1" stopColor={ACC2} stopOpacity="0.35" /></linearGradient>
              <linearGradient id={`${id}-w`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ACC} /><stop offset="1" stopColor={ACC} stopOpacity="0.35" /></linearGradient>
              <linearGradient id={`${id}-n`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={NEG} /><stop offset="1" stopColor={NEG} stopOpacity="0.35" /></linearGradient>
            </defs>
            {y.ticks(6).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="gridline" />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{n0(t)}</text>
              </g>
            ))}
            <text x={m.l - 36} y={m.t - 12} className="axis">L / jour</text>
            {years.map((yy) => (
              <g key={yy}>
                <line x1={x(dayFromYmd(yy, 0, 1))} x2={x(dayFromYmd(yy, 0, 1))} y1={H - m.b} y2={H - m.b + 6} stroke={INK2} strokeOpacity="0.6" />
                <text x={x(dayFromYmd(yy, 6, 1))} y={H - 8} textAnchor="middle" className="axis" style={{ fill: INK2 }}>{yy}</text>
              </g>
            ))}

            {/* Bande de référence : moyenne ± 2 écarts-types des factures 2020 → printemps 2025 */}
            <rect x={m.l} width={W - m.l - m.r} y={y(hi)} height={y(lo) - y(hi)} fill={INK} opacity="0.05" />
            <line x1={m.l} x2={W - m.r} y1={y(a.refMean)} y2={y(a.refMean)} stroke={INK2} strokeDasharray="4 5" />
            <text x={m.l + 8} y={y(hi) - 6} className="axis" style={{ fill: INK2 }}>plage habituelle · {n0(a.refMean)} L/j ± 2σ</text>

            {P.map((p, i) => {
              const x0 = x(p.a) + 1.5, w = Math.max(2, x(p.b) - x(p.a) - 3), h = y(0) - y(p.rate), bad = p.z > 2.5, on = hover?.i === i;
              return (
                <g key={p.id} onMouseMove={(e) => { const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover({ i, px: e.clientX - box.left, py: e.clientY - box.top }); }}>
                  <rect x={x0} y={m.t} width={w} height={H - m.t - m.b} fill="transparent" />
                  <motion.rect
                    x={x0} width={w} rx={6} fill={`url(#${id}-${bad ? "n" : p.summer ? "s" : "w"})`} opacity={on || !hover ? 1 : 0.5}
                    initial={{ height: 0, y: y(0) }} whileInView={{ height: h, y: y(p.rate) }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.05, ease: EASE }}
                  />
                  {w > 34 && <text x={x0 + w / 2} y={y(p.rate) - 7} textAnchor="middle" style={{ fontSize: 11.5, fontFamily: "JetBrains Mono", fill: bad ? NEG : INK }}>{n0(p.rate)}</text>}
                </g>
              );
            })}

            {/* Tendance de fond, sur la période de référence */}
            <motion.line
              x1={x(a.ref[0]?.a ?? a.first)} x2={x(refEnd)} y1={y(ty(a.ref[0]?.a ?? a.first))} y2={y(ty(refEnd))} stroke={INK} strokeWidth="1.5" strokeDasharray="6 5" strokeOpacity="0.7" pointerEvents="none"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, delay: 0.9 }}
            />
          </>
        );
      }}
    </Frame>
  );
}

// ── Années civiles : volume (barres) et dépense (points) ──────────────────────────────────────────────────────────
export function YearChart({ a }: { a: WaterAnalysis }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);
  const H = 300, m = { l: 44, r: 50, t: 28, b: 30 };
  const Y = a.years;
  const hy = hover ? Y[hover.i] : null;
  return (
    <Frame
      height={H}
      onLeave={() => setHover(null)}
      hover={hy && hover ? {
        x: hover.px, y: hover.py,
        content: (
          <>
            <b>{hy.y}</b>{!hy.full && <span className="ml-2 text-[10.5px] font-bold uppercase tracking-wider text-warn">année partielle</span>}
            <Row k="Volume" v={`${n0(hy.m3)} m³`} />
            <Row k="Dépense" v={eur(hy.eur)} />
            <Row k="Débit moyen" v={`${n0((hy.m3 * 1000) / hy.days)} L/j`} />
            <Row k="Jours couverts" v={`${hy.days}`} />
          </>
        ),
      } : null}
    >
      {(W) => {
        const x = scaleBand<number>(Y.map((_, i) => i), [m.l, W - m.r]).paddingInner(0.4).paddingOuter(0.25);
        const y = scaleLinear([0, Math.max(...Y.map((v) => v.m3)) * 1.18], [H - m.b, m.t]);
        const ye = scaleLinear([0, Math.max(...Y.map((v) => v.eur)) * 1.18], [H - m.b, m.t]);
        const bw = x.bandwidth(), cx = (i: number) => (x(i) ?? 0) + bw / 2;
        const full = Y.map((v, i) => ({ v, i })).filter((d) => d.v.full);
        return (
          <>
            <defs><linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ACC} /><stop offset="1" stopColor={ACC2} stopOpacity="0.5" /></linearGradient></defs>
            {y.ticks(5).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="gridline" />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
              </g>
            ))}
            {ye.ticks(5).map((t) => <text key={t} x={W - m.r + 8} y={ye(t) + 4} className="axis">{t} €</text>)}
            <text x={m.l - 8} y={m.t - 12} textAnchor="end" className="axis">m³</text>
            {Y.map((v, i) => (
              <g key={v.y} onMouseMove={(e) => { const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover({ i, px: e.clientX - box.left, py: e.clientY - box.top }); }}>
                <rect x={(x(i) ?? 0) - bw * 0.3} y={m.t} width={bw * 1.6} height={H - m.t} fill="transparent" />
                <motion.rect
                  x={x(i)} width={bw} rx={Math.min(8, bw / 3)} fill={`url(#${id}-b)`} opacity={v.full ? (hover && hover.i !== i ? 0.55 : 1) : 0.35}
                  initial={{ height: 0, y: y(0) }} whileInView={{ height: y(0) - y(v.m3), y: y(v.m3) }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.06, ease: EASE }}
                />
                <text x={cx(i)} y={y(v.m3) + 17} textAnchor="middle" style={{ fontSize: 12, fontWeight: 600, fontFamily: "JetBrains Mono", fill: "rgb(var(--onacc))", opacity: v.full ? 1 : 0.7 }}>{n0(v.m3)}</text>
                <text x={cx(i)} y={H - 9} textAnchor="middle" className="axis" style={{ fill: INK2, fontSize: 12 }}>{v.y}{v.full ? "" : "*"}</text>
              </g>
            ))}
            <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1 }} pointerEvents="none">
              <polyline points={full.map((d) => `${cx(d.i)},${ye(d.v.eur)}`).join(" ")} fill="none" stroke={INK} strokeWidth="1.5" strokeOpacity="0.8" />
              {full.map((d) => <circle key={d.i} cx={cx(d.i)} cy={ye(d.v.eur)} r="3.5" fill={CARD} stroke={INK} strokeWidth="1.5" />)}
            </motion.g>
          </>
        );
      }}
    </Frame>
  );
}

// ── Prix de l'eau tout compris, facture par facture, et sa tendance ───────────────────────────────────────────────
export function PriceChart({ a }: { a: WaterAnalysis }) {
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);
  const H = 300, m = { l: 44, r: 14, t: 22, b: 30 };
  const P = a.periods;
  const hp = hover ? P[hover.i] : null;
  return (
    <Frame
      height={H}
      onLeave={() => setHover(null)}
      hover={hp && hover ? { x: hover.px, y: hover.py, content: (<><b>{hp.label}</b><Row k="Prix tout compris" v={`${n2(hp.unit)} €/m³`} /><Row k="Facture" v={eur2(hp.eur)} /><Row k="Volume" v={`${n0(hp.m3)} m³`} /></>) } : null}
    >
      {(W) => {
        const x = scaleLinear([a.first - 20, a.last + 20], [m.l, W - m.r]);
        const us = P.map((p) => p.unit);
        const y = scaleLinear([Math.floor(Math.min(...us) * 2 - 0.4) / 2, Math.ceil(Math.max(...us) * 2 + 0.4) / 2], [H - m.b, m.t]);
        const ty = (d: number) => a.price.intercept + a.price.slope * a.yr(d);
        const years: number[] = [];
        for (let yy = parts(a.first).y + 1; dayFromYmd(yy, 0, 1) < a.last; yy++) years.push(yy);
        return (
          <>
            {y.ticks(5).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="gridline" />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{n2(t)}</text>
              </g>
            ))}
            <text x={m.l - 36} y={m.t - 8} className="axis">€ / m³</text>
            {years.map((yy) => <text key={yy} x={x(dayFromYmd(yy, 6, 1))} y={H - 8} textAnchor="middle" className="axis" style={{ fill: INK2 }}>{yy}</text>)}
            <motion.line x1={x(a.first)} x2={x(a.last)} y1={y(ty(a.first))} y2={y(ty(a.last))} stroke={INK} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="6 5" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} />
            <polyline points={P.map((p) => `${x(p.mid)},${y(p.unit)}`).join(" ")} fill="none" stroke={ACC} strokeWidth="2" strokeLinejoin="round" strokeOpacity="0.7" />
            {P.map((p, i) => (
              <g key={p.id}>
                <line x1={x(p.a) + 2} x2={x(p.b) - 2} y1={y(p.unit)} y2={y(p.unit)} stroke={p.summer ? ACC2 : ACC} strokeWidth="4" strokeLinecap="round" strokeOpacity="0.35" />
                <circle
                  cx={x(p.mid)} cy={y(p.unit)} r={hover?.i === i ? 6 : 4.5} fill={p.summer ? ACC2 : ACC} stroke={CARD} strokeWidth="2" style={{ cursor: "crosshair" }}
                  onMouseMove={(e) => { const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover({ i, px: e.clientX - box.left, py: e.clientY - box.top }); }}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            ))}
          </>
        );
      }}
    </Frame>
  );
}
