export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const username = (req.query.username || "").trim().replace(/^@+/, "");
    if (!username) {
      return res.status(400).json({ error: "Missing username" });
    }

    // Endpoint oficial de Roblox por username exacto
    const robloxRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false
      })
    });

    if (robloxRes.status === 429) {
      return res.status(429).json({ error: "Rate limited" });
    }

    if (!robloxRes.ok) {
      return res.status(robloxRes.status).json({ error: "Roblox API error" });
    }

    const data = await robloxRes.json();
    const list = Array.isArray(data.data) ? data.data : [];
    const match =
      list.find(u => (u.requestedUsername || "").toLowerCase() === username.toLowerCase()) ||
      list.find(u => (u.name || "").toLowerCase() === username.toLowerCase()) ||
      list[0];

    if (!match || !match.id) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      id: String(match.id),
      name: match.name || username
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error interno" });
  }
}
