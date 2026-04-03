const express = require("express");
const { posts } = require("../data/store");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function sanitizeText(value) {
  return String(value || "").replace(/[<>]/g, "").trim();
}

router.get("/blog", requireAuth, (req, res) => {
  res.json(posts);
});

router.post("/blog/comment", requireAuth, (req, res) => {
  const postId = Number(req.body.postId);
  const text = sanitizeText(req.body.text);

  if (!postId || !text) {
    return res.status(400).json({ error: "postId and text are required" });
  }

  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const comment = {
    id: post.comments.length + 1,
    author: req.user.username,
    text,
  };

  post.comments.push(comment);

  return res.status(201).json({
    message: "Comment added",
    comment,
  });
});

module.exports = router;