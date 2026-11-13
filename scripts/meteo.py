"""Rafraîchit src/data/meteo.json : températures moyennes et pluie quotidiennes à la maison (Mougins), depuis juin 2019.
Source : Open-Meteo (réanalyse ERA5, archive-api.open-meteo.com). Lancer : npm run meteo (puis npm run build)."""
import json, datetime as dt, pathlib, subprocess

# Arrondi au centième (≈ 1 km) : la maille ERA5 fait ~10 km, et le dépôt est public.
LAT, LON, START = 43.58, 7.02, "2019-06-01"
end = (dt.date.today() - dt.timedelta(days=2)).isoformat()
url = ("https://archive-api.open-meteo.com/v1/archive?latitude=%s&longitude=%s&start_date=%s&end_date=%s"
       "&daily=temperature_2m_mean,precipitation_sum&timezone=Europe%%2FParis") % (LAT, LON, START, end)
# curl plutôt qu'urllib : le Python du Mac n'a pas ses certificats installés.
d = json.loads(subprocess.run(["curl", "-s", "-m", "60", url], capture_output=True, check=True).stdout)["daily"]
t, p = d["temperature_2m_mean"], d["precipitation_sum"]
# Les derniers jours de l'archive peuvent manquer : on s'arrête au dernier jour connu.
last = max(i for i, v in enumerate(t) if v is not None)
fill = lambda xs: [round(x if x is not None else 0.0, 1) for x in xs[: last + 1]]
out = {"source": "Open-Meteo ERA5", "lat": LAT, "lon": LON, "start": START, "end": d["time"][last], "t": fill(t), "p": fill(p)}
path = pathlib.Path(__file__).resolve().parent.parent / "src" / "data" / "meteo.json"
path.write_text(json.dumps(out, separators=(",", ":")))
print("meteo.json :", START, "→", out["end"], len(out["t"]), "jours")
