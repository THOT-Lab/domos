import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { go } from "../lib/store";
import { Logo, ThemeToggle } from "./ui";

// Page d'une ressource : bandeau en verre (retour, titre, sommaire qui suit le défilement), puis les bandes.
export default function Shell({ title, icon, sections, children }: { title: string; icon: ReactNode; sections: { id: string; label: string }[]; children: ReactNode }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-25% 0px -65% 0px" });
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [sections]);
  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-40 border-b border-line/50">
        <div className="clear-corner flex items-center gap-3 px-5 py-2.5">
          <button onClick={() => go("home")} className="btn !px-2.5" aria-label="Retour à l'accueil de Domos" title="Retour"><ArrowLeft size={16} /></button>
          <button onClick={() => go("home")} className="hidden shrink-0 sm:block"><Logo size={30} /></button>
          <span className="hidden h-5 w-px bg-line sm:block" />
          <div className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink"><span className="text-acc">{icon}</span>{title}</div>
          <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); }} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition ${active === s.id ? "bg-acc/15 text-acc" : "text-ink2 hover:text-ink"}`}>{s.label}</a>
            ))}
          </nav>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-8">{children}</main>
    </div>
  );
}
