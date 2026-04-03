const express = require("express");
const fs = require("fs");

const { flags, runtimePaths } = require("../data/db");

const router = express.Router();

function isLoopback(remoteAddress) {
  return (
    remoteAddress === "::1" ||
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::ffff:127.0.0.1"
  );
}

function loopbackOnly(req, res, next) {
  const remoteAddress = req.socket.remoteAddress;
  if (!isLoopback(remoteAddress)) {
    return res.status(403).json({ error: "Endpoint interne uniquement" });
  }
  return next();
}

router.get("/internal/certificates/signing-material", loopbackOnly, (req, res) => {
  const partnerKey = fs.readFileSync(runtimePaths.partnerPublicKeyFile, "utf8");
  res.type("text/plain").send(
    [
      "CorpHack Internal Preview Material",
      `flag=${flags.certificateSsrf}`,
      "kid=partner-public.key",
      "key_material:",
      partnerKey,
      "",
      `next_flag_hint=${flags.jwtKid}`,
    ].join("\n")
  );
});

module.exports = router;
