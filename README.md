# Domos · Suivi des ressources domestiques

**➜ En ligne : https://thot-lab.github.io/domos/**

Le fuel et l'eau d'une maison, à partir de ce que l'on a vraiment : un carnet de relevés de jauge pris « quand on y pense », et une feuille de factures d'eau. Domos les croise avec la météo réelle, jour par jour, et en tire des moyennes, une saisonnalité et une loi.

## Fuel

- **Historique reconstitué** de la cuve : la courbe passe par chaque relevé et, entre deux, suit la météo jour par jour ; les livraisons de 1000 L sont replacées.
- **Loi des degrés-jours** ajustée par moindres carrés pondérés : litres par jour = k × max(0, T_base − T_ext). Trois inconnues tirées des relevés eux-mêmes : k (L par degré-jour), la température de base, et le nombre de points de jauge que représentent 1000 L, donc la capacité de la cuve.
- **Saisons de chauffe** comparées à climat normal, **saisonnalité** mois par mois (profil moyen et carte de chaleur), **régression** interactive (la température de base se règle au curseur, tout se recalcule).
- **Projection** de la jauge (météo observée, prévisions à 16 jours, puis normales) avec une fourchette hiver sobre / hiver gourmand, et la date de la prochaine commande.

## Conso eau

- Factures de durées inégales ramenées en litres par jour, plage habituelle (moyenne ± 2σ), détection des factures hors norme, années civiles recalculées, prix du m³ tout compris et sa tendance.

## Technique

Vite, React, TypeScript, Tailwind, framer-motion ; graphiques SVG dessinés à la main avec d3-scale et d3-shape. Aucun serveur : les ajouts faits dans l'application restent dans le navigateur.

- `npm run dev` : développement. `npm run build` : version statique dans `dist/`.
- `npm run meteo` : rafraîchit `src/data/meteo.json` (températures et pluie quotidiennes, Open-Meteo / réanalyse ERA5).
- Données transcrites à la main dans `src/data/fuel.ts` et `src/data/water.ts` ; les lectures douteuses du carnet portent une note, visible dans l'application.
- Analyse : `src/lib/fuel.ts` et `src/lib/water.ts`. Chaque push sur `main` redéploie GitHub Pages (`.github/workflows/deploy.yml`).
