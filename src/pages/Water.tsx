import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Droplets, Plus, Receipt, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import Shell from "../components/Shell";
import { Drop } from "../components/gauges";
import { Band, Card, Count, Finding, Key, Pill, Stat } from "../components/ui";
import { PeriodChart, PriceChart, YearChart } from "../components/waterCharts";
import type { WaterBill } from "../data/water";
import { eur, eur2, fmtDay, n0, n1, n2, signed } from "../lib/time";
import type { WaterAnalysis } from "../lib/water";

const SECTIONS = [
  { id: "aujourdhui", label: "Aujourd'hui" },
  { id: "debit", label: "Débit" },
  { id: "annees", label: "Années et prix" },
  { id: "lecture", label: "Lecture" },
  { id: "factures", label: "Factures" },
];

export default function Water({ a, bills, setBills, reset, edited }: { a: WaterAnalysis; bills: WaterBill[]; setBills: (f: (prev: WaterBill[]) => WaterBill[]) => void; reset: () => void; edited: boolean }) {
  const last = a.lastP, t = a.totals;
  const ratio = last.rate / a.refMean;
  const alert = a.anomalies.length > 0;
  const worst = a.anomalies.reduce((p, q) => (q.z > (p?.z ?? 0) ? q : p), a.anomalies[0]);
  const gap = Math.abs(a.season.summer / a.season.winter - 1) * 100;
  const fy = a.fullYears, firstY = fy[0], lastY = fy[fy.length - 1];
  return (
    <Shell title="Conso eau" icon={<Droplets size={17} />} sections={SECTIONS}>
      <Band id="aujourdhui" title="Aujourd'hui" hint={`D'après la dernière facture, du ${fmtDay(last.a)} au ${fmtDay(last.b)}`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)]">
          <div className="card relative flex items-center gap-6 overflow-hidden p-6">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-acc/15 blur-3xl" />
            <Drop level={Math.min(1, ratio / 2)} />
            <div className="min-w-0">
              <div className="label">Débit moyen</div>
              <div className="num mt-1 text-[68px] font-medium leading-none tracking-tighter text-ink">
                <Count value={last.rate} format={n0} /><span className="ml-2 font-sans text-[20px] font-bold text-acc">L/j</span>
              </div>
              <div className="num mt-2 text-[15px] text-ink2">{n0(last.m3)} m³ <span className="font-sans text-mut">en {last.days} jours</span></div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink2">
                L'habitude de la maison est de <b className="text-ink">{n0(a.refMean)} L par jour</b>. La dernière facture est à <b className={ratio > 1.25 ? "text-neg" : "text-ink"}>{signed((ratio - 1) * 100)} %</b>.
              </p>
              {alert && <div className="mt-3"><Pill tone="neg"><AlertTriangle size={12} />{a.anomalies.length} facture{a.anomalies.length > 1 ? "s" : ""} hors norme</Pill></div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Stat label="Par an" value={t.perYearM3} format={n0} unit="m³" tone="acc" hint={<>Moyenne des {fy.length} années civiles complètes ({firstY?.y} à {lastY?.y}).</>} />
            <Stat label="Budget annuel" value={t.perYearEur} format={n0} unit="€" hint={<>De {eur(firstY?.eur ?? 0)} en {firstY?.y} à {eur(lastY?.eur ?? 0)} en {lastY?.y}.</>} />
            <Stat label="Prix tout compris" value={last.unit} format={n2} unit="€/m³" hint={<>Abonnement et taxes inclus. {n2(t.unit)} €/m³ en moyenne depuis 2019.</>} />
            <Stat label="Tendance de fond" value={a.trendRef.slope} format={(v) => signed(v, 0)} unit="L/j par an" hint={<>Avant 2025, la conso montait doucement (R² = {n2(a.trendRef.r2)}).</>} />
            <Stat label="Été contre hiver" value={gap} format={n1} unit="% d'écart" hint={<>{n0(a.season.summer)} L/j l'été, {n0(a.season.winter)} L/j l'hiver, jusqu'en 2025.</>} />
            <Stat label="Surconsommation" value={a.excessM3} format={n0} unit="m³" tone={alert ? "neg" : undefined} hint={alert ? <>Au-dessus de l'habitude depuis {worst.label.toLowerCase()}, soit environ {eur(a.excessEur)}.</> : <>Aucune facture hors de la plage habituelle.</>} />
          </div>
        </div>
      </Band>

      <Band id="debit" title="Débit facture par facture" hint="Les périodes facturées sont inégales : tout est ramené en litres par jour">
        <Card>
          <PeriodChart a={a} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/40 pt-3">
            <Key items={[{ label: "Hiver (octobre à mai)", kind: "box" }, { label: "Été (juin à septembre)", kind: "box", color: "rgb(var(--acc2))" }, { label: "Hors norme (plus de 2,5 σ)", kind: "box", color: "rgb(var(--neg))" }, { label: "Tendance de fond", kind: "dash", color: "rgb(var(--ink2))" }]} />
            <span className="text-[12px] text-mut">La largeur d'un rectangle est la durée de la facture.</span>
          </div>
        </Card>
      </Band>

      <Band id="annees" title="Années et prix" hint="Volumes et dépenses recalés sur l'année civile">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card kicker="Par année civile" title="Volume et dépense">
            <YearChart a={a} />
            <div className="mt-2 border-t border-line/40 pt-3"><Key items={[{ label: "m³ consommés", kind: "box" }, { label: "Dépense en €", color: "rgb(var(--ink))" }, { label: "* année partielle", kind: "dot", color: "transparent" }]} /></div>
          </Card>
          <Card kicker="Prix du mètre cube" title={<>{signed(a.cagr * 100, 1)} % par an en tendance</>}>
            <PriceChart a={a} />
            <div className="mt-2 border-t border-line/40 pt-3"><Key items={[{ label: "Prix tout compris par facture" }, { label: "Régression linéaire", kind: "dash", color: "rgb(var(--ink2))" }]} /></div>
          </Card>
        </div>
      </Band>

      <Band id="lecture" title="Ce que disent les données" hint="Constats calculés, ils se mettent à jour avec les factures">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {alert && (
            <Finding n={1} tone="neg" title={<>{worst.label} : {n0(worst.rate)} L par jour, {n1(worst.rate / a.refMean)} fois l'habitude</>}>
              C'est {n1(worst.z)} écarts-types au-dessus de cinq ans de factures stables, et la facture suivante reste haute. Au total, environ {n0(a.excessM3)} m³ de trop, soit {eur(a.excessEur)}. Une fuite (chasse d'eau, arrosage, canalisation enterrée) ou un nouvel usage sont à vérifier.
            </Finding>
          )}
          <Finding n={alert ? 2 : 1} tone="warn" title="Le test du compteur">
            Pour trancher : relever le compteur le soir, ne rien puiser de la nuit, relever au matin. S'il a tourné, il y a une fuite. Les {n0(worst ? worst.rate - a.refMean : 0)} L par jour en trop correspondent à {n0(worst ? (worst.rate - a.refMean) / 24 : 0)} L par heure, un filet d'eau continu.
          </Finding>
          <Finding n={alert ? 3 : 2} title={<>Pas de saison de l'eau dans cette maison</>}>
            Été et hiver sont à {gap < 1 ? "moins de 1" : n0(gap)} % l'un de l'autre ({n0(a.season.summer)} contre {n0(a.season.winter)} L par jour) jusqu'en 2025. Avec 3 000 m² de jardin, cela indique que l'arrosage ne passait pas par ce compteur, ou très peu : la hausse de l'été 2025 n'en est que plus inhabituelle.
          </Finding>
          <Finding n={alert ? 4 : 3} title={<>Une dérive lente avant le saut</>}>
            De 2020 à 2025, la conso gagne {n0(a.trendRef.slope)} L par jour chaque année (R² = {n2(a.trendRef.r2)}). Sur toutes les factures la pente monte à {n0(a.trend.slope)} L/j par an, tirée par les deux dernières.
          </Finding>
          <Finding n={alert ? 5 : 4} title={<>Le prix : {n2(Math.min(...a.periods.map((p) => p.unit)))} à {n2(Math.max(...a.periods.map((p) => p.unit)))} € le m³</>}>
            La tendance est de {signed(a.cagr * 100, 1)} % par an mais elle explique mal les factures (R² = {n2(a.price.r2)}) : le prix a culminé en 2024 puis est redescendu. Le budget, lui, passe de {eur(firstY?.eur ?? 0)} à {eur(lastY?.eur ?? 0)} par an, porté par les volumes autant que par le tarif.
          </Finding>
          <Finding n={alert ? 6 : 5} title="Deux lignes de la feuille corrigées">
            Une facture commençait avant la fin de la précédente (01/10/2024, ramenée au 04/11/2024) et la dernière est datée « 01/10/2026 » pour 2025. Les deux sont signalées dans la liste ci-dessous et se corrigent en ajoutant la bonne ligne.
          </Finding>
        </div>
      </Band>

      <Band id="factures" title="Factures" hint={`${a.periods.length} périodes, ${n0(t.m3)} m³ et ${eur(t.eur)} depuis juin 2019`}
        action={edited ? <button className="btn" onClick={() => confirm("Revenir aux factures de la feuille photographiée ? Vos ajouts seront effacés.") && reset()}><RotateCcw size={14} />Revenir à la feuille d'origine</button> : undefined}>
        <Bills a={a} bills={bills} setBills={setBills} />
      </Band>
    </Shell>
  );
}

function Bills({ a, setBills }: { a: WaterAnalysis; bills: WaterBill[]; setBills: (f: (prev: WaterBill[]) => WaterBill[]) => void }) {
  const lastEnd = a.lastP?.end ?? "";
  const [start, setStart] = useState(lastEnd);
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [m3, setM3] = useState("");
  const [amount, setAmount] = useState("");
  const vm = Number(m3.replace(",", ".")), ve = Number(amount.replace(",", "."));
  const ok = start && end && end > start && vm > 0 && ve > 0;
  const add = () => { if (!ok) return; setBills((prev) => [...prev, { id: `u${Date.now()}`, start, end, m3: vm, eur: ve }]); setM3(""); setAmount(""); };
  const cols = "grid-cols-[28px_minmax(0,1.5fr)_64px_84px_84px_76px_minmax(0,1.4fr)_28px]";
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]">
      <Card kicker="Nouvelle" title="Ajouter une facture">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label mb-1.5 block">Début</span><input type="date" className="field num" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="block"><span className="label mb-1.5 block">Fin</span><input type="date" className="field num" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          <label className="block"><span className="label mb-1.5 block">Volume (m³)</span><input inputMode="decimal" className="field num" placeholder="ex. 45" value={m3} onChange={(e) => setM3(e.target.value)} /></label>
          <label className="block"><span className="label mb-1.5 block">Montant (€)</span><input inputMode="decimal" className="field num" placeholder="ex. 148,50" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} /></label>
        </div>
        <button className="btn-primary mt-4 w-full" disabled={!ok} onClick={add}><Plus size={15} />Ajouter</button>
        <p className="mt-3 text-[12px] leading-relaxed text-mut">Un relevé d'index au compteur chaque mois rendrait l'analyse aussi fine que celle du fuel. Les ajouts restent dans ce navigateur.</p>
      </Card>
      <div className="card overflow-x-auto">
        <div className="min-w-[640px]">
          <div className={`grid ${cols} items-center gap-3 border-b border-line/50 px-5 py-2.5`}>
            <span /><span className="label">Période</span><span className="label text-right">Volume</span><span className="label text-right">Débit</span><span className="label text-right">Montant</span><span className="label text-right">€/m³</span><span className="label">Note de transcription</span><span />
          </div>
          <ul>
            <AnimatePresence initial={false}>
              {[...a.periods].reverse().map((p) => {
                const user = p.id.startsWith("u"), bad = p.z > 2.5;
                return (
                  <motion.li key={p.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={`grid ${cols} items-center gap-3 border-b border-line/30 px-5 py-2 text-[13px] last:border-0 hover:bg-soft/40`}>
                    <span className={`grid h-7 w-7 place-items-center rounded-lg ${bad ? "bg-neg/15 text-neg" : "bg-acc/12 text-acc"}`}><Receipt size={14} /></span>
                    <span className="truncate font-semibold text-ink">{p.label}<span className="ml-2 font-normal text-mut">{fmtDay(p.a)} → {fmtDay(p.b)}</span>{user && <span className="ml-2"><Pill>ajoutée</Pill></span>}</span>
                    <span className="num text-right text-ink">{n0(p.m3)} m³</span>
                    <span className={`num text-right ${bad ? "text-neg" : "text-ink2"}`}>{n0(p.rate)} L/j</span>
                    <span className="num text-right text-ink">{eur2(p.eur)}</span>
                    <span className="num text-right text-ink2">{n2(p.unit)}</span>
                    <span className="truncate text-[12px] text-mut" title={p.note}>{p.note ?? ""}</span>
                    <span>{user && <button className="text-mut transition hover:text-neg" aria-label="Supprimer" onClick={() => setBills((prev) => prev.filter((x) => x.id !== p.id))}><Trash2 size={14} /></button>}</span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </div>
  );
}
