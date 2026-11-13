import { motion } from "framer-motion";
import { ArrowUpRight, Droplets, Flame } from "lucide-react";
import type { ReactNode } from "react";
import { Drop, Tank } from "../components/gauges";
import { Count, EASE, Logo, ThemeToggle } from "../components/ui";
import { ORDER_LEVEL, type FuelAnalysis } from "../lib/fuel";
import { meteoInfo } from "../lib/meteo";
import { go, type Route } from "../lib/store";
import { fmtDay, fmtMonth, n0, n2 } from "../lib/time";
import type { WaterAnalysis } from "../lib/water";

function Tile({ res, icon, title, tagline, gauge, big, unit, caption, facts, delay }: { res: Route; icon: ReactNode; title: string; tagline: string; gauge: ReactNode; big: ReactNode; unit: string; caption: ReactNode; facts: { k: string; v: string }[]; delay: number }) {
  return (
    <motion.button
      data-res={res} onClick={() => go(res)}
      initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay, ease: EASE }} whileHover={{ y: -6 }} whileTap={{ scale: 0.985 }}
      className="card group relative overflow-hidden p-7 text-left transition-colors hover:border-acc/50"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-acc/15 blur-3xl transition-opacity duration-500 group-hover:opacity-100 sm:opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-acc/60 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-acc/15 text-acc ring-1 ring-acc/25">{icon}</span>
          <div>
            <h2 className="font-display text-[24px] font-semibold leading-none tracking-tight text-ink">{title}</h2>
            <p className="mt-1.5 text-[13px] text-ink2">{tagline}</p>
          </div>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full border border-line/70 text-ink2 transition group-hover:rotate-45 group-hover:border-acc group-hover:bg-acc group-hover:text-onacc"><ArrowUpRight size={17} /></span>
      </div>
      <div className="mt-6 flex items-center gap-6">
        <div className="shrink-0">{gauge}</div>
        <div className="min-w-0">
          <div className="num text-[58px] font-medium leading-none tracking-tighter text-ink">
            {big}<span className="ml-2 font-sans text-[18px] font-bold tracking-normal text-acc">{unit}</span>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink2">{caption}</p>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line/50 pt-4">
        {facts.map((f) => (
          <div key={f.k}>
            <dt className="label">{f.k}</dt>
            <dd className="num mt-1 text-[15px] text-ink">{f.v}</dd>
          </div>
        ))}
      </dl>
    </motion.button>
  );
}

export default function Home({ fa, wa }: { fa: FuelAnalysis; wa: WaterAnalysis }) {
  const f = fa.forecast, lastW = wa.lastP;
  const ratio = lastW ? lastW.rate / wa.refMean : 1;
  return (
    <div className="min-h-screen">
      <header className="clear-corner flex items-center justify-between px-6 py-4">
        <Logo sub="Ressources domestiques" />
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-[1180px] px-5 pb-20">
        <section className="pb-10 pt-10 text-center sm:pt-16">
          <motion.h1 initial={{ opacity: 0, y: 18, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: EASE }} className="font-display text-[84px] font-semibold leading-[0.95] tracking-[-0.04em] text-ink sm:text-[112px]">
            Dom<span className="grad-duo">os</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.25 }} className="mt-4 text-[13px] font-bold uppercase tracking-[0.34em] text-ink2">
            Suivi des ressources domestiques
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="mx-auto mt-5 max-w-[560px] text-[15px] leading-relaxed text-ink2">
            Un carnet, quelques relevés pris quand on y pense. Domos les croise avec la météo réelle de la maison et en tire des moyennes, des saisons, et une loi.
          </motion.p>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Tile
            res="fuel" delay={0.35} icon={<Flame size={22} />} title="Fuel" tagline="Cuve de chauffage"
            gauge={<Tank level={f.todayLevel / 100} threshold={ORDER_LEVEL / 100} width={118} height={180} />}
            big={<Count value={f.todayLevel} format={n0} />} unit="%"
            caption={<>≈ {n0(f.todayLiters)} L dans la cuve aujourd'hui. {f.orderDay ? <>Prochaine commande vers <b className="text-ink">{fmtMonth(f.orderDay)}</b>.</> : "Pas de commande à prévoir avant un an."}</>}
            facts={[{ k: "Par saison", v: `${n0(fa.totals.perSeasonAfter)} L` }, { k: "Signature", v: `${n2(fa.kRange.mean)} L/DJU` }, { k: "Relevés", v: `${fa.readings.length}` }]}
          />
          <Tile
            res="eau" delay={0.47} icon={<Droplets size={22} />} title="Conso eau" tagline="Compteur de la maison"
            gauge={<Drop level={Math.min(1, ratio / 2)} width={118} height={180} />}
            big={<Count value={lastW?.rate ?? 0} format={n0} />} unit="L / jour"
            caption={<>Dernière facture ({lastW?.label.toLowerCase()}), soit <b className={ratio > 1.25 ? "text-neg" : "text-ink"}>{ratio >= 1 ? "+" : "−"}{n0(Math.abs(ratio - 1) * 100)} %</b> par rapport à l'habitude de la maison.</>}
            facts={[{ k: "Par an", v: `${n0(wa.totals.perYearM3)} m³` }, { k: "Budget", v: `${n0(wa.totals.perYearEur)} €/an` }, { k: "Factures", v: `${wa.periods.length}` }]}
          />
        </div>

        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[12px] text-mut">
          <span>Mougins · {meteoInfo.lat.toFixed(2)}° N, {meteoInfo.lon.toFixed(2)}° E</span>
          <span>Météo quotidienne {meteoInfo.source}, jusqu'au {fmtDay(fa.weatherUntil)}</span>
          <span>Données : carnet manuscrit, photos du 8 nov. 2026</span>
        </motion.footer>
      </main>
    </div>
  );
}
