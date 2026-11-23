// GET /api/files/v4/loaders/:id
// Point api.luarmor.us -> this Vercel project and rewrite:
//   /files/v4/loaders/:id.lua  ->  /api/files/v4/loaders/:id

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  let id = req.query?.id || "";
  id = String(id).replace(/\.lua$/i, "").trim();
  if (!id) return res.status(400).send("-- missing id");

  try {
    const r = await fetch("https://pastefy.app/" + encodeURIComponent(id) + "/raw");
    if (!r.ok) return res.status(404).send("-- not found");
    const body = await r.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(body);
  } catch {
    return res.status(502).send("-- fetch failed");
  }
}
