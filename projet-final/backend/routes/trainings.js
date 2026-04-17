const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const AdmZip = require("adm-zip");

const { all, get, run, flags, runtimePaths } = require("../data/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, runtimePaths.importsDir),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${String(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  },
});

const importUpload = multer({
  storage: importStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function userHasTrainingAccess(user, trainingId) {
  if (user.role === "admin" || user.role === "manager") {
    return true;
  }

  const registration = get(
    `
      SELECT access_granted AS accessGranted
      FROM training_registrations
      WHERE training_id = $trainingId AND user_id = $userId
    `,
    {
      $trainingId: trainingId,
      $userId: user.id,
    }
  );

  return Boolean(registration?.accessGranted);
}

router.get("/api/trainings", requireAuth, (req, res) => {
  const trainings = all(
    `
      SELECT
        t.id,
        t.slug,
        t.title,
        t.description,
        t.seats,
        t.restricted_role AS restrictedRole,
        t.approval_required AS approvalRequired,
        t.review_code AS reviewCode,
        t.badge_url AS badgeUrl,
        r.id AS registrationId,
        r.status,
        r.approved_by_manager AS approvedByManager,
        r.access_granted AS accessGranted,
        r.confirmation_counter AS confirmationCounter
      FROM trainings t
      LEFT JOIN training_registrations r
        ON r.training_id = t.id AND r.user_id = $userId
      ORDER BY t.id ASC
    `,
    { $userId: req.user.id }
  );

  return res.json(
    trainings.map((training) => ({
      ...training,
      reviewCode:
        req.user.role === "admin" || req.user.role === "manager"
          ? training.reviewCode
          : undefined,
      resources: userHasTrainingAccess(req.user, training.id)
        ? all(
            `
              SELECT id, title, filename
              FROM training_resources
              WHERE training_id = $trainingId
              ORDER BY id ASC
            `,
            { $trainingId: training.id }
          )
        : [],
    }))
  );
});

router.post("/api/trainings/:id/request-access", requireAuth, (req, res) => {
  const trainingId = Number(req.params.id);
  const training = get(
    `
      SELECT id, title, approval_required AS approvalRequired
      FROM trainings
      WHERE id = $id
    `,
    { $id: trainingId }
  );

  if (!training) {
    return res.status(404).json({ error: "Formation introuvable" });
  }

  const existing = get(
    `
      SELECT id, status, access_granted AS accessGranted
      FROM training_registrations
      WHERE training_id = $trainingId AND user_id = $userId
    `,
    {
      $trainingId: trainingId,
      $userId: req.user.id,
    }
  );

  if (existing) {
    return res.json({
      message: "Demande deja existante",
      registrationId: existing.id,
      status: existing.status,
      accessGranted: Boolean(existing.accessGranted),
    });
  }

  const result = run(
    `
      INSERT INTO training_registrations (
        training_id, user_id, status, approved_by_manager, access_granted, confirmation_counter, notes, created_at
      ) VALUES (
        $trainingId, $userId, 'pending', 0, 0, 0, $notes, $createdAt
      )
    `,
    {
      $trainingId: trainingId,
      $userId: req.user.id,
      $notes: `Demande creee pour ${req.user.username}`,
      $createdAt: new Date().toISOString(),
    }
  );

  return res.status(201).json({
    message: "Demande d'acces creee",
    registrationId: Number(result.lastInsertRowid),
    status: "pending",
    approvalRequired: Boolean(training.approvalRequired),
  });
});

router.get("/api/trainings/requests/:requestId", requireAuth, (req, res) => {
  const requestId = Number(req.params.requestId);
  const request = get(
    `
      SELECT
        r.id,
        r.user_id AS ownerUserId,
        r.status,
        r.approved_by_manager AS approvedByManager,
        r.access_granted AS accessGranted,
        r.confirmation_counter AS confirmationCounter,
        r.created_at AS createdAt,
        u.username,
        u.display_name AS displayName,
        t.id AS trainingId,
        t.title AS trainingTitle,
        t.review_code AS reviewCode,
        t.approval_required AS approvalRequired
      FROM training_registrations r
      JOIN users u ON u.id = r.user_id
      JOIN trainings t ON t.id = r.training_id
      WHERE r.id = $requestId
    `,
    { $requestId: requestId }
  );

  if (!request) {
    return res.status(404).json({ error: "Demande introuvable" });
  }

  const canViewRequest =
    req.user.id === request.ownerUserId ||
    req.user.role === "manager" ||
    req.user.role === "admin";

  if (!canViewRequest) {
    return res.status(403).json({ error: "Acces refuse a cette demande" });
  }

  const canViewReviewCode = req.user.role === "manager" || req.user.role === "admin";

  return res.json({
    ...request,
    reviewCode: canViewReviewCode ? request.reviewCode : undefined,
  });
});

router.post("/api/trainings/:id/confirm", requireAuth, (req, res) => {
  const trainingId = Number(req.params.id);
  const reviewCode = String(req.body.reviewCode || "").trim();

  const training = get(
    `
      SELECT id, title, approval_required AS approvalRequired, review_code AS reviewCode
      FROM trainings
      WHERE id = $id
    `,
    { $id: trainingId }
  );

  if (!training) {
    return res.status(404).json({ error: "Formation introuvable" });
  }

  const registration = get(
    `
      SELECT id, status, approved_by_manager AS approvedByManager, access_granted AS accessGranted, confirmation_counter AS confirmationCounter
      FROM training_registrations
      WHERE training_id = $trainingId AND user_id = $userId
    `,
    {
      $trainingId: trainingId,
      $userId: req.user.id,
    }
  );

  if (!registration) {
    return res.status(404).json({ error: "Aucune demande en cours" });
  }

  if (reviewCode !== training.reviewCode) {
    return res.status(403).json({ error: "Code de validation incorrect" });
  }

  run(
    `
      UPDATE training_registrations
      SET confirmation_counter = confirmation_counter + 1
      WHERE id = $id
    `,
    { $id: registration.id }
  );

  const latest = get(
    `
      SELECT id, status, approved_by_manager AS approvedByManager, access_granted AS accessGranted, confirmation_counter AS confirmationCounter
      FROM training_registrations
      WHERE id = $id
    `,
    { $id: registration.id }
  );

  if (latest.approvedByManager) {
    run(
      `
        UPDATE training_registrations
        SET status = 'approved', access_granted = 1
        WHERE id = $id
      `,
      { $id: latest.id }
    );

    return res.json({
      message: "Acces confirme apres validation manager",
      accessGranted: true,
    });
  }

  if (!training.approvalRequired) {
    run(
      `
        UPDATE training_registrations
        SET status = 'approved', access_granted = 1
        WHERE id = $id
      `,
      { $id: latest.id }
    );

    return res.json({
      message: "Acces confirme",
      accessGranted: true,
      attempts: latest.confirmationCounter,
    });
  }

  return res.json({
    message: "En attente de validation manager",
    accessGranted: false,
    attempts: latest.confirmationCounter,
  });
});

router.get("/api/trainings/:id/resources/:resourceId", requireAuth, (req, res) => {
  const trainingId = Number(req.params.id);
  const resourceId = Number(req.params.resourceId);

  const resource = get(
    `
      SELECT id, training_id AS trainingId, title, filename, storage_path AS storagePath
      FROM training_resources
      WHERE id = $resourceId AND training_id = $trainingId
    `,
    {
      $resourceId: resourceId,
      $trainingId: trainingId,
    }
  );

  if (!resource) {
    return res.status(404).json({ error: "Ressource introuvable" });
  }

  if (!userHasTrainingAccess(req.user, trainingId)) {
    return res.status(403).json({ error: "Acces a la ressource refuse" });
  }

  const content = fs.readFileSync(resource.storagePath, "utf8");

  return res.json({
    resource: {
      id: resource.id,
      title: resource.title,
      filename: resource.filename,
      content,
    },
  });
});

router.post("/api/trainings/:id/certificate-preview", requireAuth, async (req, res) => {
  const trainingId = Number(req.params.id);
  if (!userHasTrainingAccess(req.user, trainingId)) {
    return res.status(403).json({ error: "Acces preview certificat refuse" });
  }

  const attendeeName = String(
    req.body.attendeeName || req.user.displayName || req.user.username
  ).trim();
  const customHtml = String(req.body.customHtml || "");
  const badgeUrl = String(req.body.badgeUrl || "").trim();

  let fetchedBadge = null;
  let fetchError = null;

  if (badgeUrl) {
    try {
      const response = await fetch(badgeUrl);
      fetchedBadge = await response.text();
    } catch (error) {
      fetchError = error.message;
    }
  }

  return res.json({
    attendeeName,
    badgeUrl,
    fetchedBadge,
    fetchError,
    flag:
      fetchedBadge && fetchedBadge.includes(flags.certificateSsrf)
        ? flags.certificateSsrf
        : undefined,
    html: `
      <article class="certificate-preview">
        <h1>Certificat de completion</h1>
        <p>Participant: <strong>${attendeeName}</strong></p>
        <div class="certificate-body">${customHtml}</div>
        <pre>${fetchedBadge ? fetchedBadge.replace(/[<>]/g, "") : "Aucun badge externe charge"}</pre>
      </article>
    `,
  });
});

router.post("/api/trainings/import", requireAuth, importUpload.single("archive"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Archive manquante" });
  }

  const extractionRoot = path.join(
    runtimePaths.importsDir,
    `user-${req.user.id}`,
    `${Date.now()}`
  );
  const extractionRootResolved = path.resolve(extractionRoot);
  fs.mkdirSync(extractionRootResolved, { recursive: true });

  const zip = new AdmZip(req.file.path);
  const entries = zip.getEntries();
  const extractedFiles = [];
  let escaped = false;

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    const targetPath = path.resolve(extractionRootResolved, entry.entryName);
    if (!targetPath.startsWith(extractionRootResolved)) {
      escaped = true;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, entry.getData());
    extractedFiles.push(path.relative(runtimePaths.backendRoot, targetPath));
  }

  return res.json({
    message: "Archive importee",
    extractedFiles,
    escaped,
    flag: escaped ? flags.zipSlip : undefined,
  });
});

module.exports = router;
