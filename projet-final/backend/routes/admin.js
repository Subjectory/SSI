const express = require("express");
const { execFile } = require("child_process");
const net = require("net");

const { get } = require("../data/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function isValidDiagnosticTarget(target) {
  if (net.isIP(target)) {
    return true;
  }

  if (target.length > 253) {
    return false;
  }

  return /^(localhost|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/.test(
    target
  );
}

router.get("/api/admin", requireAuth, requireAdmin, (req, res) => {
  const counts = {
    users: get("SELECT COUNT(*) AS count FROM users").count,
    trainings: get("SELECT COUNT(*) AS count FROM trainings").count,
    documents: get("SELECT COUNT(*) AS count FROM documents").count,
    comments: get("SELECT COUNT(*) AS count FROM comments").count,
  };

  return res.json({
    message: "Tableau de bord admin",
    counts,
    diagnosticsHint:
      "Le module diagnostics execute une verification reseau sans shell. Usage reserve aux administrateurs.",
  });
});

router.post("/api/admin/diagnostics/ping", requireAuth, requireAdmin, (req, res) => {
  const target = String(req.body.target || "127.0.0.1").trim();

  if (!isValidDiagnosticTarget(target)) {
    return res.status(400).json({ error: "Cible de diagnostic invalide" });
  }

  const args = process.platform === "win32" ? ["-n", "1", target] : ["-c", "1", target];

  execFile("ping", args, { timeout: 5000 }, (error, stdout, stderr) => {
    const output = [stdout, stderr, error?.message].filter(Boolean).join("\n");
    return res.json({
      command: ["ping", ...args].join(" "),
      output,
    });
  });
});

module.exports = router;
