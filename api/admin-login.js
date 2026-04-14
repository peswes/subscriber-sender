export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ message: "Only POST allowed" });

  try {
    const { username, password } = req.body;

    // 🔐 LOAD FROM ENV
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;

    if (!ADMIN_USER || !ADMIN_PASS) {
      return res.status(500).json({ message: "Server misconfigured" });
    }

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      return res.status(200).json({
        message: "Login successful",
        token: process.env.ADMIN_PASS // simple token (we improve later)
      });
    }

    return res.status(401).json({
      message: "Invalid username or password"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}