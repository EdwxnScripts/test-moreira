export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, redirectUri } = req.body || {};
    if (!code || !redirectUri) {
      return res.status(400).json({ error: "Missing code or redirectUri" });
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Faltan DISCORD_CLIENT_ID o DISCORD_CLIENT_SECRET en Vercel"
      });
    }

    // 1. Intercambiar code por access_token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(401).json({
        error: tokenData.error_description || "Token inválido de Discord"
      });
    }

    // 2. Obtener datos del usuario
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userData = await userRes.json();
    if (!userRes.ok || !userData.id) {
      return res.status(401).json({ error: "No se pudo obtener el usuario" });
    }

    // 3. Obtener servidores del usuario
    const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const guilds = await guildsRes.json();
    const REQUIRED_GUILD_ID = "1545539307115389090"; // WxnAd | Scripts

    // 4. Verificar si está en el servidor
    const inServer = Array.isArray(guilds) && guilds.some(g => String(g.id) === REQUIRED_GUILD_ID);

    // 5. Devolver usuario + inServer
    return res.status(200).json({
      id: userData.id,
      username: userData.username,
      global_name: userData.global_name,
      avatar: userData.avatar,
      discriminator: userData.discriminator,
      inServer: inServer
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error interno" });
  }
}
