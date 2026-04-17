const express = require("express");

const { get, run, parseJson } = require("../data/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const ALLOWED_KEYS = new Set(["locale", "density", "homeWidgets"]);
const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function containsBlockedKey(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  for (const key of Object.keys(value)) {
    if (BLOCKED_KEYS.has(key)) {
      return true;
    }
    if (containsBlockedKey(value[key])) {
      return true;
    }
  }

  return false;
}

function normalizePreferences(currentPreferences, incomingPreferences) {
  if (
    !incomingPreferences ||
    typeof incomingPreferences !== "object" ||
    Array.isArray(incomingPreferences) ||
    containsBlockedKey(incomingPreferences)
  ) {
    return { error: "Format de preferences invalide" };
  }

  const unknownKey = Object.keys(incomingPreferences).find((key) => !ALLOWED_KEYS.has(key));
  if (unknownKey) {
    return { error: `Champ de preferences non autorise: ${unknownKey}` };
  }

  const normalized = {
    locale:
      typeof currentPreferences.locale === "string" ? currentPreferences.locale : "fr-FR",
    density:
      typeof currentPreferences.density === "string"
        ? currentPreferences.density
        : "comfortable",
    homeWidgets: Array.isArray(currentPreferences.homeWidgets)
      ? currentPreferences.homeWidgets.filter((widget) => typeof widget === "string")
      : [],
  };

  if (Object.prototype.hasOwnProperty.call(incomingPreferences, "locale")) {
    if (!["fr-FR", "en-US"].includes(incomingPreferences.locale)) {
      return { error: "Locale non autorisee" };
    }
    normalized.locale = incomingPreferences.locale;
  }

  if (Object.prototype.hasOwnProperty.call(incomingPreferences, "density")) {
    if (!["comfortable", "compact"].includes(incomingPreferences.density)) {
      return { error: "Densite non autorisee" };
    }
    normalized.density = incomingPreferences.density;
  }

  if (Object.prototype.hasOwnProperty.call(incomingPreferences, "homeWidgets")) {
    if (!Array.isArray(incomingPreferences.homeWidgets)) {
      return { error: "homeWidgets doit etre une liste" };
    }
    normalized.homeWidgets = incomingPreferences.homeWidgets
      .filter((widget) => typeof widget === "string")
      .map((widget) => widget.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  return { preferences: normalized };
}

router.get("/api/preferences", requireAuth, (req, res) => {
  const profile = get("SELECT preferences_json AS preferencesJson FROM users WHERE id = $id", {
    $id: req.user.id,
  });
  const preferences = parseJson(profile?.preferencesJson);

  return res.json({
    preferences,
    pollutionVisible: false,
  });
});

router.patch("/api/preferences", requireAuth, (req, res) => {
  const profile = get("SELECT preferences_json AS preferencesJson FROM users WHERE id = $id", {
    $id: req.user.id,
  });
  const currentPreferences = parseJson(profile?.preferencesJson);
  const incomingPreferences = req.body || {};
  const result = normalizePreferences(currentPreferences, incomingPreferences);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  run("UPDATE users SET preferences_json = $preferences WHERE id = $id", {
    $preferences: JSON.stringify(result.preferences),
    $id: req.user.id,
  });

  return res.json({
    message: "Preferences mises a jour",
    preferences: result.preferences,
    pollutionVisible: false,
  });
});

module.exports = router;
