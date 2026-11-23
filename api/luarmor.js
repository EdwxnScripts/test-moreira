// POST /api/luarmor  { script } -> stores script on Pastefy, returns unique id + loadstring
// GET  /api/luarmor?id=xxx     -> proxies raw lua (also used via /api/files/v4/loaders/[id])

const PASTEFY_API_KEY = process.env.PASTEFY_API_KEY || "V8FT0FE52MIx8k74EYbNWxdmnjSxtSRni5TXjiVUwxm7Sq4I2L7g8NYoKcYj";

function makeId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // Serve raw script by id (id is the pastefy paste id)
  if (req.method === "GET") {
    const id = String(req.query?.id || "").replace(/\.lua$/i, "").trim();
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { script } = req.body || {};
    if (!script || typeof script !== "string" || script.trim().length < 1) {
      return res.status(400).json({ error: "Script vacío o inválido" });
    }
    if (script.length > 500000) {
      return res.status(400).json({ error: "Script demasiado grande" });
    }

    // Unique public id (32 hex) for the loadstring URL
    const publicId = makeId();

    // Persist script content on Pastefy; title embeds publicId for reference
    const pasteRes = await fetch("https://pastefy.app/api/v2/paste", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + PASTEFY_API_KEY,
      },
      body: JSON.stringify({
        title: "luarmor-us-" + publicId + ".lua",
        content: script,
        visibility: "UNLISTED",
        encrypted: false,
        type: "PASTE",
      }),
    });

    const pasteText = await pasteRes.text();
    if (!pasteRes.ok) {
      return res.status(502).json({ error: "Storage HTTP " + pasteRes.status });
    }

    const pasteData = JSON.parse(pasteText);
    const paste = pasteData.paste || pasteData;
    if (!paste || !paste.id) {
      return res.status(502).json({ error: "Storage no ID" });
    }

    // We use paste.id as the path id so GET can resolve without a DB
    const id = String(paste.id);

    return res.status(200).json({
      id,
      loadstring: 'loadstring(game:HttpGet("https://api.luarmor.us/files/v4/loaders/' + id + '.lua"))()',
    });
  } catch (err) {
    console.error("Luarmor US error:", err);
    return res.status(500).json({ error: err.message || "upload failed" });
  }
}
