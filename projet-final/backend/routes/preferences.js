const express = require("express");

const { get, run, parseJson, flags } = require("../data/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function deepMerge(target, source) {
  if (!source || typeof source !== "object") {
    return target;
  }

  for (const key of Object.keys(source)) {
    const value = source[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }

  return target;
}

router.get("/api/preferences", requireAuth, (req, res) => {
  const profile = get("SELECT preferences_json AS preferencesJson FROM users WHERE id = $id", {
    $id: req.user.id,
  });
  const preferences = parseJson(profile?.preferencesJson);
  const dashboardDefaults = {
    locale: "fr-FR",
    density: "comfortable",
  };

  return res.json({
    preferences,
    pollutionVisible: dashboardDefaults.flagEightUnlocked === true,
    flag: dashboardDefaults.flagEightUnlocked === true ? flags.prototypePollution : undefined,
  });
});

router.patch("/api/preferences", requireAuth, (req, res) => {
  const profile = get("SELECT preferences_json AS preferencesJson FROM users WHERE id = $id", {
    $id: req.user.id,
  });
  const currentPreferences = parseJson(profile?.preferencesJson);
  const incomingPreferences = req.body || {};

  deepMerge(currentPreferences, incomingPreferences);

  run("UPDATE users SET preferences_json = $preferences WHERE id = $id", {
    $preferences: JSON.stringify(currentPreferences),
    $id: req.user.id,
  });

  const previewDefaults = {
    locale: "fr-FR",
    density: "comfortable",
  };

  return res.json({
    message: "Preferences mises a jour",
    preferences: currentPreferences,
    pollutionVisible: previewDefaults.flagEightUnlocked === true,
    flag: previewDefaults.flagEightUnlocked === true ? flags.prototypePollution : undefined,
  });
});

module.exports = router;
