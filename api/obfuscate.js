export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
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

    const response = await fetch("https://wearedevs.net/api/obfuscate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://wearedevs.net",
        "Referer": "https://wearedevs.net/obfuscator",
        "Accept": "application/json, text/plain, */*",
      },
      body: JSON.stringify({ script }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || data.message || `Error HTTP ${response.status}`,
      });
    }

    if (data.error) {
      return res.status(400).json({ error: data.error });
    }

    const obfuscated = data.obfuscated || data.result || data.code;

    if (!obfuscated) {
      return res.status(500).json({ error: "Respuesta inválida del obfuscator" });
    }

    return res.status(200).json({ obfuscated });
  } catch (err) {
    console.error("Obfuscate proxy error:", err);
    return res.status(500).json({ error: "Error al ofuscar: " + (err.message || "unknown") });
  }
}
