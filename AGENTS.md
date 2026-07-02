# Tahseen — Contributor / Agent Notes

Web monorepo (npm workspaces):

- `frontend/` — React 19 + Vite SPA. Plain JS/JSX (no TypeScript). Design tokens live in `frontend/src/styles/global.css`; use CSS logical properties (the app is RTL Arabic-first with an English toggle). All user-facing strings go through `frontend/src/i18n.js`.
- `backend/` — Express API (ESM). The OpenAI key lives ONLY in `backend/.env` (never commit it; `.env.example` is the template).
- `service/` — Pure ESM AI-agent library (interrogationAgent, fraudAgent, chatAgent). Used only by the backend. Keep response JSON shapes stable — the frontend depends on them.

Commands (from repo root):

- `npm install` — installs all workspaces
- `npm run dev` — backend on :3001 + frontend on :5173 (Vite proxies /api)
- `npm run build` — bundles frontend into `frontend/dist/`
- `npm start` — single Express server on :3001 serving the built frontend + API
