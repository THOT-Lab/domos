import { motion, useInView } from "framer-motion";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { EASE } from "./ui";

// Largeur du conteneur, suivie en direct : les graphiques sont redessinés à la bonne taille, sans mise à l'échelle floue.
export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export type Hover = { x: number; y: number; content: ReactNode } | null;

// Cadre commun : mesure la largeur, rend le SVG, place l'infobulle sans la laisser sortir du cadre.
export function Frame({ height, children, hover, onLeave }: { height: number; children: (width: number) => ReactNode; hover: Hover; onLeave?: () => void }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const tip = useRef<HTMLDivElement>(null);
  const [tw, setTw] = useState(170);
  useEffect(() => { if (tip.current) setTw(tip.current.offsetWidth); }, [hover?.content]);
  const left = hover ? Math.max(4, Math.min(width - tw - 4, hover.x + 14 + tw > width ? hover.x - tw - 14 : hover.x + 14)) : 0;
  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onMouseLeave={onLeave}>
      {width > 0 && <svg width={width} height={height} className="block overflow-visible">{children(width)}</svg>}
      {hover && <div ref={tip} className="tip" style={{ left, top: Math.max(0, hover.y - 20) }}>{hover.content}</div>}
    </div>
  );
}

// Rideau : révèle le contenu de gauche à droite à la première apparition.
export function Reveal({ width, height, children, delay = 0 }: { width: number; height: number; children: ReactNode; delay?: number }) {
  const id = useId().replace(/:/g, "");
  // Le témoin est un rectangle invisible hors du masque : c'est lui qui dit si le graphique est entré à l'écran.
  const probe = useRef<SVGRectElement>(null);
  const seen = useInView(probe, { once: true, margin: "-40px" });
  return (
    <>
      <rect ref={probe} x={0} y={0} width={width} height={height} fill="none" pointerEvents="none" />
      <clipPath id={id}>
        <motion.rect x={-10} y={-20} height={height + 40} initial={{ width: 0 }} animate={{ width: seen ? width + 20 : 0 }} transition={{ duration: 1.8, delay, ease: EASE }} />
      </clipPath>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  );
}

export const Row = ({ k, v }: { k: ReactNode; v: ReactNode }) => (
  <div className="row"><span>{k}</span><span>{v}</span></div>
);
