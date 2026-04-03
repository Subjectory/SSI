const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { all, run, runtimePaths } = require("../data/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, runtimePaths.documentsDir),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${String(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get("/api/documents", requireAuth, (req, res) => {
  const documents = all(
    `
      SELECT
        d.id,
        d.title,
        d.kind,
        d.filename,
        d.visibility,
        d.created_at AS createdAt,
        u.display_name AS ownerDisplayName
      FROM documents d
      JOIN users u ON u.id = d.owner_user_id
      ORDER BY d.id DESC
    `
  ).map((document) => ({
    ...document,
    downloadUrl: `/uploads/documents/${path.basename(document.filename)}`,
  }));

  return res.json(documents);
});

router.post("/api/documents/upload", requireAuth, upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun document fourni" });
  }

  run(
    `
      INSERT INTO documents (title, owner_user_id, kind, filename, storage_path, visibility, created_at)
      VALUES ($title, $ownerUserId, $kind, $filename, $storagePath, $visibility, $createdAt)
    `,
    {
      $title: req.body.title || req.file.originalname,
      $ownerUserId: req.user.id,
      $kind: "upload",
      $filename: req.file.filename,
      $storagePath: req.file.path,
      $visibility: "company",
      $createdAt: new Date().toISOString(),
    }
  );

  return res.status(201).json({
    message: "Document ajoute",
    filename: req.file.filename,
    path: `/uploads/documents/${req.file.filename}`,
  });
});

router.get("/uploads/documents/:filename", requireAuth, (req, res) => {
  const targetFile = path.join(runtimePaths.documentsDir, req.params.filename);
  if (!fs.existsSync(targetFile)) {
    return res.status(404).json({ error: "Fichier introuvable" });
  }
  return res.sendFile(targetFile);
});

module.exports = router;
