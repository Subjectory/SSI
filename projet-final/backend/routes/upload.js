const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  },
});

const allowedMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
];

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  },
});

router.post("/upload", requireAuth, upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  return res.status(201).json({
    message: "File uploaded successfully",
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`,
  });
});

module.exports = router;