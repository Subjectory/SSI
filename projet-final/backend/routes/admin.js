const express = require("express");
const { exec } = require("child_process");

const { get, flags, runtimePaths } = require("../data/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

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
    flag:
      req.tokenMeta?.kid && req.tokenMeta.kid !== "default-signing.key"
        ? flags.jwtKid
        : undefined,
    diagnosticsHint:
      "Le module diagnostics execute un ping shell standard. Usage reserve aux administrateurs.",
  });
});

router.post("/api/admin/diagnostics/ping", requireAuth, requireAdmin, (req, res) => {
  const target = String(req.body.target || "127.0.0.1").trim();
  const command =
    process.platform === "win32"
      ? `ping -n 1 ${target}`
      : `ping -c 1 ${target}`;

  exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
    const output = [stdout, stderr, error?.message].filter(Boolean).join("\n");
    return res.json({
      command,
      output,
      flag: output.includes(flags.commandInjection) ? flags.commandInjection : undefined,
      hint: `Fichier pivot local: ${runtimePaths.finalFlagFile}`,
    });
  });
});

module.exports = router;
