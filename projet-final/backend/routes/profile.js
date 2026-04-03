const express = require("express");
const { users } = require("../data/store");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/profile", requireAuth, (req, res) => {
  const id = Number(req.query.id);

  if (!id) {
    return res.status(400).json({ error: "Missing profile id" });
  }

  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: "Profile not found" });
  }

  return res.json({
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    department: user.department,
    email: user.email,
  });
});

module.exports = router;