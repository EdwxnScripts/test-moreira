// POST /api/luarmor  { script } -> stores script on Pastefy, returns unique id + loadstring
// GET  /api/luarmor?id=xxx     -> raw lua for Roblox; private HTML page only for real browsers

const PASTEFY_API_KEY = process.env.PASTEFY_API_KEY || "V8FT0FE52MIx8k74EYbNWxdmnjSxtSRni5TXjiVUwxm7Sq4I2L7g8NYoKcYj";
const DISCORD_SERVER_URL = "https://discord.gg/UA9xGPKAqE";

function makeId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function extractId(req) {
  let id = req.query?.id;
  if (Array.isArray(id)) id = id[0];
  if (id) return String(id).replace(/\.lua$/i, "").trim();

  const candidates = [
    req.url,
    req.headers["x-forwarded-uri"],
    req.headers["x-invoke-path"],
    req.headers["x-matched-path"],
  ].filter(Boolean).map(String);

  for (const raw of candidates) {
    const m =
      raw.match(/\/files\/v4\/loaders\/([^/?#]+)/i) ||
      raw.match(/[?&]id=([^&]+)/i) ||
      raw.match(/\/api\/luarmor\/([^/?#]+)/i);
    if (m) return decodeURIComponent(m[1]).replace(/\.lua$/i, "").trim();
  }
  return "";
}

// Solo página privada para navegación real del browser.
// Roblox HttpGet / executors siempre reciben raw Lua.
function isRealBrowser(req) {
  const ua = String(req.headers["user-agent"] || "");
  const accept = String(req.headers["accept"] || "");
  const secFetchDest = String(req.headers["sec-fetch-dest"] || "");
  const secFetchMode = String(req.headers["sec-fetch-mode"] || "");

  // Roblox / syn / executors nunca deben ver HTML
  if (/roblox|syn\s*x|sentinel|krnl|fluxus|wave|delta|codex|solara|bunni|electron|jjj|macsploit|hydrogen|arceus/i.test(ua)) {
    return false;
  }

  // Navegación de documento en browser moderno
  if (secFetchDest === "document" || secFetchMode === "navigate") {
    return true;
  }

  // Fallback: UA de browser + Accept HTML, sin señales de game client
  const looksBrowser = /mozilla\/|chrome\/|safari\/|firefox\/|edg\//i.test(ua);
  const wantsHtml = accept.includes("text/html");
  return looksBrowser && wantsHtml;
}

function privatePage(id) {
  const url = "https://api.luarmor.us/files/v4/loaders/" + id + ".lua";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Loader</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1b26;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#c0caf5;padding:24px}
.box{text-align:center;max-width:640px;width:100%}
.icon{font-size:42px;margin-bottom:12px}
h1{font-size:1.5rem;font-weight:700;margin-bottom:22px;color:#e0e0e0}
.url-row{display:flex;align-items:center;gap:10px;background:#12131c;border:1px solid #2a2b3d;border-radius:12px;padding:12px 14px;margin-bottom:18px}
.url{flex:1;text-align:left;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#e0af68;word-break:break-all}
button{background:#3b3d57;color:#c0caf5;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer}
button:hover{background:#4a4d6a}
.msg{font-size:13px;line-height:1.5;margin-bottom:22px}
.msg strong{color:#f7768e}
.msg span{color:#7a7c9b}
.discord-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  background:linear-gradient(135deg,#5865F2,#4752C4);color:#fff;text-decoration:none;
  padding:12px 20px;border-radius:12px;font-size:14px;font-weight:700;
  box-shadow:0 8px 24px rgba(88,101,242,0.35);transition:transform .15s,box-shadow .2s
}
.discord-btn:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(88,101,242,0.45)}
.discord-btn svg{width:20px;height:20px;fill:currentColor}
</style>
</head>
<body>
  <div class="box">
    <div class="icon">📜</div>
    <h1>Loader</h1>
    <div class="url-row">
      <div class="url" id="u">loadstring(game:HttpGet("${url}"))()</div>
      <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('u').textContent)">Copiar</button>
    </div>
    <p class="msg"><strong>Permiso Denegado. Loader Privado</strong> <span>· El contenido no se puede mostrar en el navegador</span></p>
    <a class="discord-btn" href="${DISCORD_SERVER_URL}" target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
      Únete a nuestro Servidor
    </a>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // ---------- GET ----------
  if (req.method === "GET") {
    const id = extractId(req);
    if (!id) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(400).send("-- missing id");
    }

    // Solo navegador real → página privada
    if (isRealBrowser(req)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(privatePage(id));
    }

    // Roblox / executor / curl → RAW LUA
    try {
      const r = await fetch("https://pastefy.app/" + encodeURIComponent(id) + "/raw", {
        headers: {
          "User-Agent": "LuarmorUS-Loader/1.0",
          Accept: "text/plain,*/*",
        },
      });
      if (!r.ok) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.status(404).send("-- not found");
      }
      const body = await r.text();

      // Seguridad: no devolver HTML por error
      if (/^\s*</.test(body) && /<html|<!doctype/i.test(body)) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.status(502).send("-- invalid upstream content");
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(body);
    } catch (e) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(502).send("-- fetch failed");
    }
  }

  // ---------- POST ----------
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

    const publicId = makeId();

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
      return res.status(502).json({ error: "Storage HTTP " + pasteRes.status + ": " + pasteText.slice(0, 120) });
    }

    const pasteData = JSON.parse(pasteText);
    const paste = pasteData.paste || pasteData;
    if (!paste || !paste.id) {
      return res.status(502).json({ error: "Storage no ID" });
    }

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

