// Caché en memoria del servidor (se reinicia al redeploy, pero evita spam)
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCache(key, value) {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL });
}

async function lookupByUsernames(username) {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      usernames: [username],
      excludeBannedUsers: false
    })
  });
  return res;
}

async function lookupBySearch(username) {
  const res = await fetch(
    `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`,
    { headers: { Accept: "application/json" } }
  );
  return res;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const username = String(req.query.username || "").trim().replace(/^@+/, "");
    if (!username) {
      return res.status(400).json({ error: "Missing username" });
    }

    const cacheKey = username.toLowerCase();
    const cached = getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // 1) Intentos con endpoint exacto
    let robloxRes = await lookupByUsernames(username);

    // Si rate-limit, espera un poco y reintenta 1 vez
    if (robloxRes.status === 429) {
      await new Promise(r => setTimeout(r, 1200));
      robloxRes = await lookupByUsernames(username);
    }

    // 2) Fallback a search si sigue mal
    if (!robloxRes.ok) {
      robloxRes = await lookupBySearch(username);
    }

    if (robloxRes.status === 429) {
      return res.status(429).json({ error: "Rate limited" });
    }

    if (!robloxRes.ok) {
      return res.status(robloxRes.status).json({ error: "Roblox API error" });
    }

    const data = await robloxRes.json();
    const list = Array.isArray(data.data) ? data.data : [];

    const match =
      list.find(u => (u.requestedUsername || "").toLowerCase() === cacheKey) ||
      list.find(u => (u.name || "").toLowerCase() === cacheKey) ||
      list[0];

    if (!match || !match.id) {
      return res.status(404).json({ error: "User not found" });
    }

    const payload = {
      id: String(match.id),
      name: match.name || username
    };

    setCache(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error interno" });
  }
}
