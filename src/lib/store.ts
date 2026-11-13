import { useCallback, useEffect, useState } from "react";

// État gardé dans le navigateur. `version` permet de repartir du carnet quand la transcription change.
export function useLocal<T>(key: string, seed: T, version = 1): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const k = `domos.${key}.v${version}`;
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : seed; } catch { return seed; }
  });
  useEffect(() => { try { localStorage.setItem(k, JSON.stringify(value)); } catch { /* stockage indisponible : on reste en mémoire */ } }, [k, value]);
  const reset = useCallback(() => setValue(seed), [seed]);
  return [value, setValue, reset];
}

// Navigation par ancre d'adresse : #/, #/fuel, #/eau (le bouton retour du navigateur fonctionne).
export type Route = "home" | "fuel" | "eau";
const read = (): Route => (location.hash.startsWith("#/fuel") ? "fuel" : location.hash.startsWith("#/eau") ? "eau" : "home");
export const go = (r: Route) => { location.hash = r === "home" ? "#/" : `#/${r}`; };
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => { const on = () => { setRoute(read()); window.scrollTo(0, 0); }; window.addEventListener("hashchange", on); return () => window.removeEventListener("hashchange", on); }, []);
  return route;
}

export function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "dark");
  const toggle = () => setTheme((t) => { const n = t === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = n; try { localStorage.setItem("domos.theme", n); } catch { /* rien */ } return n; });
  return [theme, toggle];
}
