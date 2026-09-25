# Asteroid / Threat Index

A polished, static GitHub Pages version of the Asteroid Threat Index. The site uses NASA's Near-Earth Object Web Service (NeoWs) to build a daily data snapshot, then renders the dashboard entirely in the browser.

## Production architecture

```text
NASA NeoWs
   │
   ▼
GitHub Actions (daily)
   │
   ├── normalize + score
   └── write frontend/public/data/asteroids.json
   │
   ▼
Vite build
   │
   ▼
GitHub Pages
   │
   └── yourusername.github.io/ATI/
```

There is no always-on server and no production database. The watchlist is stored in the visitor's browser with `localStorage`.

## Local development

```bash
cd frontend
npm install
npm run dev
```

Open the local Vite URL, normally `http://localhost:5173/ATI/`.

To refresh the bundled data snapshot manually:

```bash
node scripts/fetch-asteroids.mjs
```

The local page can still be previewed with:

```bash
cd frontend
npm run build
npm run preview
```

## GitHub Actions

- `deploy.yml` builds and deploys the React/Vite site on pushes to `main`, on a daily schedule, or manually from the Actions tab.
- Before each build, the workflow refreshes the NASA NeoWs snapshot with `${{ secrets.NASA_API_KEY || 'DEMO_KEY' }}`. The key is only available to the GitHub Actions runner and is never bundled into the React app.
- When NASA is unavailable, the workflow falls back to the bundled demo dataset, so the site remains presentable.

## Threat Index disclaimer

Threat Index is a custom visualization metric for this project. It is **not** an official NASA risk score, impact probability, or scientific assessment.
