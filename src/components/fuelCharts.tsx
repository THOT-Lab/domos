import { scaleBand, scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import { motion } from "framer-motion";
import { useId, useMemo, useState } from "react";
import { MARKERS } from "../data/fuel";
import { ORDER_LEVEL, type FuelAnalysis } from "../lib/fuel";
import { temp } from "../lib/meteo";
import { MONTHS, dayFromYmd, dayOf, fmtDay, fmtDayShort, n0, n1, n2, parts, today } from "../lib/time";
import { Frame, Reveal, Row, type Hover } from "./chart";
import { EASE } from "./ui";

const ACC = "rgb(var(--acc))", ACC2 = "rgb(var(--acc2))", INK2 = "rgb(var(--ink2))", MUT = "rgb(var(--mut))", NEG = "rgb(var(--neg))", CARD = "rgb(var(--card))";

// Graduations de temps : mois ou années selon l'étendue affichée.
function timeTicks(x0: number, x1: number) {
  const span = x1 - x0, out: { day: number; label: string; major: boolean }[] = [];
  const p = parts(x0);
  for (let y = p.y, m = p.m; ; m++) {
    if (m > 11) { m = 0; y++; }
    const d = dayFromYmd(y, m, 1);
    if (d > x1) break;
    if (d < x0) continue;
    if (span > 1100) { if (m === 0) out.push({ day: d, label: String(y), major: true }); else if (m === 6) out.push({ day: d, label: "", major: false }); }
    else if (span > 500) { if (m % 3 === 0) out.push({ day: d, label: m === 0 ? String(y) : MONTHS[m], major: m === 0 }); }
    else out.push({ day: d, label: m === 0 ? String(y) : MONTHS[m], major: m === 0 });
  }
  return out;
}

// ── Historique de la cuve ──────────────────────────────────────────────────────────────────────────────────────────
export function LevelChart({ a, range }: { a: FuelAnalysis; range: "all" | "3y" | "season" }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<{ day: number; px: number; py: number } | null>(null);
  const H = 380, m = { l: 44, r: 14, t: 34, b: 30 };
  const now = today();
  const f = a.forecast;
  const horizon = Math.min(a.last + 420, (f.orderHi ?? f.orderDay ?? a.last + 240) + 25);
  const x0 = range === "all" ? a.first - 25 : range === "3y" ? a.last - 3 * 365 : a.seasons[a.seasons.length - 1].on - 30;
  const x1 = Math.max(horizon, now + 30);
  const fpath = useMemo(() => f.path.filter((p) => p.day <= x1), [f, x1]);
  const lookup = useMemo(() => {
    const map = new Map<number, number>();
    a.level.forEach((p) => map.set(p.day, p.level));
    return map;
  }, [a]);
  const fmap = useMemo(() => new Map(f.path.map((p) => [p.day, p])), [f]);
  const yMax = Math.max(70, Math.ceil(Math.max(...a.level.map((p) => p.level)) / 10) * 10);

  return (
    <Frame
      height={H}
      onLeave={() => setHover(null)}
      hover={hover && (() => {
        const d = hover.day, past = d <= a.last;
        const lv = past ? lookup.get(d) : fmap.get(d)?.level;
        if (lv == null) return null;
        const reading = a.readings.filter((r) => r.day === d), refill = a.refills.find((r) => r.day === d);
        const cons = past ? (d < a.last ? a.daily[d - a.first] : 0) : ((fmap.get(d - 1)?.level ?? lv) - lv) * a.litersPerPt;
        return {
          x: hover.px, y: hover.py,
          content: (
            <>
              <b>{fmtDay(d, true)}</b>{!past && <span className="ml-2 text-[10.5px] font-bold uppercase tracking-wider text-acc">{d <= a.weatherUntil ? "estimation" : "projection"}</span>}
              <Row k="Niveau" v={`${n1(lv)} %`} />
              <Row k="Volume" v={`${n0(lv * a.litersPerPt)} L`} />
              <Row k="Conso du jour" v={`${n1(cons)} L`} />
              <Row k="T° extérieure" v={`${n1(temp(d))} °C`} />
              {reading.map((r) => <div key={r.id} className="mt-1 font-bold text-acc">Relevé du carnet : {n1(r.level).replace(",0", "")} %</div>)}
              {refill && <div className="mt-1 font-bold text-pos">Livraison +{n0(refill.liters)} L</div>}
            </>
          ),
        };
      })() as Hover}
    >
      {(W) => {
        const x = scaleLinear([x0, x1], [m.l, W - m.r]);
        const y = scaleLinear([0, yMax], [H - m.b, m.t]);
        const pts = a.level;
        const ln = line<{ day: number; level: number }>().x((p) => x(p.day)).y((p) => y(p.level));
        const ar = area<{ day: number; level: number }>().x((p) => x(p.day)).y0(y(0)).y1((p) => y(p.level));
        const band = area<(typeof fpath)[number]>().x((p) => x(p.day)).y0((p) => y(p.lo)).y1((p) => y(p.hi));
        const ticks = timeTicks(x0, x1);
        const hd = hover?.day;
        const hv = hd != null ? (hd <= a.last ? lookup.get(hd) : fmap.get(hd)?.level) : undefined;
        return (
          <>
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={ACC} stopOpacity="0.42" />
                <stop offset="1" stopColor={ACC2} stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={ACC2} />
                <stop offset="1" stopColor={ACC} />
              </linearGradient>
              <clipPath id={`${id}-plot`}><rect x={m.l} y={0} width={W - m.l - m.r} height={H - m.b} /></clipPath>
            </defs>

            {/* Saisons de chauffe */}
            <g clipPath={`url(#${id}-plot)`}>
              {a.seasonStats.map((s) => {
                const sx = x(s.on), ex = x(s.open ? x1 : s.off);
                return (
                  <g key={s.label}>
                    <rect x={sx} y={m.t} width={Math.max(0, ex - sx)} height={H - m.b - m.t} fill={ACC} opacity="0.045" />
                    {ex - sx > 58 && <text x={sx + 8} y={H - m.b - 8} className="axis" style={{ fontSize: 10.5, letterSpacing: "0.08em" }}>{s.label}</text>}
                  </g>
                );
              })}
            </g>

            {/* Grille */}
            {y.ticks(7).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="gridline" />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{t} %</text>
              </g>
            ))}
            {ticks.map((t) => (
              <g key={t.day}>
                <line x1={x(t.day)} x2={x(t.day)} y1={H - m.b} y2={H - m.b + (t.major ? 6 : 3)} stroke={MUT} strokeOpacity="0.6" />
                {t.label && <text x={x(t.day)} y={H - 8} textAnchor="middle" className="axis" style={t.major ? { fill: INK2 } : undefined}>{t.label}</text>}
              </g>
            ))}

            {/* Seuil de commande */}
            <line x1={m.l} x2={W - m.r} y1={y(ORDER_LEVEL)} y2={y(ORDER_LEVEL)} stroke={NEG} strokeDasharray="3 5" strokeOpacity="0.8" />
            <text x={m.l + 8} y={y(ORDER_LEVEL) - 6} className="axis" style={{ fill: NEG }}>seuil de commande {ORDER_LEVEL} %</text>

            <g clipPath={`url(#${id}-plot)`}>
              {/* Repères du carnet (travaux) */}
              {MARKERS.map((mk) => {
                const d = dayOf(mk.date);
                return (
                  <g key={mk.date}>
                    <line x1={x(d)} x2={x(d)} y1={m.t + 4} y2={H - m.b} stroke={INK2} strokeDasharray="2 4" />
                    <text x={x(d) + 6} y={m.t + 14} className="axis" style={{ fill: INK2 }}>{mk.label}</text>
                  </g>
                );
              })}

              <Reveal width={W} height={H}>
                <path d={ar(pts) ?? ""} fill={`url(#${id}-fill)`} />
                <path d={ln(pts) ?? ""} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="2" strokeLinejoin="round" />
                {/* Projection */}
                <path d={band(fpath) ?? ""} fill={ACC} opacity="0.12" />
                <path d={ln(fpath) ?? ""} fill="none" stroke={ACC} strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
                {/* Livraisons */}
                {a.refills.map((r) => (
                  <g key={r.id} transform={`translate(${x(r.day)} ${m.t - 6})`}>
                    <line y1={10} y2={H - m.b - m.t + 6} stroke="rgb(var(--pos))" strokeOpacity="0.35" strokeDasharray="1 4" />
                    <rect x={-21} y={-10} width={42} height={17} rx={8.5} fill="rgb(var(--pos))" fillOpacity="0.14" stroke="rgb(var(--pos))" strokeOpacity="0.4" />
                    <text y={2.5} textAnchor="middle" style={{ fontSize: 10, fontWeight: 800, fill: "rgb(var(--pos))" }}>+{n0(r.liters)}</text>
                  </g>
                ))}
                {/* Relevés */}
                {a.readings.map((r) => (
                  <circle key={r.id} cx={x(r.day)} cy={y(r.level)} r={range === "all" ? 2.6 : 3.4} fill={r.approx ? CARD : ACC} stroke={r.approx ? ACC : CARD} strokeWidth="1.2" />
                ))}
              </Reveal>

              {/* Aujourd'hui */}
              {now > a.last && now <= x1 && (
                <g transform={`translate(${x(now)} ${y(f.todayLevel)})`}>
                  <circle r="5" fill="none" stroke={ACC} style={{ transformBox: "fill-box", transformOrigin: "center", animation: "pulse-ring 2.2s ease-out infinite" }} />
                  <circle r="4.5" fill={ACC} stroke={CARD} strokeWidth="2" />
                  <text x={8} y={-10} className="axis" style={{ fill: ACC, fontWeight: 800 }}>aujourd'hui · {n0(f.todayLevel)} %</text>
                </g>
              )}
              {f.orderDay && f.orderDay <= x1 && (
                <g transform={`translate(${x(f.orderDay)} ${y(ORDER_LEVEL)})`}>
                  <circle r="4" fill={NEG} stroke={CARD} strokeWidth="2" />
                  <text x={-8} y={18} textAnchor="end" className="axis" style={{ fill: NEG, fontWeight: 800 }}>{fmtDayShort(f.orderDay)}</text>
                </g>
              )}

              {/* Survol */}
              {hd != null && hv != null && (
                <g pointerEvents="none">
                  <line x1={x(hd)} x2={x(hd)} y1={m.t} y2={H - m.b} stroke={INK2} strokeOpacity="0.5" />
                  <circle cx={x(hd)} cy={y(hv)} r="5" fill={ACC} stroke={CARD} strokeWidth="2" />
                </g>
              )}
            </g>
            <rect
              x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.b - m.t} fill="transparent"
              onMouseMove={(e) => {
                const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                const d = Math.round(x.invert(e.clientX - box.left));
                setHover(d >= a.first && d <= (fpath[fpath.length - 1]?.day ?? a.last) ? { day: d, px: e.clientX - box.left, py: e.clientY - box.top } : null);
              }}
            />
          </>
        );
      }}
    </Frame>
  );
}

// ── Saisons de chauffe ─────────────────────────────────────────────────────────────────────────────────────────────
export function SeasonChart({ a }: { a: FuelAnalysis }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);
  const H = 320, m = { l: 48, r: 12, t: 30, b: 46 };
  const S = a.seasonStats;
  const yMax = Math.max(...S.map((s) => Math.max(s.liters, s.open ? 0 : s.normalized))) * 1.16;
  const hs = hover ? S[hover.i] : null;
  return (
    <Frame
      height={H}
      onLeave={() => setHover(null)}
      hover={hs && hover ? {
        x: hover.px, y: hover.py,
        content: (
          <>
            <b>Saison {hs.label}</b>{hs.open && <span className="ml-2 text-[10.5px] font-bold uppercase tracking-wider text-acc">en cours</span>}
            <Row k="Du" v={`${fmtDay(hs.on)}`} />
            <Row k="Au" v={`${fmtDay(hs.off)}`} />
            <Row k="Consommé" v={`${n0(hs.liters)} L`} />
            <Row k="Par jour de chauffe" v={`${n1(hs.liters / hs.days)} L`} />
            <Row k="Rigueur" v={`${n0(hs.dju)} DJU`} />
            <Row k="T° ext. moyenne" v={`${n1(hs.meanTemp)} °C`} />
            <Row k="Signature" v={`${n2(hs.k)} L/DJU`} />
            {!hs.open && <Row k="À climat normal" v={`${n0(hs.normalized)} L`} />}
            {hs.approx && <div className="mt-1 text-[11px] text-warn">Dates approximatives dans le carnet</div>}
          </>
        ),
      } : null}
    >
      {(W) => {
        const x = scaleBand<number>(S.map((_, i) => i), [m.l, W - m.r]).paddingInner(0.42).paddingOuter(0.3);
        const y = scaleLinear([0, yMax], [H - m.b, m.t]);
        const bw = x.bandwidth();
        const C = a.complete;
        const tr = a.trendK, mid = (i: number) => (x(i) ?? 0) + bw / 2;
        return (
          <>
            <defs>
              <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={ACC} />
                <stop offset="1" stopColor={ACC2} stopOpacity="0.55" />
              </linearGradient>
            </defs>
            {y.ticks(5).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="gridline" />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{n0(t)}</text>
              </g>
            ))}
            <text x={m.l - 8} y={m.t - 14} textAnchor="end" className="axis">litres</text>
            {S.map((s, i) => {
              const bx = x(i) ?? 0, h = y(0) - y(s.liters), on = hover?.i === i;
              return (
                <g key={s.label} onMouseMove={(e) => { const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover({ i, px: e.clientX - box.left, py: e.clientY - box.top }); }}>
                  <rect x={bx - bw * 0.3} y={m.t} width={bw * 1.6} height={H - m.t - 8} fill="transparent" />
                  <motion.rect
                    x={bx} width={bw} rx={Math.min(8, bw / 3)} fill={`url(#${id}-bar)`} opacity={s.open ? 0.45 : on || !hover ? 1 : 0.55}
                    initial={{ height: 0, y: y(0) }} whileInView={{ height: Math.max(2, h), y: y(0) - Math.max(2, h) }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.07, ease: EASE }}
                  />
                  {!s.open && (
                    <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.9 + i * 0.07 }}>
                      <line x1={bx - 7} x2={bx + bw + 7} y1={y(s.normalized)} y2={y(s.normalized)} stroke="rgb(var(--ink))" strokeWidth="2" strokeLinecap="round" />
                      <circle cx={bx + bw + 7} cy={y(s.normalized)} r="3" fill="rgb(var(--ink))" />
                    </motion.g>
                  )}
                  <text x={bx + bw / 2} y={y(Math.max(s.liters, s.open ? 0 : s.normalized)) - 9} textAnchor="middle" className="num" style={{ fontSize: 12, fill: "rgb(var(--ink))", fontFamily: "JetBrains Mono" }}>{s.open ? "en cours" : n0(s.liters)}</text>
                  <text x={bx + bw / 2} y={H - m.b + 18} textAnchor="middle" className="axis" style={{ fill: INK2, fontSize: 12 }}>{s.label}{s.approx ? " ≈" : ""}</text>
                  <text x={bx + bw / 2} y={H - m.b + 34} textAnchor="middle" className="axis" style={{ fontSize: 10.5 }}>{s.open ? "" : `${n0(s.dju)} DJU`}</text>
                </g>
              );
            })}
            {C.length > 2 && (
              <motion.line
                x1={mid(0)} x2={mid(C.length - 1)} y1={y(tr.intercept * a.djuNormal)} y2={y((tr.intercept + tr.slope * (C.length - 1)) * a.djuNormal)}
                stroke="rgb(var(--ink))" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="5 5" pointerEvents="none"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 1.2 }}
              />
            )}
          </>
        );
      }}
    </Frame>
  );
}

// ── Régression : litres par jour selon les degrés-jours ────────────────────────────────────────────────────────────
export function Scatter({ a }: { a: FuelAnalysis }) {
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);
  const H = 380, m = { l: 48, r: 16, t: 18, b: 42 };
  const P = a.scatter;
  const recent = new Set(a.after.map((s) => s.label));
  const isRecent = (i: number) => { const s = a.seasonStats[P[i].it.season]; return !s || recent.has(s.label) || s.open; };
  const xMax = Math.max(...P.map((p) => p.x)) * 1.08, yMax = Math.max(...P.map((p) => p.y)) * 1.1;
  const hp = hover ? P[hover.i] : null;
  return (
    <Frame
      height={H}
      onLeave={() => setHover(null)}
      hover={hp && hover ? {
        x: hover.px, y: hover.py,
        content: (
          <>
            <b>{fmtDayShort(hp.it.a)} → {fmtDay(hp.it.b)}</b>
            <Row k="Durée" v={`${hp.it.days} jours`} />
            <Row k="Jauge" v={`${n1(hp.it.l0)} → ${n1(hp.it.l1)} %`} />
            <Row k="Consommé" v={`${n0(hp.it.usedL)} L`} />
            <Row k="Rythme mesuré" v={`${n1(hp.y)} L/j`} />
            <Row k="Rythme du modèle" v={`${n1((isRecent(hover.i) ? a.kRange.mean : a.kRange.early) * hp.x)} L/j`} />
            <Row k="Rigueur" v={`${n1(hp.x)} DJU/j`} />
          </>
        ),
      } : null}
    >
      {(W) => {
        const x = scaleLinear([0, xMax], [m.l, W - m.r]);
        const y = scaleLinear([0, yMax], [H - m.b, m.t]);
        const ray = (k: number) => { const xe = Math.min(xMax, yMax / k); return { x2: x(xe), y2: y(k * xe) }; };
        const r1 = ray(a.kRange.mean), r0 = ray(a.kRange.early), rl = ray(a.kRange.lo), rh = ray(a.kRange.hi);
        return (
          <>
            {y.ticks(6).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="gridline" />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
              </g>
            ))}
            {x.ticks(8).map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} className="gridline" />
                <text x={x(t)} y={H - m.b + 16} textAnchor="middle" className="axis">{t}</text>
              </g>
            ))}
            <text x={W - m.r} y={H - 6} textAnchor="end" className="axis">degrés-jours par jour (base {n1(a.base).replace(",0", "")} °C) : plus c'est à droite, plus il fait froid</text>
            <text x={m.l - 36} y={m.t - 4} className="axis">L / jour</text>

            <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.5 }} pointerEvents="none">
              <path d={`M${x(0)} ${y(0)} L${rl.x2} ${rl.y2} L${rh.x2} ${rh.y2} Z`} fill={ACC} opacity="0.1" />
              <line x1={x(0)} y1={y(0)} {...r0} stroke={INK2} strokeWidth="1.5" strokeDasharray="5 5" />
              <line x1={x(0)} y1={y(0)} {...r1} stroke={ACC} strokeWidth="2.5" strokeLinecap="round" />
              <text x={r0.x2 - 6} y={r0.y2 + 4} textAnchor="end" className="axis" style={{ fill: INK2, fontWeight: 800 }} transform={`translate(-8 12)`}>avant · {n2(a.kRange.early)} L/DJU</text>
              <text x={r1.x2 - 6} y={r1.y2 + 20} textAnchor="end" className="axis" style={{ fill: ACC, fontWeight: 800 }}>depuis {a.after[0]?.label} · {n2(a.kRange.mean)} L/DJU</text>
            </motion.g>

            {P.map((p, i) => {
              const rec = isRecent(i), on = hover?.i === i;
              return (
                <motion.circle
                  key={i} cx={x(p.x)} cy={y(p.y)} fill={rec ? ACC : INK2} fillOpacity={on ? 1 : rec ? 0.55 : 0.4} stroke={rec ? ACC : INK2} strokeWidth={on ? 2.5 : 1}
                  initial={{ r: 0 }} whileInView={{ r: 3 + Math.sqrt(p.w) * 0.95 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 180, damping: 16, delay: 0.1 + i * 0.012 }}
                  onMouseMove={(e) => { const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover({ i, px: e.clientX - box.left, py: e.clientY - box.top }); }}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: "crosshair" }}
                />
              );
            })}
          </>
        );
      }}
    </Frame>
  );
}

// Courbe de l'erreur du modèle selon la température de base : montre que l'optimum n'est pas choisi au hasard.
export function BaseCurve({ a }: { a: FuelAnalysis }) {
  const W = 220, H = 56;
  const xs = a.scan.map((s) => s.base), es = a.scan.map((s) => Math.sqrt(s.sse));
  const x = scaleLinear([xs[0], xs[xs.length - 1]], [4, W - 4]);
  const y = scaleLinear([Math.min(...es), Math.max(...es)], [H - 8, 6]);
  const d = line<number>().x((_, i) => x(xs[i])).y((e) => y(e))(es) ?? "";
  const cur = a.scan.reduce((p, q) => (Math.abs(q.base - a.base) < Math.abs(p.base - a.base) ? q : p));
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={MUT} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <line x1={x(a.bestBase)} x2={x(a.bestBase)} y1={4} y2={H - 4} stroke={ACC} strokeOpacity="0.4" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <circle cx={x(cur.base)} cy={y(Math.sqrt(cur.sse))} r="4" fill={ACC} stroke={CARD} strokeWidth="2" />
    </svg>
  );
}

// ── Saisonnalité : profil moyen par mois, puis chaque saison en carte de chaleur ───────────────────────────────────
export function MonthGrid({ a }: { a: FuelAnalysis }) {
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const max = Math.max(...a.profile.map((p) => p.max), 1);
  const cellMax = Math.max(...a.monthly.flat().map((c) => c.liters / c.days), 0.1);
  const cols = "76px repeat(8, minmax(0, 1fr)) 68px";
  return (
    <div className="min-w-[640px]">
      {/* Profil moyen */}
      <div className="grid items-end gap-1.5" style={{ gridTemplateColumns: cols, height: 190 }}>
        <div className="label self-end pb-1">Moyenne</div>
        {a.profile.map((p, j) => {
          const h = (p.liters / max) * 138;
          return (
            <div key={p.m} className="relative h-full">
              <div className="num absolute inset-x-0 text-center text-[12.5px] text-ink" style={{ bottom: Math.max(3, h, (p.max / max) * 138) + 6 }}>{p.liters >= 1 ? n0(p.liters) : "0"}<span className="ml-0.5 font-sans text-[10px] text-mut">L</span></div>
              <div className="absolute inset-x-0 bottom-0" style={{ height: Math.max(3, h) }}>
                <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: j * 0.06, ease: EASE }} className="absolute inset-0 origin-bottom rounded-t-lg" style={{ background: `linear-gradient(180deg, ${ACC}, rgb(var(--acc2) / 0.5))`, opacity: p.liters >= 1 ? 1 : 0.25 }} />
              </div>
              {p.liters >= 1 && (
                <div className="absolute left-1/2 w-px -translate-x-1/2 bg-ink/70" style={{ bottom: (p.min / max) * 138, height: Math.max(1, ((p.max - p.min) / max) * 138) }} title="Du mois le plus sobre au plus gourmand">
                  <i className="absolute -left-1 top-0 h-px w-[9px] bg-ink/70" /><i className="absolute -left-1 bottom-0 h-px w-[9px] bg-ink/70" />
                </div>
              )}
            </div>
          );
        })}
        <div />
      </div>
      <div className="mt-1 grid gap-1.5 border-t border-line/60 pt-1.5" style={{ gridTemplateColumns: cols }}>
        <div />
        {a.profile.map((p) => (
          <div key={p.m} className="text-center">
            <div className="text-[12px] font-bold text-ink2">{MONTHS[p.m]}</div>
            <div className="num text-[10.5px] text-mut">{n1(p.meanTemp)} °C</div>
          </div>
        ))}
        <div className="label self-center text-right">Saison</div>
      </div>
      {/* Carte de chaleur */}
      <div className="mt-2 space-y-1.5">
        {a.monthly.map((row, r) => {
          const s = a.seasonStats[r];
          return (
            <div key={s.label} className="grid items-center gap-1.5" style={{ gridTemplateColumns: cols }}>
              <div className="text-[12px] font-bold text-ink2">{s.label}{s.approx ? " ≈" : ""}</div>
              {row.map((c, j) => {
                const t = c.liters / c.days / cellMax, on = sel?.r === r && sel?.c === j;
                const future = c.liters < 0.5 && !c.covered;
                return (
                  <motion.div
                    key={j} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: r * 0.04 + j * 0.03 }}
                    onMouseEnter={() => setSel({ r, c: j })} onMouseLeave={() => setSel(null)}
                    className={`num relative grid h-9 place-items-center rounded-lg text-[11.5px] transition ${on ? "ring-2 ring-acc" : "ring-1 ring-line/40"}`}
                    style={{ background: future ? "transparent" : `rgb(var(--acc) / ${0.05 + t * 0.8})`, color: t > 0.55 ? "rgb(var(--onacc))" : "rgb(var(--ink2))", borderStyle: "dashed" }}
                    title={`${MONTHS[c.m]} ${c.y} : ${n0(c.liters)} L, ${n1(c.liters / c.days)} L/jour, ${n1(c.meanTemp)} °C dehors`}
                  >
                    {future ? "·" : c.liters >= 1 ? n0(c.liters) : "0"}
                  </motion.div>
                );
              })}
              <div className="num text-right text-[12px] text-ink">{s.open ? "…" : n0(s.liters)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
