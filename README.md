
# RSVP Reader (EN/DE)

Paste text → configure → speed read. Defaults: 300 WPM, chunk=1, medium text, black on white.

## Run locally
```
npm install
npm run dev
```

## Build
```
npm run build
npm run preview
```

## Keyboard
- Space: Play/Pause
- ← / →: Back 3s / Skip 1s
- ↑ / ↓: WPM ±25
- 1–0: WPM presets (100–1000)

## Deploy to GitHub Pages
- If deploying under a repo subpath, set `base` in `vite.config.ts` to `'/<repo-name>/'`.
- Push to `main`; GitHub Actions in `.github/workflows/pages.yml` builds and publishes.
