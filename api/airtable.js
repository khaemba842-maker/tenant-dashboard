// api/airtable.js
// Vercel serverless function — proxies all Airtable requests.
// The real API token lives in AIRTABLE_TOKEN env var, never in the frontend.

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_URL = "https://api.airtable.com";

export default async function handler(req, res) {
  // CORS — tighten the origin in production to your actual domain
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!AIRTABLE_TOKEN) {
    return res.status(500).json({ error: "AIRTABLE_TOKEN environment variable is not set." });
  }

  // req.url will be something like /api/airtable/v0/meta/bases/appXXX/tables
  // Strip the /api/airtable prefix to get the Airtable path
  const airtablePath = req.url.replace(/^\/api\/airtable/, "");

  if (!airtablePath || airtablePath === "/") {
    return res.status(400).json({ error: "No Airtable path provided." });
  }

  const upstreamUrl = `${BASE_URL}${airtablePath}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json(data);
    }

    // Cache for 30 seconds on Vercel edge (optional — remove if you want real-time)
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    console.error("Airtable proxy error:", err);
    return res.status(500).json({ error: "Failed to reach Airtable API.", detail: err.message });
  }
}
