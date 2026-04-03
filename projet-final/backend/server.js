const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const blogRoutes = require("./routes/blog");
const uploadRoutes = require("./routes/upload");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("CorpHack backend running");
});

app.use(authRoutes);
app.use(profileRoutes);
app.use(blogRoutes);
app.use(uploadRoutes);
app.use(adminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});