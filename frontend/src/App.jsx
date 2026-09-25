import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Database,
  ExternalLink,
  Filter,
  Loader2,
  Orbit,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";

const DATA_URL = `${import.meta.env.BASE_URL}data/asteroids.json`;
const WATCHLIST_KEY = "ati-watchlist-v2";

const LEVELS = {
  LOW: {
    label: "Low",
    accent: "mint",
    badge: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-200",
    bar: "bg-emerald-300",
    glow: "shadow-[0_0_30px_rgba(110,231,183,0.08)]",
  },
  MODERATE: {
    label: "Moderate",
    accent: "amber",
    badge: "border-amber-300/15 bg-amber-300/[0.08] text-amber-200",
    bar: "bg-amber-300",
    glow: "shadow-[0_0_30px_rgba(252,211,77,0.08)]",
  },
  HIGH: {
    label: "High",
    accent: "orange",
    badge: "border-orange-300/15 bg-orange-300/[0.08] text-orange-200",
    bar: "bg-orange-300",
    glow: "shadow-[0_0_30px_rgba(253,186,116,0.09)]",
  },
  CRITICAL: {
    label: "Critical",
    accent: "rose",
    badge: "border-rose-300/15 bg-rose-300/[0.08] text-rose-200",
    bar: "bg-rose-300",
    glow: "shadow-[0_0_34px_rgba(253,164,175,0.12)]",
  },
};

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(Number(value));
}

function formatDistance(km) {
  const value = Number(km);
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M km`;
  if (value >= 1_000) return `${formatNumber(value)} km`;
  return `${value.toFixed(0)} km`;
}

function formatGeneratedAt(timestamp) {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

function Metric({ label, value, detail, icon: Icon, tone = "neutral" }) {
  const tones = {
    neutral: "text-slate-300",
    sky: "text-sky-200",
    amber: "text-amber-200",
    rose: "text-rose-200",
  };
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow">{label}</span>
        <span className="icon-chip"><Icon size={15} /></span>
      </div>
      <div className={`mt-4 font-mono text-2xl font-semibold tracking-tight ${tones[tone]}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function ThreatBadge({ level, compact = false }) {
  const style = LEVELS[level] || LEVELS.LOW;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${style.badge} ${compact ? "px-2 py-0.5" : ""}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {style.label}
    </span>
  );
}

function ThreatDial({ score }) {
  const safeScore = Math.min(100, Math.max(0, Number(score) || 0));
  const level = safeScore >= 80 ? "CRITICAL" : safeScore >= 60 ? "HIGH" : safeScore >= 30 ? "MODERATE" : "LOW";
  const style = LEVELS[level];
  return (
    <div className={`threat-dial ${style.glow}`} style={{ "--score": `${safeScore}%` }}>
      <div className="threat-dial-inner">
        <div className="eyebrow">Index</div>
        <div className="mt-1 font-mono text-3xl font-semibold text-white">{safeScore}</div>
        <div className="mt-1"><ThreatBadge level={level} compact /></div>
      </div>
    </div>
  );
}

function AsteroidCard({ asteroid, tracked, onTrack, onOpen }) {
  const style = LEVELS[asteroid.threat_level] || LEVELS.LOW;
  return (
    <article className={`group panel panel-hover overflow-hidden p-5 ${style.glow}`}>
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={() => onOpen(asteroid)} className="min-w-0 text-left">
          <div className="eyebrow">NEO / {asteroid.id}</div>
          <h3 className="mt-2 truncate text-base font-semibold text-slate-100 group-hover:text-white">{asteroid.name}</h3>
        </button>
        <ThreatBadge level={asteroid.threat_level} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div><div className="eyebrow">Diameter</div><div className="stat-value">{formatNumber(asteroid.diameter, 3)} <span>km</span></div></div>
        <div><div className="eyebrow">Velocity</div><div className="stat-value">{formatNumber(asteroid.speed, 2)} <span>km/s</span></div></div>
        <div><div className="eyebrow">Miss distance</div><div className="stat-value">{formatDistance(asteroid.miss_distance)}</div></div>
        <div><div className="eyebrow">Score</div><div className="stat-value">{asteroid.threat_score}<span>/100</span></div></div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-600">
          <span>Threat signal</span><span>{asteroid.threat_score}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${asteroid.threat_score}%` }} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/[0.05] pt-4">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500">
          {asteroid.is_hazardous ? <ShieldAlert size={14} className="shrink-0 text-rose-300" /> : <Shield size={14} className="shrink-0 text-emerald-300" />}
          <span className="truncate">{asteroid.is_hazardous ? "NASA hazardous designation" : "No hazardous designation"}</span>
        </div>
        <button
          type="button"
          onClick={() => onTrack(asteroid)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${tracked ? "border-sky-300/20 bg-sky-300/[0.08] text-sky-200" : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"}`}
        >
          <Star size={13} fill={tracked ? "currentColor" : "none"} />
          {tracked ? "Tracked" : "Track"}
        </button>
      </div>
    </article>
  );
}

function DetailDrawer({ asteroid, tracked, onTrack, onClose }) {
  if (!asteroid) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 p-3 backdrop-blur-md sm:p-6" onMouseDown={onClose}>
      <aside className="drawer absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#070a10] p-6 sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow text-sky-300">Close approach profile</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{asteroid.name}</h2>
            <div className="mt-1 font-mono text-xs text-slate-600">{asteroid.id}</div>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close details"><X size={18} /></button>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
          <ThreatDial score={asteroid.threat_score} />
          <div>
            <div className="eyebrow">Signal summary</div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This index is a transparent visualization metric built from the NASA feed. It is not a NASA impact probability, forecast, or scientific risk assessment.
            </p>
            <button type="button" onClick={() => onTrack(asteroid)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-sky-300/15 bg-sky-300/[0.06] px-3.5 py-2 text-xs font-semibold text-sky-200">
              <Star size={14} fill={tracked ? "currentColor" : "none"} />
              {tracked ? "Remove from watchlist" : "Add to watchlist"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {["Speed", "Diameter", "Miss distance", "Hazardous", "Absolute magnitude", "Data ID"].map((label) => {
            const values = {
              Speed: `${formatNumber(asteroid.speed, 2)} km/s`,
              Diameter: `${formatNumber(asteroid.diameter, 3)} km`,
              "Miss distance": formatDistance(asteroid.miss_distance),
              Hazardous: asteroid.is_hazardous ? "Yes" : "No",
              "Absolute magnitude": formatNumber(asteroid.absolute_magnitude, 2),
              "Data ID": asteroid.id,
            };
            return (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="eyebrow">{label}</div>
                <div className="mt-2 break-words text-sm font-semibold text-slate-200">{values[label]}</div>
              </div>
            );
          })}
        </div>

        {asteroid.nasa_url && (
          <a href={asteroid.nasa_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-sky-300 hover:text-white">
            Open NASA / JPL record <ExternalLink size={13} />
          </a>
        )}
      </aside>
    </div>
  );
}

function Watchlist({ items, onTrack, open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm" onMouseDown={onClose}>
      <aside className="drawer absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-[#070a10] p-6 sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><div className="eyebrow text-sky-300">Local to this browser</div><h2 className="mt-2 text-xl font-semibold text-white">Watchlist</h2></div>
          <button type="button" onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Saved with browser storage, so the static site never needs a database or always-on server.</p>
        <div className="mt-6 space-y-2">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center">
              <Star className="mx-auto text-slate-700" size={26} />
              <p className="mt-4 text-sm text-slate-500">Nothing tracked yet.</p>
            </div>
          ) : items.map((item) => (
            <div key={item.asteroid_id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="icon-chip"><Orbit size={15} /></div>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-200">{item.name}</div><div className="mt-0.5 font-mono text-[9px] text-slate-600">{item.asteroid_id}</div></div>
              <button type="button" onClick={() => onTrack({ id: item.asteroid_id, name: item.name })} className="icon-button text-slate-600 hover:text-rose-300" aria-label={`Remove ${item.name}`}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function App() {
  const [snapshot, setSnapshot] = useState(null);
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("threat");
  const [level, setLevel] = useState("ALL");
  const [hazardOnly, setHazardOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [watchOpen, setWatchOpen] = useState(false);

  async function loadData() {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Data snapshot unavailable");
      setSnapshot(await response.json());
    } catch (err) {
      setError("The published data snapshot could not be loaded. Try again after the site finishes deploying.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  function toggleTrack(asteroid) {
    setWatchlist((items) => {
      const exists = items.some((item) => item.asteroid_id === asteroid.id);
      return exists ? items.filter((item) => item.asteroid_id !== asteroid.id) : [{ asteroid_id: asteroid.id, name: asteroid.name }, ...items];
    });
  }

  const asteroids = snapshot?.asteroids || [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = asteroids.filter((asteroid) => {
      const matchesQuery = !query || asteroid.name.toLowerCase().includes(query) || asteroid.id.toLowerCase().includes(query);
      const matchesLevel = level === "ALL" || asteroid.threat_level === level;
      const matchesHazard = !hazardOnly || asteroid.is_hazardous;
      return matchesQuery && matchesLevel && matchesHazard;
    });

    return [...result].sort((a, b) => {
      if (sort === "distance") return a.miss_distance - b.miss_distance;
      if (sort === "size") return b.diameter - a.diameter;
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.threat_score - a.threat_score;
    });
  }, [asteroids, search, sort, level, hazardOnly]);

  const stats = useMemo(() => {
    const hazardous = asteroids.filter((item) => item.is_hazardous).length;
    const critical = asteroids.filter((item) => item.threat_level === "CRITICAL").length;
    const high = asteroids.filter((item) => item.threat_level === "HIGH").length;
    const closest = asteroids.reduce((best, current) => !best || current.miss_distance < best.miss_distance ? current : best, null);
    const peak = asteroids.reduce((best, current) => Math.max(best, current.threat_score), 0);
    return { hazardous, critical, high, closest, peak, total: asteroids.length };
  }, [asteroids]);

  const topThreats = useMemo(() => [...asteroids].sort((a, b) => b.threat_score - a.threat_score).slice(0, 3), [asteroids]);
  const isDemo = snapshot?.demo_mode;

  return (
    <div className="site-shell">
      <div className="noise" />
      <header className="topbar">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-mark"><Orbit size={18} /></div>
            <div>
              <div className="brand-title">ASTEROID / THREAT INDEX</div>
              <div className="brand-subtitle">Public NEO intelligence dashboard</div>
            </div>
          </div>
          <button type="button" onClick={() => setWatchOpen(true)} className="watch-button">
            <Star size={15} fill={watchlist.length ? "currentColor" : "none"} />
            <span className="hidden sm:inline">Watchlist</span>
            {watchlist.length > 0 && <span className="watch-count">{watchlist.length}</span>}
          </button>
        </div>
      </header>

      <main className="container relative pb-16 pt-8 sm:pt-10">
        <section className="hero-grid">
          <div className="hero-copy">
            <div className="status-pill"><span className="live-dot" /> NASA NeoWs snapshot <span className="divider" /> {snapshot?.date || "—"}</div>
            <h1>See what is<br /><span>coming close.</span></h1>
            <p>
              A visual near-Earth object monitor built from NASA's daily feed. Scan the field, compare close approaches, and save the objects you want to keep an eye on.
            </p>
            <div className="hero-actions">
              <a href="#objects" className="primary-action"><Sparkles size={15} /> Explore the field <ChevronRight size={15} /></a>
              <button type="button" onClick={() => setWatchOpen(true)} className="secondary-action"><Star size={15} /> {watchlist.length || "No"} tracked</button>
            </div>
          </div>

          <div className="hero-visual panel">
            <div className="hero-visual-grid" />
            <div className="orbit-ring ring-a" /><div className="orbit-ring ring-b" /><div className="orbit-ring ring-c" />
            <div className="earth-core"><div className="earth-glow" /><span>EARTH</span></div>
            <div className="asteroid-dot dot-a" /><div className="asteroid-dot dot-b" /><div className="asteroid-dot dot-c" />
            <div className="hero-telemetry left"><span>FEED</span><strong>{snapshot?.source === "NASA NeoWs" ? "LIVE" : "DEMO"}</strong></div>
            <div className="hero-telemetry right"><span>OBJECTS</span><strong>{stats.total || "—"}</strong></div>
            <div className="hero-telemetry bottom"><span>LAST SYNC</span><strong>{snapshot ? formatGeneratedAt(snapshot.generated_at) : "—"}</strong></div>
          </div>
        </section>

        {error && <div className="notice notice-danger"><AlertTriangle size={16} /> <span>{error}</span><button type="button" onClick={loadData}>Retry</button></div>}
        {isDemo && !error && <div className="notice notice-warn"><AlertTriangle size={16} /><span>NASA did not return today's feed. Showing bundled demo data so the interface stays usable.</span></div>}

        <section className="metric-grid mt-8">
          <Metric label="Objects today" value={loading ? "—" : stats.total} detail="Near-Earth objects in snapshot" icon={Orbit} />
          <Metric label="Hazardous" value={loading ? "—" : stats.hazardous} detail="NASA hazardous designation" icon={ShieldAlert} tone="amber" />
          <Metric label="High + critical" value={loading ? "—" : stats.high + stats.critical} detail={`${stats.critical} critical by this demo index`} icon={AlertTriangle} tone="rose" />
          <Metric label="Closest pass" value={loading ? "—" : stats.closest ? formatDistance(stats.closest.miss_distance) : "—"} detail={stats.closest ? stats.closest.name : "No data"} icon={Database} tone="sky" />
        </section>

        <section className="dashboard-grid mt-4">
          <div className="panel p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div><div className="eyebrow">Highest current signal</div><h2 className="mt-2 text-lg font-semibold text-white">Three objects to know</h2></div>
              <div className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600 sm:block">ranked by demo index</div>
            </div>
            <div className="mt-5 space-y-2">
              {topThreats.length ? topThreats.map((asteroid, index) => (
                <button key={asteroid.id} type="button" onClick={() => setSelected(asteroid)} className="rank-row">
                  <span className="rank-number">0{index + 1}</span>
                  <span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-slate-200">{asteroid.name}</span><span className="mt-0.5 block font-mono text-[9px] text-slate-600">{formatDistance(asteroid.miss_distance)} · {formatNumber(asteroid.diameter, 3)} km</span></span>
                  <span className="font-mono text-sm text-slate-200">{asteroid.threat_score}</span>
                  <ChevronRight size={14} className="text-slate-700" />
                </button>
              )) : <div className="empty-state py-8">No snapshot data.</div>}
            </div>
          </div>

          <div className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4"><div><div className="eyebrow">Threat scale</div><h2 className="mt-2 text-lg font-semibold text-white">Read the signal</h2></div><SlidersHorizontal size={17} className="text-slate-600" /></div>
            <div className="mt-6 space-y-4">
              {[['LOW', '0–29', 'Low signal'], ['MODERATE', '30–59', 'Moderate signal'], ['HIGH', '60–79', 'High signal'], ['CRITICAL', '80–100', 'Critical signal']].map(([name, range, label]) => (
                <div key={name} className="legend-row"><ThreatBadge level={name} /><div className="ml-auto text-right"><div className="font-mono text-xs text-slate-300">{range}</div><div className="text-[10px] text-slate-600">{label}</div></div></div>
              ))}
            </div>
          </div>
        </section>

        <section id="objects" className="mt-10 scroll-mt-24">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><div className="eyebrow">Object field</div><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Every approach, one view.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Search, filter, and compare the normalized NASA snapshot. The score is a demo visualization, not an official risk rating.</p></div>
            <button type="button" onClick={loadData} disabled={refreshing} className="secondary-action self-start disabled:opacity-50">{refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {refreshing ? "Checking" : "Refresh snapshot"}</button>
          </div>

          <div className="filter-bar panel p-3">
            <div className="search-box"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or NEO ID" /></div>
            <div className="filter-group">
              <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="threat">Threat first</option><option value="distance">Closest first</option><option value="size">Largest first</option><option value="name">Name A–Z</option></select>
              <select value={level} onChange={(event) => setLevel(event.target.value)}><option value="ALL">All levels</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MODERATE">Moderate</option><option value="LOW">Low</option></select>
              <button type="button" onClick={() => setHazardOnly((value) => !value)} className={`filter-toggle ${hazardOnly ? "active" : ""}`}><Filter size={13} /> Hazardous</button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between px-1 text-[10px] uppercase tracking-[0.16em] text-slate-600"><span>{loading ? "Loading snapshot" : `${filtered.length} of ${asteroids.length} objects shown`}</span><span>{snapshot ? `Updated ${formatGeneratedAt(snapshot.generated_at)}` : ""}</span></div>

          <div className="mt-3 grid gap-3">
            {loading ? Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton-card" />) : filtered.length ? filtered.map((asteroid) => (
              <AsteroidCard key={asteroid.id} asteroid={asteroid} tracked={watchlist.some((item) => item.asteroid_id === asteroid.id)} onTrack={toggleTrack} onOpen={setSelected} />
            )) : <div className="empty-state panel py-20"><Search size={24} /><p className="mt-4 text-sm text-slate-500">No objects match the current filters.</p></div>}
          </div>
        </section>

        <footer className="mt-12 border-t border-white/[0.06] pt-6 text-[10px] uppercase tracking-[0.16em] text-slate-600">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3"><span>NASA NeoWs</span><span className="dot-separator" /><span>GitHub Pages</span><span className="dot-separator" /><span>Browser watchlist</span></div>
            <a className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-200" href="https://github.com/nasa/neo-ws" target="_blank" rel="noreferrer">Data source docs <ExternalLink size={12} /></a>
          </div>
          <div className="mt-3 max-w-3xl leading-5 text-slate-700">The Asteroid Threat Index is an original presentation metric for this project. It should not be used to infer actual impact probability or public safety risk.</div>
        </footer>
      </main>

      <DetailDrawer asteroid={selected} tracked={selected ? watchlist.some((item) => item.asteroid_id === selected.id) : false} onTrack={toggleTrack} onClose={() => setSelected(null)} />
      <Watchlist items={watchlist} onTrack={toggleTrack} open={watchOpen} onClose={() => setWatchOpen(false)} />
    </div>
  );
}

export default App;
