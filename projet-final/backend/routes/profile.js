const express = require("express");

const { get } = require("../data/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/api/profile/:id", requireAuth, (req, res) => {
  const requestedId = Number(req.params.id);

  if (!requestedId) {
    return res.status(400).json({ error: "Identifiant de profil invalide" });
  }

  if (
    req.user.id !== requestedId &&
    req.user.role !== "manager" &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({ error: "Acces refuse" });
  }

  const profile = get(
    `
      SELECT
        id,
        username,
        email,
        display_name AS displayName,
        role,
        department,
        mailbox,
        bio
      FROM users
      WHERE id = $id
    `,
    { $id: requestedId }
  );

  if (!profile) {
    return res.status(404).json({ error: "Profil introuvable" });
  }

  return res.json(profile);
});

module.exports = router;
