/** @type {import('tailwindcss').Config} */
// Même charte qu'EasyLoc : couleurs en variables CSS (thème sombre / clair), plus un accent par ressource (fuel, eau).
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), bg2: v("bg2"), card: v("card"), soft: v("soft"), line: v("line"),
        ink: v("ink"), ink2: v("ink2"), mut: v("mut"),
        acc: v("acc"), acc2: v("acc2"), pos: v("pos"), neg: v("neg"), warn: v("warn"), onacc: v("onacc"),
        fuel: v("fuel"), fuel2: v("fuel2"), eau: v("eau"), eau2: v("eau2"),
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "-apple-system", "sans-serif"],
        display: ["Fredoka", "Nunito", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'SF Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: { card: "var(--shadow-card)" },
    },
  },
  plugins: [],
};
