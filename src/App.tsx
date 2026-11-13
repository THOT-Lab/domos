import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { FUEL_SEED, SEASONS_SEED, type FuelEntry } from "./data/fuel";
import { WATER_SEED, type WaterBill } from "./data/water";
import { analyzeFuel } from "./lib/fuel";
import { loadForecast } from "./lib/meteo";
import { useLocal, useRoute } from "./lib/store";
import { analyzeWater } from "./lib/water";
import Fuel from "./pages/Fuel";
import Home from "./pages/Home";
import Water from "./pages/Water";

export default function App() {
  const route = useRoute();
  const [fuel, setFuel, resetFuel] = useLocal<FuelEntry[]>("fuel", FUEL_SEED, 1);
  const [water, setWater, resetWater] = useLocal<WaterBill[]>("eau", WATER_SEED, 1);
  const [base, setBase] = useState<number | null>(null);
  // Les prévisions météo arrivent après le premier rendu : `meteo` change et relance le calcul.
  const [meteo, setMeteo] = useState(0);
  useEffect(() => { loadForecast().then((ok) => ok && setMeteo(1)); }, []);
  const fa = useMemo(() => analyzeFuel(fuel, SEASONS_SEED, { base: base ?? undefined }), [fuel, base, meteo]);
  const wa = useMemo(() => analyzeWater(water), [water]);

  return (
    <div data-res={route === "home" ? undefined : route}>
      <div className="aura" aria-hidden><i /><i /></div>
      <AnimatePresence mode="wait">
        <motion.div key={route} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
          {route === "home" && <Home fa={fa} wa={wa} />}
          {route === "fuel" && <Fuel a={fa} entries={fuel} setEntries={setFuel} reset={resetFuel} base={base} setBase={setBase} edited={fuel !== FUEL_SEED} />}
          {route === "eau" && <Water a={wa} bills={water} setBills={setWater} reset={resetWater} edited={water !== WATER_SEED} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
