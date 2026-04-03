const express = require("express");

const { all, get, run, flags } = require("../data/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function normalizeHtml(value) {
  return String(value || "").trim();
}

router.get("/api/blog", requireAuth, (req, res) => {
  const posts = all(
    `
      SELECT id, title, author, content_html AS contentHtml, published_at AS publishedAt
      FROM posts
      ORDER BY id DESC
    `
  ).map((post) => ({
    ...post,
    comments: all(
      `
        SELECT id, author_username AS authorUsername, body_html AS bodyHtml, created_at AS createdAt
        FROM comments
        WHERE post_id = $postId
        ORDER BY id ASC
      `,
      { $postId: post.id }
    ),
  }));

  return res.json(posts);
});

router.post("/api/blog/comments", requireAuth, (req, res) => {
  const postId = Number(req.body.postId);
  const bodyHtml = normalizeHtml(req.body.bodyHtml);

  if (!postId || !bodyHtml) {
    return res.status(400).json({ error: "postId et bodyHtml requis" });
  }

  const post = get("SELECT id FROM posts WHERE id = $id", { $id: postId });
  if (!post) {
    return res.status(404).json({ error: "Article introuvable" });
  }

  run(
    `
      INSERT INTO comments (post_id, author_username, body_html, created_at)
      VALUES ($postId, $authorUsername, $bodyHtml, $createdAt)
    `,
    {
      $postId: postId,
      $authorUsername: req.user.username,
      $bodyHtml: bodyHtml,
      $createdAt: new Date().toISOString(),
    }
  );

  return res.status(201).json({
    message: "Commentaire publie",
    hint: "Les commentaires riches sont rendus tels quels dans le frontend.",
  });
});

router.get("/api/blog/xss-flag", (req, res) => {
  res.type("html").send(`
    <section style="font-family:Arial,sans-serif;padding:16px">
      <h1>CorpHack Rich Comment Preview</h1>
      <p>${flags.storedXss}</p>
      <p>Le commentaire a pu injecter du HTML actif dans le flux d'annonces.</p>
    </section>
  `);
});

module.exports = router;
