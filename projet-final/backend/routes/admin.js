const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { users, posts } = require("../data/store");

const router = express.Router();

router.get("/admin", requireAuth, requireAdmin, (req, res) => {
  res.json({
    message: "Welcome to admin panel",
    stats: {
      users: users.length,
      posts: posts.length,
    },
  });
});

module.exports = router;