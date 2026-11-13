import { motion } from "framer-motion";
import { useId } from "react";
import { EASE } from "./ui";

// Une vague : sinusoïde de `periods` périodes, refermée vers le bas. Tracée deux fois plus large que la jauge pour glisser sans couture.
const wavePath = (width: number, amp: number, periods: number, depth: number) => {
  const half = width / periods / 2;
  let d = `M0 0`;
  for (let i = 0; i < periods * 2; i++) d += ` q${half / 2} ${i % 2 ? amp : -amp} ${half} 0`;
  return `${d} V${depth} H0 Z`;
};

function Liquid({ w, h, level, clip, id }: { w: number; h: number; level: number; clip?: string; id: string }) {
  const y = h * (1 - Math.max(0, Math.min(1, level)));
  return (
    <g clipPath={clip ? `url(#${clip})` : undefined}>
      <motion.g initial={{ y: h }} animate={{ y }} transition={{ duration: 1.8, ease: EASE }}>
        <g className="wave-b" style={{ transformBox: "fill-box" }}>
          <path d={wavePath(w * 2, 4, 4, h + 10)} fill={`url(#${id}-b)`} opacity="0.55" transform="translate(0 -3)" />
        </g>
        <g className="wave-a" style={{ transformBox: "fill-box" }}>
          <path d={wavePath(w * 2, 3, 6, h + 10)} fill={`url(#${id}-a)`} />
        </g>
      </motion.g>
    </g>
  );
}

function Defs({ id }: { id: string }) {
  return (
    <>
      <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="rgb(var(--acc))" />
        <stop offset="1" stopColor="rgb(var(--acc2))" stopOpacity="0.85" />
      </linearGradient>
      <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="rgb(var(--acc2))" />
        <stop offset="1" stopColor="rgb(var(--acc))" />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
        <stop offset="0.25" stopColor="#fff" stopOpacity="0.02" />
        <stop offset="0.8" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.16" />
      </linearGradient>
    </>
  );
}

// Cuve : niveau en fraction (0 → 1), graduations tous les 25 %, repère du seuil de commande.
export function Tank({ level, threshold = 0.15, width = 150, height = 230 }: { level: number; threshold?: number; width?: number; height?: number }) {
  const id = useId().replace(/:/g, "");
  const w = 120, h = 200, x0 = 20, y0 = 15;
  return (
    <svg width={width} height={height} viewBox="0 0 160 230" role="img" aria-label={`Cuve remplie à ${Math.round(level * 100)} %`}>
      <defs>
        <Defs id={id} />
        <clipPath id={`${id}-clip`}><rect x="0" y="0" width={w} height={h} rx="30" /></clipPath>
      </defs>
      <ellipse cx="80" cy="222" rx="52" ry="5" fill="rgb(var(--acc))" opacity="0.18" style={{ filter: "blur(6px)" }} />
      <g transform={`translate(${x0} ${y0})`}>
        <rect width={w} height={h} rx="30" fill="rgb(var(--soft))" stroke="rgb(var(--line))" strokeWidth="1.5" />
        <Liquid w={w} h={h} level={level} clip={`${id}-clip`} id={id} />
        <g clipPath={`url(#${id}-clip)`}>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={30 + i * 28} cy={h - 12} r={2 + i} fill="#fff" opacity="0" style={{ animation: `bubble ${4 + i * 1.6}s ease-in ${i * 1.3}s infinite` }} />
          ))}
        </g>
        <rect width={w} height={h} rx="30" fill={`url(#${id}-glass)`} />
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={w - 16} x2={w - 6} y1={h * (1 - t)} y2={h * (1 - t)} stroke="rgb(var(--ink))" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
        ))}
        <line x1="4" x2={w - 4} y1={h * (1 - threshold)} y2={h * (1 - threshold)} stroke="rgb(var(--neg))" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.9" />
        <rect width={w} height={h} rx="30" fill="none" stroke="rgb(var(--line))" strokeWidth="1.5" />
      </g>
      <rect x="62" y="6" width="36" height="12" rx="4" fill="rgb(var(--soft))" stroke="rgb(var(--line))" strokeWidth="1.5" />
    </svg>
  );
}

// Goutte : remplie selon un ratio (0 → 1), par exemple le débit actuel rapporté au double de la référence.
export function Drop({ level, width = 150, height = 230 }: { level: number; width?: number; height?: number }) {
  const id = useId().replace(/:/g, "");
  const path = "M80 12 C80 12 22 92 22 140 a58 58 0 0 0 116 0 C138 92 80 12 80 12 Z";
  return (
    <svg width={width} height={height} viewBox="0 0 160 230" role="img" aria-label="Jauge d'eau">
      <defs>
        <Defs id={id} />
        <clipPath id={`${id}-clip`}><path d={path} /></clipPath>
      </defs>
      <ellipse cx="80" cy="222" rx="46" ry="5" fill="rgb(var(--acc))" opacity="0.18" style={{ filter: "blur(6px)" }} />
      <path d={path} fill="rgb(var(--soft))" stroke="rgb(var(--line))" strokeWidth="1.5" />
      <g transform="translate(22 12)">
        <g transform="translate(-22 -12)" clipPath={`url(#${id}-clip)`}>
          <g transform="translate(22 12)">
            <Liquid w={116} h={186} level={level} id={id} />
          </g>
        </g>
      </g>
      <path d="M52 128 a30 30 0 0 0 14 40" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
      <path d={path} fill="none" stroke="rgb(var(--line))" strokeWidth="1.5" />
    </svg>
  );
}
