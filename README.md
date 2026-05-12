# Tenant Dashboard

Property management dashboard backed by Airtable, with a secure Express/Vercel proxy so the API token never touches the browser.

## Project structure

```
tenant-dashboard/
├── api/
│   └── airtable.js      ← Vercel serverless function (the proxy)
├── src/
│   ├── main.jsx
│   └── Dashboard.jsx    ← React frontend (no API keys here)
├── index.html
├── vite.config.js
├── vercel.json
├── dev-server.js        ← Local dev proxy (mirrors the Vercel function)
├── package.json
└── .env.example
```

---

## Local development

### 1. Install dependencies

```bash
npm install
npm install --save-dev express cors dotenv  # for the local dev proxy
```

### 2. Create your .env file

```bash
cp .env.example .env
```

Edit `.env` and paste your real Airtable token:

```
AIRTABLE_TOKEN=patH9Zxsr2iBbBzQG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Start the proxy + frontend (two terminals)

**Terminal 1 — proxy:**
```bash
node dev-server.js
# ✓ Airtable proxy running on http://localhost:3001
```

**Terminal 2 — frontend:**
```bash
npm run dev
# Vite forwards /api/* → localhost:3001
```

Open http://localhost:5173

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tenant-dashboard.git
git push -u origin main
```

### 2. Import on Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

### 3. Add the environment variable

In your Vercel project → **Settings → Environment Variables**:

| Name | Value |
|------|-------|
| `AIRTABLE_TOKEN` | `patH9Zxsr2iBbBzQG.your_actual_token` |
| `ALLOWED_ORIGIN` | `https://your-app.vercel.app` |

Click **Save**, then **Redeploy**.

That's it. The token lives only in Vercel's encrypted env store — never in your source code or the browser.

---

## How the proxy works

```
Browser → GET /api/airtable/v0/BASE_ID/TABLE_ID
             ↓
         Vercel serverless function (api/airtable.js)
             ↓  injects Authorization: Bearer $AIRTABLE_TOKEN
         Airtable API
             ↓
         JSON response back to browser
```

The `vercel.json` rewrite rule routes all `/api/airtable/*` paths to the single serverless function, which strips the prefix and forwards to Airtable.

---

## Tightening security (production checklist)

- [ ] Set `ALLOWED_ORIGIN` to your exact Vercel domain (not `*`)
- [ ] Rotate your Airtable token — the one in this readme was exposed in chat
- [ ] Consider adding a simple auth header check in `api/airtable.js` if the dashboard should not be publicly accessible
