const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const { runtimePaths, getUserById } = require("../data/db");

function readKeyMaterial(relativePath) {
  const resolvedPath = path.resolve(runtimePaths.keysDir, relativePath);
  if (!fs.existsSync(resolvedPath)) {
    return fs.readFileSync(runtimePaths.defaultSigningKeyFile, "utf8").trim();
  }
  return fs.readFileSync(resolvedPath, "utf8").trim();
}

function parseTokenHeader(token) {
  const [headerPart] = String(token || "").split(".");
  if (!headerPart) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
  } catch (error) {
    return {};
  }
}

function getJwtSecretForToken(token) {
  const header = parseTokenHeader(token);
  const kid = typeof header.kid === "string" ? header.kid : "default-signing.key";
  return {
    header,
    kid,
    secret: readKeyMaterial(kid),
  };
}

function issueToken(user, options = {}) {
  const kid = options.kid || "default-signing.key";
  const secret = readKeyMaterial(kid);
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "8h",
      header: {
        kid,
        typ: "JWT",
      },
    }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const { secret, kid } = getJwtSecretForToken(token);
    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });
    req.user = payload;
    req.tokenMeta = { kid };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token invalide" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin uniquement" });
  }
  return next();
}

function attachCurrentUser(req, res, next) {
  if (!req.user) {
    return next();
  }

  req.currentUser = getUserById(req.user.id) || null;
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  attachCurrentUser,
  issueToken,
  parseTokenHeader,
  getJwtSecretForToken,
  readKeyMaterial,
};
