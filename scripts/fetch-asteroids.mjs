import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const NASA_URL = "https://api.nasa.gov/neo/rest/v1/feed";
const OUTPUT = resolve(process.cwd(), "frontend/public/data/asteroids.json");
const API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function calculateThreat(hazardous, diameterKm, speedKmS, missDistanceKm) {
  let score = 0;
  if (hazardous) score += 35;
  score += clamp(diameterKm * 20);
  score += clamp((speedKmS / 40) * 15);
  const distanceComponent = 30 * (1 - Math.min(missDistanceKm / 2_000_000, 1));
  score += Math.max(0, distanceComponent);
  score = Math.round(clamp(score));

  const threatLevel = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 30 ? "MODERATE" : "LOW";
  return [score, threatLevel];
}

function flattenAsteroid(item) {
  const approach = item.close_approach_data?.[0] || {};
  const speed = Number(approach.relative_velocity?.kilometers_per_second || 0);
  const missDistance = Number(approach.miss_distance?.kilometers || 0);
  const diameter = item.estimated_diameter?.kilometers || {};
  const diameterMin = Number(diameter.estimated_diameter_min || 0);
  const diameterMax = Number(diameter.estimated_diameter_max || 0);
  const averageDiameter = (diameterMin + diameterMax) / 2;
  const hazardous = Boolean(item.is_potentially_hazardous_asteroid);
  const [threatScore, threatLevel] = calculateThreat(hazardous, averageDiameter, speed, missDistance);

  return {
    id: String(item.id || ""),
    name: item.name || "Unknown object",
    speed: Number(speed.toFixed(2)),
    diameter: Number(averageDiameter.toFixed(4)),
    diameter_min: Number(diameterMin.toFixed(4)),
    diameter_max: Number(diameterMax.toFixed(4)),
    miss_distance: Number(missDistance.toFixed(2)),
    is_hazardous: hazardous,
    threat_score: threatScore,
    threat_level: threatLevel,
    nasa_url: item.nasa_jpl_url || null,
    absolute_magnitude: item.absolute_magnitude_h ?? null,
  };
}

function demoAsteroids() {
  const samples = [
    { id: "demo-001", name: "(Demo 2026 AX)", speed: 27.4, diameter: 0.82, miss_distance: 420000, is_hazardous: true },
    { id: "demo-002", name: "(Demo 2026 BK)", speed: 18.1, diameter: 0.16, miss_distance: 1150000, is_hazardous: false },
    { id: "demo-003", name: "(Demo 2026 CN)", speed: 32.6, diameter: 1.42, miss_distance: 2900000, is_hazardous: true },
    { id: "demo-004", name: "(Demo 2026 DP)", speed: 12.8, diameter: 0.05, miss_distance: 4800000, is_hazardous: false },
  ];
  return samples.map((item) => {
    const [threatScore, threatLevel] = calculateThreat(item.is_hazardous, item.diameter, item.speed, item.miss_distance);
    return { ...item, threat_score: threatScore, threat_level: threatLevel, nasa_url: null, absolute_magnitude: null, demo: true };
  });
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  let asteroids;
  let demoMode = false;
  let source = "NASA NeoWs";

  try {
    const url = new URL(NASA_URL);
    url.searchParams.set("start_date", today);
    url.searchParams.set("end_date", today);
    url.searchParams.set("api_key", API_KEY);
    const response = await fetch(url, { headers: { "user-agent": "asteroid-threat-index/2.0" } });
    if (!response.ok) throw new Error(`NASA response ${response.status}`);
    const payload = await response.json();
    const raw = payload.near_earth_objects?.[today] || [];
    asteroids = raw.map(flattenAsteroid).sort((a, b) => b.threat_score - a.threat_score);
  } catch (error) {
    demoMode = true;
    source = "demo";
    asteroids = demoAsteroids();
    console.warn(`NASA feed unavailable: ${error.message}`);
  }

  const output = {
    date: today,
    generated_at: new Date().toISOString(),
    source,
    demo_mode: demoMode,
    count: asteroids.length,
    asteroids,
  };

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Wrote ${asteroids.length} objects to ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
