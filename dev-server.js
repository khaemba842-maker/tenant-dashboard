// dev-server.js — run this locally with: node dev-server.js
// Simulates the Vercel serverless function so you can develop without deploying.
// Reads AIRTABLE_TOKEN from a .env file via dotenv.

import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = 3001;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_URL = "https://api.airtable.com";

app.use(cors());

app.get("/api/airtable/*path", async (req, res) => {
  if (!AIRTABLE_TOKEN) {
    return res.status(500).json({ error: "AIRTABLE_TOKEN not set in .env" });
  }

  const airtablePath = req.path.replace("/api/airtable", "");
  const query = Object.keys(req.query).length
    ? "?" + new URLSearchParams(req.query).toString()
    : "";

  const upstreamUrl = `${BASE_URL}${airtablePath}${query}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Airtable proxy running on http://localhost:${PORT}`);
  console.log(`  Token: ${AIRTABLE_TOKEN ? "loaded ✓" : "MISSING ✗ — check your .env"}`);
});
