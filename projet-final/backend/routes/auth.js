const express = require("express");

const {
  get,
  all,
  run,
  createMailboxMessage,
  issueResetToken,
  parseJson,
  getUserByEmail,
  getUserByUsername,
  getUserById,
} = require("../data/db");
const { requireAuth, issueToken, attachCurrentUser } = require("../middleware/auth");

const router = express.Router();
const CANONICAL_FRONTEND_HOST = process.env.FRONTEND_HOST || "localhost:5173";
const CANONICAL_FRONTEND_PROTO = process.env.FRONTEND_PROTO || "http";

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeMailbox(rawValue) {
  return normalizeString(rawValue)
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function normalizeEmail(rawValue) {
  return normalizeString(rawValue).toLowerCase();
}

function getEmailCandidates(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
  }
  return [rawValue];
}

router.post("/api/auth/login", (req, res) => {
  const username = normalizeString(req.body.username);
  const password = normalizeString(req.body.password);

  if (!username || !password) {
    return res.status(400).json({ error: "Username et mot de passe requis" });
  }

  const user = get(
    `
      SELECT id, username, email, password, display_name AS displayName, role, department, mailbox, bio
      FROM users
      WHERE username = $username AND password = $password
    `,
    {
      $username: username,
      $password: password,
    }
  );

  if (!user) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const token = issueToken(user);

  return res.json({
    message: "Connexion reussie",
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      department: user.department,
      email: user.email,
      mailbox: user.mailbox,
    },
  });
});

router.post("/api/auth/forgot-password", (req, res) => {
  const rawEmailCandidates = getEmailCandidates(req.body.email);

  if (rawEmailCandidates.length !== 1) {
    return res.status(400).json({ error: "Email requis" });
  }

  const victimEmail = normalizeEmail(rawEmailCandidates[0]);
  if (!victimEmail) {
    return res.status(400).json({ error: "Email requis" });
  }

  const user = getUserByEmail(victimEmail);
  if (!user) {
    return res.json({
      message: "Si le compte existe, un email a ete prepare.",
    });
  }

  const resetToken = issueResetToken();
  run("UPDATE users SET reset_token = $resetToken WHERE id = $id", {
    $resetToken: resetToken,
    $id: user.id,
  });

  const resetLink = `${CANONICAL_FRONTEND_PROTO}://${CANONICAL_FRONTEND_HOST}/reset.html?token=${encodeURIComponent(resetToken)}`;

  createMailboxMessage({
    mailbox: user.mailbox,
    subject: `Reset mot de passe - ${user.displayName}`,
    htmlBody: [
      `<p>Bonjour ${user.displayName},</p>`,
      "<p>Voici le lien temporaire pour reinitialiser votre mot de passe :</p>",
      `<p><a href="${resetLink}">${resetLink}</a></p>`,
      "<p>Le lien expire des que le mot de passe est modifie.</p>",
    ].join(""),
    metadata: {
      victimEmail: user.email,
      victimUsername: user.username,
      poisoned: false,
      parameterPollution: false,
      resetLink,
      createdAt: new Date().toISOString(),
    },
  });

  return res.json({
    message: "Si le compte existe, un email a ete prepare.",
  });
});

router.get("/api/mail-preview", requireAuth, attachCurrentUser, (req, res) => {
  const mailbox = normalizeMailbox(req.query.mailbox);

  if (!mailbox) {
    return res.status(400).json({ error: "Mailbox requise" });
  }

  const currentUser = req.currentUser || getUserById(req.user.id);
  if (!currentUser) {
    return res.status(404).json({ error: "Compte introuvable" });
  }

  if (req.user.role !== "admin" && mailbox !== currentUser.mailbox) {
    return res.status(403).json({ error: "Acces refuse a cette boite" });
  }

  const messages = all(
    `
      SELECT id, mailbox, subject, html_body AS htmlBody, metadata_json AS metadataJson, created_at AS createdAt
      FROM mailbox_messages
      WHERE mailbox = $mailbox
      ORDER BY id DESC
    `,
    { $mailbox: mailbox }
  ).map((message) => ({
    ...message,
    metadata: parseJson(message.metadataJson),
  }));

  return res.json({
    mailbox,
    count: messages.length,
    messages,
  });
});

router.post("/api/auth/reset-password", (req, res) => {
  const token = normalizeString(req.body.token);
  const password = normalizeString(req.body.password);

  if (!token || !password) {
    return res.status(400).json({ error: "Token et mot de passe requis" });
  }

  const user = get(
    `
      SELECT id, username, email, password, display_name AS displayName, role, department, mailbox, bio
      FROM users
      WHERE reset_token = $token
    `,
    { $token: token }
  );

  if (!user) {
    return res.status(404).json({ error: "Token de reset invalide" });
  }

  run(
    "UPDATE users SET password = $password, reset_token = NULL WHERE id = $id",
    {
      $password: password,
      $id: user.id,
    }
  );

  const freshUser = getUserByUsername(user.username);
  const loginToken = issueToken(freshUser);

  return res.json({
    message: "Mot de passe mis a jour",
    token: loginToken,
    user: {
      id: freshUser.id,
      username: freshUser.username,
      displayName: freshUser.displayName,
      role: freshUser.role,
      department: freshUser.department,
      email: freshUser.email,
      mailbox: freshUser.mailbox,
    },
  });
});

router.get("/api/auth/me", requireAuth, attachCurrentUser, (req, res) => {
  if (!req.currentUser) {
    return res.status(404).json({ error: "Compte introuvable" });
  }

  return res.json({
    user: {
      id: req.currentUser.id,
      username: req.currentUser.username,
      displayName: req.currentUser.displayName,
      role: req.currentUser.role,
      department: req.currentUser.department,
      email: req.currentUser.email,
      mailbox: req.currentUser.mailbox,
      bio: req.currentUser.bio,
    },
    tokenMeta: req.tokenMeta,
  });
});

module.exports = router;
