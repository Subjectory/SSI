const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const flags = {
  resetPoisoning: "FLAG{01_reset_poisoning_host_header}",
  parameterPollution: "FLAG{02_reset_hpp_mailbox_swap}",
  trainingBola: "FLAG{03_training_request_bola}",
  trainingRace: "FLAG{04_training_confirm_race}",
  certificateSsrf: "FLAG{05_certificate_preview_ssrf}",
  jwtKid: "FLAG{06_jwt_kid_key_confusion}",
  commandInjection: "FLAG{07_admin_diagnostics_cmdi}",
  prototypePollution: "FLAG{08_server_proto_pollution}",
  zipSlip: "FLAG{09_training_import_zip_slip}",
  storedXss: "FLAG{10_stored_xss_rich_comments}",
};

const backendRoot = path.join(__dirname, "..");
const configuredDataRoot = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : null;
const runtimeRoot = configuredDataRoot
  ? path.join(configuredDataRoot, "runtime")
  : path.join(backendRoot, "runtime");
const uploadsDir = path.join(runtimeRoot, "uploads");
const documentsDir = path.join(uploadsDir, "documents");
const importsDir = path.join(uploadsDir, "imports");
const trainingResourcesDir = path.join(uploadsDir, "training-resources");
const keysDir = path.join(runtimeRoot, "keys");
const flagsDir = path.join(runtimeRoot, "flags");
const dbPath = configuredDataRoot
  ? path.join(configuredDataRoot, "data", "corphack.sqlite")
  : path.join(__dirname, "corphack.sqlite");
const finalFlagFile = path.join(flagsDir, "flag07-command-injection.txt");
const defaultSigningKeyFile = path.join(keysDir, "default-signing.key");
const partnerPublicKeyFile = path.join(keysDir, "partner-public.key");

const runtimePaths = {
  backendRoot,
  configuredDataRoot,
  runtimeRoot,
  uploadsDir,
  documentsDir,
  importsDir,
  trainingResourcesDir,
  keysDir,
  flagsDir,
  dbPath,
  finalFlagFile,
  defaultSigningKeyFile,
  partnerPublicKeyFile,
};

function getInternalPreviewUrl() {
  const port = Number(process.env.PORT || 3000);
  return `http://127.0.0.1:${port}/internal/certificates/signing-material`;
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeFileIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function ensureRuntimeFiles() {
  [
    path.dirname(dbPath),
    runtimeRoot,
    uploadsDir,
    documentsDir,
    importsDir,
    trainingResourcesDir,
    keysDir,
    flagsDir,
  ].forEach(ensureDirectory);

  writeFileIfMissing(defaultSigningKeyFile, "corphack-default-signing-key-2026");
  writeFileIfMissing(
    partnerPublicKeyFile,
    [
      "-----BEGIN CORPHACK PARTNER KEY-----",
      "corpHack_partner_public_signing_material_2026",
      "-----END CORPHACK PARTNER KEY-----",
    ].join("\n")
  );
  writeFileIfMissing(
    finalFlagFile,
    `${flags.commandInjection}\nDiagnostics pivot obtained.\n`
  );
  writeFileIfMissing(
    path.join(documentsDir, "employee-handbook.txt"),
    [
      "CorpHack - Handbook Interne",
      "Bienvenue sur le portail intranet.",
      "Les documents d'entreprise sont centralises dans ce hub.",
    ].join("\n")
  );
  writeFileIfMissing(
    path.join(documentsDir, "vpn-onboarding.txt"),
    [
      "Guide VPN",
      "1. Installer le client officiel",
      "2. Utiliser votre compte employee pour vous connecter",
      "3. Contacter IT en cas de blocage",
    ].join("\n")
  );
  writeFileIfMissing(
    path.join(trainingResourcesDir, "incident-runbook.txt"),
    [
      "War Room - Runbook",
      "Escalade, triage, communication et coordination SOC.",
      "Les certificats de completion utilisent le moteur de preview interne.",
    ].join("\n")
  );
  writeFileIfMissing(
    path.join(trainingResourcesDir, "certificate-engine-notes.txt"),
    [
      "Le moteur de preview peut recuperer un badge externe.",
      `Exemple interne: ${getInternalPreviewUrl()}`,
      "Utiliser cette URL uniquement pour les diagnostics internes.",
    ].join("\n")
  );
}

let db = null;

function getDatabaseConnection() {
  ensureDirectory(path.dirname(dbPath));
  if (!db) {
    db = new DatabaseSync(dbPath);
  }
  return db;
}

function closeDatabase() {
  if (!db) {
    return;
  }

  db.close();
  db = null;
}

function exec(sql) {
  getDatabaseConnection().exec(sql);
}

function run(sql, params = {}) {
  return getDatabaseConnection().prepare(sql).run(params);
}

function get(sql, params = {}) {
  return getDatabaseConnection().prepare(sql).get(params);
}

function all(sql, params = {}) {
  return getDatabaseConnection().prepare(sql).all(params);
}

function nowIso() {
  return new Date().toISOString();
}

function resetDatabase() {
  exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      mailbox TEXT NOT NULL,
      bio TEXT NOT NULL,
      reset_token TEXT,
      preferences_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content_html TEXT NOT NULL,
      published_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author_username TEXT NOT NULL,
      body_html TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      owner_user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      visibility TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS trainings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      seats INTEGER NOT NULL,
      restricted_role TEXT,
      approval_required INTEGER NOT NULL DEFAULT 0,
      review_code TEXT NOT NULL,
      badge_url TEXT,
      created_by_user_id INTEGER NOT NULL,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS training_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      training_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      approved_by_manager INTEGER NOT NULL DEFAULT 0,
      access_granted INTEGER NOT NULL DEFAULT 0,
      confirmation_counter INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (training_id) REFERENCES trainings(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS training_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      training_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      visibility TEXT NOT NULL,
      FOREIGN KEY (training_id) REFERENCES trainings(id)
    );

    CREATE TABLE IF NOT EXISTS mailbox_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mailbox TEXT NOT NULL,
      subject TEXT NOT NULL,
      html_body TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function seedDatabase() {
  const existing = get("SELECT COUNT(*) AS count FROM users");
  if (existing.count > 0) {
    return;
  }

  const database = getDatabaseConnection();

  const defaultPrefs = JSON.stringify({
    locale: "fr-FR",
    density: "comfortable",
    homeWidgets: ["agenda", "documents", "annonces"],
  });

  const users = [
    {
      username: "alice",
      email: "alice@corphack.local",
      password: "Welcome2026!",
      displayName: "Alice Martin",
      role: "employee",
      department: "Operations",
      mailbox: "alice",
      bio: "Assistante operations, en charge des plannings et de la documentation.",
    },
    {
      username: "samir",
      email: "samir@corphack.local",
      password: "ChangeMe123!",
      displayName: "Samir Benali",
      role: "employee",
      department: "Support",
      mailbox: "samir",
      bio: "Support IT niveau 1, volontaire formations internes.",
    },
    {
      username: "clara.manager",
      email: "clara.manager@corphack.local",
      password: "Manager2026!",
      displayName: "Clara Dubois",
      role: "manager",
      department: "Security",
      mailbox: "clara",
      bio: "Manager du programme War Room et validation des formations critiques.",
    },
    {
      username: "admin",
      email: "admin@corphack.local",
      password: "Admin2026!",
      displayName: "Admin CorpHack",
      role: "admin",
      department: "Platform",
      mailbox: "admin",
      bio: "Administrateur de la plateforme intranet et du moteur de diagnostics.",
    },
  ];

  const insertUser = database.prepare(`
    INSERT INTO users (
      username, email, password, display_name, role, department, mailbox, bio, preferences_json
    ) VALUES (
      $username, $email, $password, $displayName, $role, $department, $mailbox, $bio, $preferences
    )
  `);

  users.forEach((user) => {
    insertUser.run({
      $username: user.username,
      $email: user.email,
      $password: user.password,
      $displayName: user.displayName,
      $role: user.role,
      $department: user.department,
      $mailbox: user.mailbox,
      $bio: user.bio,
      $preferences: defaultPrefs,
    });
  });

  const posts = [
    {
      title: "Bienvenue sur le portail interne",
      author: "Communication",
      content:
        "<p>Le nouvel intranet CorpHack centralise les actualites, les documents et les formations.</p><p>Pensez a verifier vos acces et vos inscriptions avant la fin du mois.</p>",
    },
    {
      title: "Programme War Room Q2",
      author: "Security Team",
      content:
        "<p>Le programme <strong>Incident Response War Room</strong> ouvre une nouvelle session limitee en places.</p><p>Les managers valident les participants manuellement.</p>",
    },
  ];

  const insertPost = database.prepare(`
    INSERT INTO posts (title, author, content_html, published_at)
    VALUES ($title, $author, $content, $publishedAt)
  `);

  posts.forEach((post) => {
    insertPost.run({
      $title: post.title,
      $author: post.author,
      $content: post.content,
      $publishedAt: nowIso(),
    });
  });

  const insertComment = database.prepare(`
    INSERT INTO comments (post_id, author_username, body_html, created_at)
    VALUES ($postId, $author, $body, $createdAt)
  `);

  insertComment.run({
    $postId: 1,
    $author: "alice",
    $body: "<p>Portail recu, merci. La navigation est fluide.</p>",
    $createdAt: nowIso(),
  });
  insertComment.run({
    $postId: 2,
    $author: "clara.manager",
    $body: "<p>Les demandes War Room seront revues lundi matin.</p>",
    $createdAt: nowIso(),
  });

  const insertDocument = database.prepare(`
    INSERT INTO documents (title, owner_user_id, kind, filename, storage_path, visibility, created_at)
    VALUES ($title, $ownerUserId, $kind, $filename, $storagePath, $visibility, $createdAt)
  `);

  insertDocument.run({
    $title: "Handbook employe",
    $ownerUserId: 1,
    $kind: "guide",
    $filename: "employee-handbook.txt",
    $storagePath: path.join(documentsDir, "employee-handbook.txt"),
    $visibility: "company",
    $createdAt: nowIso(),
  });
  insertDocument.run({
    $title: "Onboarding VPN",
    $ownerUserId: 3,
    $kind: "guide",
    $filename: "vpn-onboarding.txt",
    $storagePath: path.join(documentsDir, "vpn-onboarding.txt"),
    $visibility: "company",
    $createdAt: nowIso(),
  });

  const insertTraining = database.prepare(`
    INSERT INTO trainings (
      slug, title, description, seats, restricted_role, approval_required, review_code, badge_url, created_by_user_id
    ) VALUES (
      $slug, $title, $description, $seats, $restrictedRole, $approvalRequired, $reviewCode, $badgeUrl, $createdByUserId
    )
  `);

  insertTraining.run({
    $slug: "secure-coding-basics",
    $title: "Secure Coding Basics",
    $description:
      "Session ouverte a tous sur les fondamentaux de la revue de code et des secrets applicatifs.",
    $seats: 20,
    $restrictedRole: null,
    $approvalRequired: 0,
    $reviewCode: "OPEN-2026-BASICS",
    $badgeUrl: "https://static.corphack.local/badges/secure-coding.png",
    $createdByUserId: 3,
  });
  insertTraining.run({
    $slug: "incident-war-room",
    $title: "Incident Response War Room",
    $description:
      "Formation restreinte manager/IR avec ressources sensibles et certificat PDF avance.",
    $seats: 1,
    $restrictedRole: "manager",
    $approvalRequired: 1,
    $reviewCode: "WARROOM-APR-2026",
    $badgeUrl: getInternalPreviewUrl(),
    $createdByUserId: 3,
  });

  const insertRegistration = database.prepare(`
    INSERT INTO training_registrations (
      training_id, user_id, status, approved_by_manager, access_granted, confirmation_counter, notes, created_at
    ) VALUES (
      $trainingId, $userId, $status, $approvedByManager, $accessGranted, $confirmationCounter, $notes, $createdAt
    )
  `);

  insertRegistration.run({
    $trainingId: 2,
    $userId: 3,
    $status: "approved",
    $approvedByManager: 1,
    $accessGranted: 1,
    $confirmationCounter: 1,
    $notes: "Session manager seedee pour le CTF.",
    $createdAt: nowIso(),
  });

  const insertTrainingResource = database.prepare(`
    INSERT INTO training_resources (training_id, title, filename, storage_path, visibility)
    VALUES ($trainingId, $title, $filename, $storagePath, $visibility)
  `);

  insertTrainingResource.run({
    $trainingId: 2,
    $title: "Runbook d'intervention",
    $filename: "incident-runbook.txt",
    $storagePath: path.join(trainingResourcesDir, "incident-runbook.txt"),
    $visibility: "gated",
  });
  insertTrainingResource.run({
    $trainingId: 2,
    $title: "Notes moteur certificat",
    $filename: "certificate-engine-notes.txt",
    $storagePath: path.join(trainingResourcesDir, "certificate-engine-notes.txt"),
    $visibility: "gated",
  });
}

function initDatabase() {
  ensureRuntimeFiles();
  resetDatabase();
  seedDatabase();
}

function resetPersistentState() {
  closeDatabase();
  fs.rmSync(dbPath, { force: true });
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
  initDatabase();
}

function createMailboxMessage({ mailbox, subject, htmlBody, metadata }) {
  run(
    `
      INSERT INTO mailbox_messages (mailbox, subject, html_body, metadata_json, created_at)
      VALUES ($mailbox, $subject, $htmlBody, $metadata, $createdAt)
    `,
    {
      $mailbox: mailbox,
      $subject: subject,
      $htmlBody: htmlBody,
      $metadata: JSON.stringify(metadata),
      $createdAt: nowIso(),
    }
  );
}

function issueResetToken() {
  return randomUUID();
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function getUserById(id) {
  return get(
    `
      SELECT
        id,
        username,
        email,
        password,
        display_name AS displayName,
        role,
        department,
        mailbox,
        bio,
        reset_token AS resetToken,
        preferences_json AS preferencesJson
      FROM users
      WHERE id = $id
    `,
    { $id: id }
  );
}

function getUserByUsername(username) {
  return get(
    `
      SELECT
        id,
        username,
        email,
        password,
        display_name AS displayName,
        role,
        department,
        mailbox,
        bio,
        reset_token AS resetToken,
        preferences_json AS preferencesJson
      FROM users
      WHERE username = $username
    `,
    { $username: username }
  );
}

function getUserByEmail(email) {
  return get(
    `
      SELECT
        id,
        username,
        email,
        password,
        display_name AS displayName,
        role,
        department,
        mailbox,
        bio,
        reset_token AS resetToken,
        preferences_json AS preferencesJson
      FROM users
      WHERE email = $email
    `,
    { $email: email }
  );
}

module.exports = {
  run,
  get,
  all,
  exec,
  initDatabase,
  closeDatabase,
  resetPersistentState,
  createMailboxMessage,
  issueResetToken,
  parseJson,
  flags,
  runtimePaths,
  getInternalPreviewUrl,
  getUserById,
  getUserByUsername,
  getUserByEmail,
};
