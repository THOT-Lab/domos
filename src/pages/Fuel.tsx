import { AnimatePresence, motion } from "framer-motion";
import { Droplet, Flame, Plus, RotateCcw, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import Shell from "../components/Shell";
import { BaseCurve, LevelChart, MonthGrid, Scatter, SeasonChart } from "../components/fuelCharts";
import { Tank } from "../components/gauges";
import { Band, Card, Count, Finding, Key, Pill, Segmented, Stat } from "../components/ui";
import { HAND_TOTALS, type FuelEntry } from "../data/fuel";
import { ORDER_LEVEL, type FuelAnalysis } from "../lib/fuel";
import { meteoInfo } from "../lib/meteo";
import { MONTHS_LONG, fmtDay, fmtMonth, n0, n1, n2, signed, today } from "../lib/time";

const SECTIONS = [
  { id: "aujourdhui", label: "Aujourd'hui" },
  { id: "historique", label: "Historique" },
  { id: "saisons", label: "Saisons" },
  { id: "saisonnalite", label: "Saisonnalité" },
  { id: "regression", label: "Régression" },
  { id: "lecture", label: "Lecture" },
  { id: "carnet", label: "Carnet" },
];
const KWH_PER_L = 10, SURFACE = 220; // hypothèses : pouvoir calorifique du fioul domestique, surface de la maison

export default function Fuel({ a, entries, setEntries, reset, base, setBase, edited }: { a: FuelAnalysis; entries: FuelEntry[]; setEntries: (f: (prev: FuelEntry[]) => FuelEntry[]) => void; reset: () => void; base: number | null; setBase: (b: number | null) => void; edited: boolean }) {
  const [range, setRange] = useState<"all" | "3y" | "season">("all");
  const f = a.forecast, t = a.totals, now = today();
  const lastReading = a.readings[a.readings.length - 1];
  const drop = 1 - a.kRange.mean / a.kRange.early;
  const peak = t.peakMonth;
  const winterShare = a.profile.filter((p) => [11, 0, 1].includes(p.m)).reduce((s, p) => s + p.liters, 0) / (a.profileTotal || 1);
  const djus = a.complete.map((s) => s.dju), lits = a.after.map((s) => s.liters);
  const maxLevel = Math.max(...a.readings.map((r) => r.level));
  const daysTo = f.orderDay ? f.orderDay - now : null;
  const hand = a.seasonStats.filter((s) => HAND_TOTALS[s.label]).map((s) => ({ label: s.label, hand: HAND_TOTALS[s.label], ours: s.liters / a.litersPerPt }));

  return (
    <Shell title="Fuel" icon={<Flame size={17} />} sections={SECTIONS}>
      {/* ── Aujourd'hui ── */}
      <Band id="aujourdhui" title="Aujourd'hui" hint={`Estimation au ${fmtDay(now, true)}, à partir du relevé du ${fmtDay(lastReading.day)} et de la météo depuis`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)]">
          <div className="card relative flex items-center gap-6 overflow-hidden p-6">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-acc/15 blur-3xl" />
            <Tank level={f.todayLevel / 100} threshold={ORDER_LEVEL / 100} />
            <div className="min-w-0">
              <div className="label">Niveau estimé</div>
              <div className="num mt-1 text-[68px] font-medium leading-none tracking-tighter text-ink">
                <Count value={f.todayLevel} format={n0} /><span className="ml-1.5 font-sans text-[22px] font-bold text-acc">%</span>
              </div>
              <div className="num mt-2 text-[15px] text-ink2">≈ {n0(f.todayLiters)} L <span className="font-sans text-mut">sur {n0(a.capacity)} L</span></div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink2">
                {f.orderDay ? (
                  <>Au rythme de la maison, la jauge passera sous {ORDER_LEVEL} % vers le <b className="text-ink">{fmtDay(f.orderDay, true)}</b>{daysTo != null && daysTo > 0 && <>, dans {n0(daysTo)} jours</>}.</>
                ) : <>Aucune commande à prévoir dans les 18 prochains mois.</>}
              </p>
              {f.orderLo && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Pill tone="neg" title="Avec la signature de la saison la plus gourmande des quatre dernières">hiver gourmand : {fmtMonth(f.orderLo)}</Pill>
                  <Pill tone="pos" title="Avec la signature de la saison la plus sobre des quatre dernières">hiver sobre : {f.orderHi ? fmtMonth(f.orderHi) : "pas avant 2028"}</Pill>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Stat label="Par saison de chauffe" value={t.perSeasonAfter} format={n0} unit="L" tone="acc" hint={<>Moyenne des {a.after.length} dernières saisons. {n0(t.perSeason)} L sur les {a.complete.length}.</>} />
            <Stat label="Par jour de chauffe" value={t.perHeatDay} format={n1} unit="L" hint={<>Jusqu'à {n1(peak.perDay)} L par jour en {MONTHS_LONG[peak.m]}.</>} />
            <Stat label="Signature thermique" value={a.kRange.mean} format={n2} unit="L/DJU" hint={<>Litres par degré-jour sous {n1(a.base).replace(",0", "")} °C dehors.</>} />
            <Stat label="Capacité de la cuve" value={a.capacity} format={(v) => n0(Math.round(v / 10) * 10)} unit="L" hint={<>Déduite des recharges : 1000 L font {n1(a.ptsPer1000)} points de jauge.</>} />
            <Stat label="Livré depuis 2020" value={t.delivered} format={n0} unit="L" hint={<>{a.refills.length} recharges, {n0(t.liters)} L brûlés entre le premier et le dernier relevé.</>} />
            <Stat label="Équivalent énergie" value={(t.perSeasonAfter * KWH_PER_L) / SURFACE} format={n0} unit="kWh/m²·an" hint={<>{n0(t.perSeasonAfter * KWH_PER_L / 1000)} MWh par an, pour {SURFACE} m² et {KWH_PER_L} kWh par litre.</>} />
          </div>
        </div>
      </Band>

      {/* ── Historique ── */}
      <Band id="historique" title="Historique de la cuve" hint="La courbe passe par chaque relevé ; entre deux, elle suit la météo jour par jour"
        action={<Segmented id="range" value={range} onChange={setRange} options={[{ value: "all", label: "Tout" }, { value: "3y", label: "3 ans" }, { value: "season", label: "Saison en cours" }]} />}>
        <Card>
          <LevelChart a={a} range={range} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/40 pt-3">
            <Key items={[{ label: "Niveau reconstitué" }, { label: "Relevé du carnet", kind: "dot" }, { label: "Livraison", kind: "dot", color: "rgb(var(--pos))" }, { label: "Projection", kind: "dash" }, { label: "Fourchette sobre / gourmand", kind: "band" }, { label: "Chaudière allumée", kind: "band" }]} />
            <span className="text-[12px] text-mut">Survolez la courbe pour lire n'importe quel jour.</span>
          </div>
        </Card>
      </Band>

      {/* ── Saisons ── */}
      <Band id="saisons" title="Saisons de chauffe" hint="De l'allumage à l'arrêt de la chaudière">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card>
            <SeasonChart a={a} />
            <div className="mt-2 border-t border-line/40 pt-3">
              <Key items={[{ label: "Litres consommés", kind: "box" }, { label: "À climat normal (même rigueur chaque année)", color: "rgb(var(--ink))" }, { label: "Tendance à climat normal", kind: "dash", color: "rgb(var(--ink2))" }]} />
            </div>
          </Card>
          <div className="grid content-start gap-4">
            <Card kicker="Tendance" title={<>{signed(a.trendL.slope)} L par saison</>}>
              <p className="text-[13px] leading-relaxed text-ink2">
                Droite ajustée sur les {a.complete.length} saisons terminées (R² = {n2(a.trendL.r2)}). Une fois la météo neutralisée, la baisse est de {signed(a.trendK.slope * a.djuNormal)} L par saison : la maison consomme réellement moins, ce n'est pas seulement des hivers plus doux.
              </p>
            </Card>
            <Card kicker="Rigueur des hivers" title={<>{n0(Math.min(...djus))} à {n0(Math.max(...djus))} DJU</>}>
              <p className="text-[13px] leading-relaxed text-ink2">
                Les degrés-jours unifiés mesurent le froid cumulé d'une saison. Entre l'hiver le plus doux et le plus rude, l'écart est de {n0((Math.max(...djus) / Math.min(...djus) - 1) * 100)} %, ce qui déplace la facture d'autant. Une saison normale ici pèse {n0(a.djuNormal)} DJU.
              </p>
            </Card>
          </div>
        </div>
      </Band>

      {/* ── Saisonnalité ── */}
      <Band id="saisonnalite" title="Saisonnalité" hint="Litres par mois : le profil moyen, puis chaque saison">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card><div className="overflow-x-auto"><MonthGrid a={a} /></div></Card>
          <div className="grid content-start gap-4">
            <Card kicker="Cœur de l'hiver" title={<>{n0(winterShare * 100)} % en trois mois</>}>
              <p className="text-[13px] leading-relaxed text-ink2">
                Décembre, janvier et février concentrent {n0(winterShare * 100)} % de l'année. {MONTHS_LONG[peak.m][0].toUpperCase() + MONTHS_LONG[peak.m].slice(1)} est le sommet avec {n0(peak.liters)} L en moyenne ({n0(peak.min)} à {n0(peak.max)} L selon les années), soit {n1(peak.perDay)} L par jour.
              </p>
            </Card>
            <Card kicker="Lecture" title="Comment lire la grille">
              <p className="text-[13px] leading-relaxed text-ink2">
                Chaque case est un mois d'une saison ; plus elle est saturée, plus la chaudière a brûlé de litres par jour. Les barres du haut donnent la moyenne, le trait vertical l'écart entre l'année la plus sobre et la plus gourmande. La saison 2020/21 est écartée des moyennes, ses dates étant approximatives.
              </p>
            </Card>
          </div>
        </div>
      </Band>

      {/* ── Régression ── */}
      <Band id="regression" title="Régression linéaire" hint="Ce que la cuve perd par jour, expliqué par le froid qu'il fait dehors">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card>
            <Scatter a={a} />
            <div className="mt-2 border-t border-line/40 pt-3">
              <Key items={[{ label: `Intervalles depuis ${a.after[0]?.label}`, kind: "dot" }, { label: "Intervalles antérieurs", kind: "dot", color: "rgb(var(--ink2))" }, { label: "Sobre / gourmand", kind: "band" }, { label: "Un disque = un intervalle entre deux relevés, sa taille = sa durée", kind: "dot", color: "transparent" }]} />
            </div>
          </Card>
          <div className="grid content-start gap-4">
            <Card kicker="Le modèle">
              <div className="num rounded-xl border border-line/60 bg-soft/50 px-4 py-3 text-center text-[15px] text-ink">
                L/jour = <span className="text-acc">{n2(a.kRange.mean)}</span> × max(0, <span className="text-acc">{n1(a.base).replace(",0", "")}</span> − T<sub>ext</sub>)
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div><div className="num text-[20px] text-ink">{n2(a.line.r2)}</div><div className="label mt-0.5">R² global</div></div>
                <div><div className="num text-[20px] text-ink">{a.scatter.length}</div><div className="label mt-0.5">intervalles</div></div>
                <div><div className="num text-[20px] text-ink">{n2(a.climate.r2)}</div><div className="label mt-0.5">R² saisons</div></div>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-ink2">
                Une seule pente ajustée sur tout l'historique donne {n2(a.k)} L/DJU. Mais les points se rangent en deux familles : {n2(a.kRange.early)} L/DJU avant, {n2(a.kRange.mean)} depuis {a.after[0]?.label}. La dispersion restante vient surtout de la jauge, lue au point près (1 point = {n0(a.litersPerPt)} L).
              </p>
            </Card>
            <Card kicker="Température de base" title={<>{n1(a.base)} °C {base == null ? <span className="ml-1 text-[12px] font-semibold text-mut">optimum</span> : <button className="ml-2 text-[12px] font-bold text-acc hover:underline" onClick={() => setBase(null)}>revenir à l'optimum ({n1(a.bestBase)} °C)</button>}</>}>
              <BaseCurve a={a} />
              <input type="range" className="slider mt-2 w-full" min={11} max={18} step={0.25} value={a.base} onChange={(e) => setBase(Number(e.target.value))} aria-label="Température de base" />
              <p className="mt-3 text-[13px] leading-relaxed text-ink2">
                C'est la température extérieure au-dessus de laquelle la maison n'a plus besoin de chauffage. La courbe montre l'erreur du modèle pour chaque valeur : faites glisser, tout se recalcule.
              </p>
            </Card>
          </div>
        </div>
      </Band>

      {/* ── Lecture ── */}
      <Band id="lecture" title="Ce que disent les données" hint="Constats calculés, ils se mettent à jour avec le carnet">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Finding n={1} title={<>La cuve obéit à une loi simple</>}>
            Chaque degré qui manque dehors sous {n1(a.base).replace(",0", "")} °C coûte {n2(a.kRange.mean)} L par jour. Par 5 °C de moyenne, la maison brûle {n0(a.kRange.mean * (a.base - 5))} L par jour ; par 12 °C, {n0(a.kRange.mean * (a.base - 12))} L. Cette loi suffit à prévoir la jauge sans la regarder.
          </Finding>
          <Finding n={2} tone="pos" title={<>{n0(drop * 100)} % de moins depuis {a.after[0]?.label}, à climat égal</>}>
            La signature passe de {n2(a.kRange.early)} à {n2(a.kRange.mean)} L/DJU, soit environ {n0((a.kRange.early - a.kRange.mean) * a.djuNormal)} L épargnés par hiver normal. L'isolation des combles (été 2021) ne se voit pas dès le premier hiver ; la baisse coïncide plutôt avec la chaudière ramenée à 55 °C en mars 2022 et la consigne à 19 °C.
          </Finding>
          <Finding n={3} title={<>Une recharge ne couvre pas tout à fait un hiver</>}>
            Un hiver normal demande {n0(f.nextSeasonNeed)} L, une livraison en apporte 1000. Les {a.after.length} dernières saisons ont consommé de {n0(Math.min(...lits))} à {n0(Math.max(...lits))} L : il faut environ cinq livraisons pour quatre hivers, d'où les années à deux recharges.
          </Finding>
          <Finding n={4} tone="warn" title={<>La cuve ne dépasse jamais {n0(maxLevel)} %</>}>
            Elle oscille entre {n0(Math.min(...a.readings.map((r) => r.level)))} et {n0(maxLevel)} % : près de la moitié de ses {n0(Math.round(a.capacity / 100) * 100)} L ne sert jamais. Une livraison de 2000 L, commandée hors saison, couvrirait {n1(2000 / f.nextSeasonNeed)} hiver et laisserait choisir le moment d'achat.
          </Finding>
          <Finding n={5} title={<>La capacité se lit dans les recharges</>}>
            Aucune étiquette n'est nécessaire : en ajustant ensemble la loi de chauffe et le saut de jauge à chaque livraison, 1000 L valent {n1(a.ptsPer1000)} points, donc une cuve d'environ {n0(Math.round(a.capacity / 50) * 50)} L.
            {hand.length > 0 && <> Les bilans notés en marge du carnet ({hand.map((h) => `${h.label} : ${h.hand} %`).join(", ")}) sont proches du calcul ({hand.map((h) => `${n0(h.ours)} %`).join(" et ")}).</>}
          </Finding>
          <Finding n={6} title={<>Un relevé par mois suffirait</>}>
            Les relevés rapprochés (moins d'une semaine) sont noyés dans la précision de la jauge. Un relevé le 1er de chaque mois de chauffe, plus un avant et après chaque livraison, donnerait la même analyse avec moins de relevés.
          </Finding>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-mut">
          Méthode : météo quotidienne {meteoInfo.source} au point {meteoInfo.lat.toFixed(2)}° N, {meteoInfo.lon.toFixed(2)}° E ; moindres carrés pondérés sur les {a.intervals.length} intervalles entre relevés, avec trois inconnues (litres par degré-jour, température de base, points de jauge pour 1000 L) ; la fourchette de projection reprend la saison la plus sobre et la plus gourmande des {a.after.length} dernières. Hypothèses : maison d'environ {SURFACE} m², chaudière réservée au chauffage.
        </p>
      </Band>

      {/* ── Carnet ── */}
      <Band id="carnet" title="Carnet" hint={`${a.readings.length} relevés et ${a.refills.length} livraisons, du plus récent au plus ancien`}
        action={edited ? <button className="btn" onClick={() => confirm("Revenir aux relevés du carnet photographié ? Vos ajouts seront effacés.") && reset()}><RotateCcw size={14} />Revenir au carnet d'origine</button> : undefined}>
        <Journal a={a} entries={entries} setEntries={setEntries} />
      </Band>
    </Shell>
  );
}

function Journal({ a, entries, setEntries }: { a: FuelAnalysis; entries: FuelEntry[]; setEntries: (f: (prev: FuelEntry[]) => FuelEntry[]) => void }) {
  const [kind, setKind] = useState<"reading" | "refill">("reading");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState("");
  const [all, setAll] = useState(false);
  const v = Number(value.replace(",", "."));
  const ok = date && value !== "" && Number.isFinite(v) && v > 0 && (kind === "refill" || v <= 100);
  const add = () => {
    if (!ok) return;
    const id = `u${Date.now()}`;
    setEntries((prev) => [...prev, kind === "reading" ? { id, kind, date, level: v } : { id, kind, date, liters: v }]);
    setValue("");
  };
  const rows = [...a.entries].reverse();
  const shown = all ? rows : rows.slice(0, 12);
  const byId = new Map(a.intervals.map((it) => [`${it.b}-${it.l1}`, it]));
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
      <Card kicker="Nouveau" title="Ajouter au carnet">
        <div className="mb-4"><Segmented id="kind" value={kind} onChange={setKind} options={[{ value: "reading", label: "Relevé de jauge" }, { value: "refill", label: "Livraison" }]} /></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label mb-1.5 block">Date</span><input type="date" className="field num" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="block"><span className="label mb-1.5 block">{kind === "reading" ? "Niveau (%)" : "Volume (L)"}</span><input inputMode="decimal" className="field num" placeholder={kind === "reading" ? "ex. 42" : "1000"} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} /></label>
        </div>
        <button className="btn-primary mt-4 w-full" disabled={!ok} onClick={add}><Plus size={15} />Ajouter</button>
        <p className="mt-3 text-[12px] leading-relaxed text-mut">Toute l'analyse, la projection comprise, se recalcule à chaque ajout. Les ajouts restent dans ce navigateur.</p>
      </Card>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[28px_minmax(0,1.2fr)_84px_minmax(0,1fr)_minmax(0,1.6fr)_28px] items-center gap-3 border-b border-line/50 px-5 py-2.5">
          <span /><span className="label">Date</span><span className="label text-right">Valeur</span><span className="label text-right">Depuis le relevé précédent</span><span className="label">Note de transcription</span><span />
        </div>
        <ul>
          <AnimatePresence initial={false}>
            {shown.map((e) => {
              const it = e.kind === "reading" ? byId.get(`${e.day}-${e.level}`) : undefined;
              const user = e.id.startsWith("u");
              return (
                <motion.li key={e.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-[28px_minmax(0,1.2fr)_84px_minmax(0,1fr)_minmax(0,1.6fr)_28px] items-center gap-3 border-b border-line/30 px-5 py-2 text-[13px] last:border-0 hover:bg-soft/40">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg ${e.kind === "refill" ? "bg-pos/15 text-pos" : "bg-acc/12 text-acc"}`}>{e.kind === "refill" ? <Truck size={14} /> : <Droplet size={14} />}</span>
                  <span className="truncate font-semibold text-ink">{fmtDay(e.day, true)}{e.approx && <span className="ml-1.5 text-warn" title="Date approximative">≈</span>}{user && <span className="ml-2"><Pill>ajouté</Pill></span>}</span>
                  <span className={`num text-right ${e.kind === "refill" ? "text-pos" : "text-ink"}`}>{e.kind === "refill" ? `+${n0(e.liters)} L` : `${n1(e.level).replace(",0", "")} %`}</span>
                  <span className="num truncate text-right text-ink2">{it && it.days > 0 ? `${n0(Math.max(0, it.usedL))} L · ${n1(Math.max(0, it.rate))} L/j` : ""}</span>
                  <span className="truncate text-[12px] text-mut" title={e.note}>{e.note ?? ""}</span>
                  <span>{user && <button className="text-mut transition hover:text-neg" aria-label="Supprimer" onClick={() => setEntries((prev) => prev.filter((x) => x.id !== e.id))}><Trash2 size={14} /></button>}</span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        {rows.length > 12 && <button className="w-full border-t border-line/40 py-2.5 text-[12.5px] font-bold text-acc transition hover:bg-acc/5" onClick={() => setAll((x) => !x)}>{all ? "Replier" : `Voir les ${rows.length} lignes`}</button>}
      </div>
    </div>
  );
}
