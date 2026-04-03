const express = require("express");
const cors = require("cors");
const { initDatabase } = require("./data/db");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const blogRoutes = require("./routes/blog");
const documentsRoutes = require("./routes/documents");
const trainingsRoutes = require("./routes/trainings");
const preferencesRoutes = require("./routes/preferences");
const adminRoutes = require("./routes/admin");
const internalRoutes = require("./routes/internal");

initDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    app: "CorpHack Intranet CTF",
    status: "running",
    frontendHint: "Lance le frontend Vite sur http://localhost:5173",
  });
});

app.use(authRoutes);
app.use(profileRoutes);
app.use(blogRoutes);
app.use(documentsRoutes);
app.use(trainingsRoutes);
app.use(preferencesRoutes);
app.use(adminRoutes);
app.use(internalRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error);
  return res.status(500).json({
    error: error.message || "Erreur interne",
  });
});

app.listen(PORT, () => {
  console.log(`CorpHack backend running on http://localhost:${PORT}`);
});
