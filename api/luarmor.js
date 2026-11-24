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

  // GET ?id=xxx — browser sees private page; Roblox gets raw lua
  if (req.method === "GET") {
    const id = String(req.query?.id || "").replace(/\.lua$/i, "").trim();
    if (!id) return res.status(400).send("-- missing id");

    const ua = String(req.headers["user-agent"] || "");
    const accept = String(req.headers["accept"] || "");
    const browser = /mozilla|chrome|safari|firefox|edge|opera/i.test(ua) || accept.includes("text/html");

    if (browser) {
      const url = "https://api.luarmor.us/files/v4/loaders/" + id + ".lua";
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Loader</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1b26;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#c0caf5;padding:24px}.box{text-align:center;max-width:640px;width:100%}.icon{font-size:42px;margin-bottom:12px}h1{font-size:1.5rem;font-weight:700;margin-bottom:22px;color:#e0e0e0}.url-row{display:flex;align-items:center;gap:10px;background:#12131c;border:1px solid #2a2b3d;border-radius:12px;padding:12px 14px;margin-bottom:18px}.url{flex:1;text-align:left;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#e0af68;word-break:break-all}button{background:#3b3d57;color:#c0caf5;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer}button:hover{background:#4a4d6a}.msg{font-size:13px;line-height:1.5}.msg strong{color:#f7768e}.msg span{color:#7a7c9b}</style></head>
<body><div class="box"><div class="icon">📜</div><h1>Loader</h1><div class="url-row"><div class="url" id="u">loadstring(game:HttpGet("${url}"))()</div><button type="button" onclick="navigator.clipboard.writeText(document.getElementById('u').textContent)">Copiar</button></div><p class="msg"><strong>Permiso Denegado. Loader Privado</strong> <span>· El contenido no se puede mostrar en el navegador</span></p></div></body></html>`);
    }

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
