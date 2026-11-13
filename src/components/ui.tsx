import { AnimatePresence, animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTheme } from "../lib/store";

export const EASE = [0.2, 0.8, 0.2, 1] as const;

export function Logo({ size = 34, sub }: { size?: number; sub?: string }) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgb(var(--fuel))" />
            <stop offset="1" stopColor="rgb(var(--eau))" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="rgb(var(--soft))" stroke="rgb(var(--line))" />
        <path d="M13 31 32 15l19 16v17a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z" fill="none" stroke={`url(#${id})`} strokeWidth="4" strokeLinejoin="round" />
        <path d="M21 41c4-3 7 3 11 0s7 3 11 0" fill="none" stroke={`url(#${id})`} strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <div className="text-left leading-none">
        <div className="font-display text-[19px] font-bold tracking-tight text-ink">
          Dom<span className="grad-duo">os</span>
        </div>
        {sub && <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-mut">{sub}</div>}
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <button onClick={toggle} className="btn !px-2.5" title={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"} aria-label="Changer de thème">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.25 }}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

// Bande de page : un titre commun, un filet fin, puis le contenu (le motif des pages d'EasyLoc).
export function Band({ id, title, hint, action, children }: { id?: string; title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, ease: EASE }} className="mt-12 first:mt-0">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line/50 pb-2.5">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[19px] font-semibold tracking-tight text-ink">{title}</h2>
          {hint && <p className="hidden text-[13px] text-ink2 md:block">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </motion.section>
  );
}

export function Card({ children, className = "", title, kicker, action }: { children: ReactNode; className?: string; title?: ReactNode; kicker?: string; action?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || kicker || action) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-4">
          <div>
            {kicker && <div className="kicker mb-1">{kicker}</div>}
            {title && <h3 className="font-display text-[15.5px] font-semibold tracking-tight text-ink">{title}</h3>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

// Un chiffre qui défile jusqu'à sa valeur quand il entre à l'écran.
export function Count({ value, format }: { value: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (!seen) return;
    const c = animate(mv, value, { duration: 1.2, ease: EASE });
    return c.stop;
  }, [value, seen]);
  return <motion.span ref={ref}>{text}</motion.span>;
}

export function Stat({ label, value, format, unit, hint, tone, className = "" }: { label: string; value: number; format: (v: number) => string; unit?: string; hint?: ReactNode; tone?: "acc" | "neg" | "pos"; className?: string }) {
  const color = tone === "acc" ? "text-acc" : tone === "neg" ? "text-neg" : tone === "pos" ? "text-pos" : "text-ink";
  return (
    <div className={`card group relative overflow-hidden px-4 py-3.5 transition hover:border-acc/40 ${className}`}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-acc/10 blur-2xl transition group-hover:bg-acc/20" />
      <div className="label">{label}</div>
      <div className={`num mt-1.5 text-[24px] font-medium leading-none ${color}`}>
        <Count value={value} format={format} />
        {unit && <span className="ml-1.5 font-sans text-[12px] font-semibold tracking-normal text-mut">{unit}</span>}
      </div>
      {hint && <div className="mt-1.5 text-[12px] leading-snug text-ink2">{hint}</div>}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, id }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; id: string }) {
  return (
    <div className="relative inline-flex rounded-full border border-line/70 bg-soft/60 p-0.5 text-[12.5px]">
      {options.map((o) => (
        <button key={String(o.value)} onClick={() => onChange(o.value)} className={`relative z-10 rounded-full px-3 py-1 font-semibold transition ${value === o.value ? "text-onacc" : "text-ink2 hover:text-ink"}`}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 -z-10 rounded-full" style={{ background: "linear-gradient(135deg, rgb(var(--acc)), rgb(var(--acc2)))" }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pill({ children, tone = "acc", title }: { children: ReactNode; tone?: "acc" | "pos" | "neg" | "warn" | "mut"; title?: string }) {
  const map = { acc: "bg-acc/15 text-acc ring-acc/25", pos: "bg-pos/15 text-pos ring-pos/25", neg: "bg-neg/15 text-neg ring-neg/25", warn: "bg-warn/15 text-warn ring-warn/25", mut: "bg-mut/10 text-ink2 ring-line" };
  return <span title={title} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${map[tone]}`}>{children}</span>;
}

// Légende d'un graphique.
export function Key({ items }: { items: { label: string; color?: string; kind?: "line" | "dash" | "dot" | "box" | "band" }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-ink2">
      {items.map((it) => {
        const c = it.color ?? "rgb(var(--acc))";
        return (
          <span key={it.label} className="inline-flex items-center gap-1.5">
            {it.kind === "dot" ? <i className="h-2 w-2 rounded-full" style={{ background: c }} />
              : it.kind === "box" ? <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
              : it.kind === "band" ? <i className="h-2.5 w-4 rounded-[3px]" style={{ background: c, opacity: 0.3 }} />
              : <i className="h-0 w-4 border-t-2" style={{ borderColor: c, borderStyle: it.kind === "dash" ? "dashed" : "solid" }} />}
            {it.label}
          </span>
        );
      })}
    </div>
  );
}

// Constat numéroté de la lecture des données.
export function Finding({ n, title, children, tone = "acc" }: { n: number; title: ReactNode; children: ReactNode; tone?: "acc" | "neg" | "pos" | "warn" }) {
  const c = { acc: "text-acc", neg: "text-neg", pos: "text-pos", warn: "text-warn" }[tone];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: (n - 1) * 0.05, ease: EASE }} className="card relative overflow-hidden p-5">
      <div className={`num text-[11px] font-semibold ${c}`}>{String(n).padStart(2, "0")}</div>
      <h4 className="mt-1 font-display text-[15.5px] font-semibold leading-snug text-ink">{title}</h4>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink2">{children}</p>
    </motion.div>
  );
}
