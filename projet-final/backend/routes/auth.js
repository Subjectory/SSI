const express = require("express");
const jwt = require("jsonwebtoken");
const { users } = require("../data/store");
const { JWT_SECRET, requireAuth } = require("../middleware/auth");

const router = express.Router();

function sanitizeText(value) {
  return String(value || "").replace(/[<>]/g, "").trim();
}

router.post("/login", (req, res) => {
  const username = sanitizeText(req.body.username);
  const password = String(req.body.password || "").trim();

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  return res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  });
});

router.get("/api/token", requireAuth, (req, res) => {
  res.json({
    message: "Valid token",
    user: req.user,
  });
});

module.exports = router;