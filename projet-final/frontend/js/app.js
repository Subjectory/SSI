const API_CONFIG_KEY = "corphack_api_url";

function buildApiCandidates() {
  const queryApi = new URLSearchParams(window.location.search).get("api");
  const savedApi = localStorage.getItem(API_CONFIG_KEY);
  const candidates = [queryApi, savedApi];

  if (window.location.protocol === "file:") {
    candidates.push("http://localhost:3000", "http://127.0.0.1:3000");
  } else if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    candidates.push("http://localhost:3000", "http://127.0.0.1:3000");
  } else {
    candidates.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  return [...new Set(candidates.filter(Boolean))];
}

let apiCandidates = buildApiCandidates();
let activeApiUrl = apiCandidates[0] || "http://localhost:3000";
let apiCheckPromise = null;

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderJson(value) {
  return `<pre class="json-box">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function setStatus(elementId, message, type = "info") {
  const node = document.getElementById(elementId);
  if (!node) return;
  node.className = `status-box ${type}`;
  node.textContent = message;
}

function setOutput(elementId, html) {
  const node = document.getElementById(elementId);
  if (!node) return;
  node.innerHTML = html;
}

function renderApiStatus(message, type = "info") {
  const nodes = document.querySelectorAll("[data-api-status]");
  nodes.forEach((node) => {
    node.className = `status-box ${type}`;
    node.textContent = message;
  });
}

function buildNetworkErrorMessage(apiUrl) {
  if (window.location.protocol === "https:" && String(apiUrl).startsWith("http://")) {
    return `Le navigateur bloque probablement un appel HTTP depuis une page HTTPS. Ouvre le frontend en http://localhost:5173 ou expose aussi le backend en HTTPS. API cible: ${apiUrl}`;
  }

  return `Backend introuvable sur ${apiUrl}. Lance \`npm start\` dans /backend puis recharge la page.`;
}

async function probeApi(url) {
  const response = await fetch(`${url}/`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Probe failed on ${url}`);
  }

  const data = await response.json();
  if (data.status !== "running") {
    throw new Error(`Unexpected health payload on ${url}`);
  }

  return true;
}

async function ensureApiBase() {
  if (apiCheckPromise) {
    return apiCheckPromise;
  }

  apiCheckPromise = (async () => {
    let lastError = null;

    for (const candidate of apiCandidates) {
      try {
        await probeApi(candidate);
        activeApiUrl = candidate;
        localStorage.setItem(API_CONFIG_KEY, candidate);
        renderApiStatus(`API connectee: ${candidate}`, "success");
        return candidate;
      } catch (error) {
        lastError = error;
      }
    }

    renderApiStatus(buildNetworkErrorMessage(activeApiUrl), "error");
    throw lastError || new Error(buildNetworkErrorMessage(activeApiUrl));
  })();

  return apiCheckPromise;
}

async function apiFetch(endpoint, options = {}) {
  await ensureApiBase();
  const headers = new Headers(options.headers || {});
  const shouldAttachAuth = options.auth !== false;

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (shouldAttachAuth && getToken()) {
    headers.set("Authorization", `Bearer ${getToken()}`);
  }

  let response;
  try {
    response = await fetch(`${activeApiUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage(activeApiUrl));
    }
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "string" ? data : data.error || data.message || "Erreur API";
    throw new Error(message);
  }

  return data;
}

async function refreshCurrentUser() {
  if (!getToken()) {
    return null;
  }

  try {
    const data = await apiFetch("/api/auth/me");
    setSession(getToken(), data.user);
    return data.user;
  } catch (error) {
    clearSession();
    return null;
  }
}

async function requireAuth() {
  const user = await refreshCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    throw new Error("Authentification requise");
  }
  return user;
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

window.logout = logout;

async function handleLogin(event) {
  event.preventDefault();
  setStatus("loginStatus", "");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      auth: false,
    });

    setSession(data.token, data.user);
    window.location.href = "dashboard.html";
  } catch (error) {
    setStatus("loginStatus", error.message, "error");
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  setStatus("forgotStatus", "");

  const email = document.getElementById("forgotEmail").value.trim();

  try {
    await ensureApiBase();
    const body = new URLSearchParams();
    body.append("email", email);

    const data = await fetch(`${activeApiUrl}/api/auth/forgot-password`, {
      method: "POST",
      body,
    }).then(async (response) => {
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Erreur reset");
      }
      return json;
    });

    setStatus(
      "forgotStatus",
      `${data.message} Mailbox: ${data.mailbox}.`,
      "success"
    );
    if (data.mailbox) {
      document.getElementById("mailboxName").value = data.mailbox;
    }
  } catch (error) {
    setStatus("forgotStatus", error.message, "error");
  }
}

async function loadMailbox(mailbox) {
  const mailboxName = mailbox || document.getElementById("mailboxName").value.trim();
  if (!mailboxName) {
    setStatus("mailboxStatus", "Mailbox requise", "error");
    return;
  }

  try {
    const data = await apiFetch(
      `/api/mail-preview?mailbox=${encodeURIComponent(mailboxName)}`,
      { auth: false }
    );

    const messagesHtml = data.messages.length
      ? data.messages
          .map(
            (message) => `
              <article class="mail-card">
                <div class="mail-meta">
                  <strong>${escapeHtml(message.subject)}</strong>
                  <span>${escapeHtml(message.createdAt)}</span>
                </div>
                <div class="mail-body">${message.htmlBody}</div>
                ${renderJson(message.metadata)}
              </article>
            `
          )
          .join("")
      : "<p class='muted'>Aucun message dans cette mailbox.</p>";

    setOutput(
      "mailboxResult",
      `
        <div class="inline-row">
          <span class="pill">Mailbox: ${escapeHtml(data.mailbox)}</span>
          <span class="pill">Messages: ${data.count}</span>
        </div>
        ${
          data.flags.length
            ? `<div class="flag-strip">${data.flags
                .map((flag) => `<code>${escapeHtml(flag)}</code>`)
                .join("")}</div>`
            : ""
        }
        <div class="stack">${messagesHtml}</div>
      `
    );
    setStatus("mailboxStatus", "Mailbox chargee", "success");
  } catch (error) {
    setStatus("mailboxStatus", error.message, "error");
  }
}

async function handleResetPassword(event) {
  event.preventDefault();
  setStatus("resetStatus", "");

  const token = document.getElementById("resetToken").value.trim();
  const password = document.getElementById("resetPassword").value.trim();

  try {
    const data = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
      auth: false,
    });

    setSession(data.token, data.user);
    window.location.href = "dashboard.html";
  } catch (error) {
    setStatus("resetStatus", error.message, "error");
  }
}

async function initDashboard() {
  const user = await requireAuth();
  setOutput(
    "dashboardUser",
    `
      <div class="info-grid">
        <p><strong>Nom</strong><span>${escapeHtml(user.displayName)}</span></p>
        <p><strong>Username</strong><span>${escapeHtml(user.username)}</span></p>
        <p><strong>Role</strong><span>${escapeHtml(user.role)}</span></p>
        <p><strong>Departement</strong><span>${escapeHtml(user.department)}</span></p>
        <p><strong>Email</strong><span>${escapeHtml(user.email)}</span></p>
        <p><strong>Mailbox</strong><span>${escapeHtml(user.mailbox)}</span></p>
      </div>
    `
  );

  const prefs = await apiFetch("/api/preferences");
  document.getElementById("preferencesJson").value = JSON.stringify(
    prefs.preferences,
    null,
    2
  );
  setOutput(
    "preferencesPreview",
    `${renderJson(prefs.preferences)}${
      prefs.flag ? `<div class="flag-strip"><code>${escapeHtml(prefs.flag)}</code></div>` : ""
    }`
  );

  const prefsForm = document.getElementById("preferencesForm");
  prefsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("preferencesStatus", "");

    try {
      const payload = JSON.parse(document.getElementById("preferencesJson").value);
      const data = await apiFetch("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setOutput(
        "preferencesPreview",
        `${renderJson(data.preferences)}${
          data.flag ? `<div class="flag-strip"><code>${escapeHtml(data.flag)}</code></div>` : ""
        }`
      );
      setStatus("preferencesStatus", "Preferences enregistrees", "success");
    } catch (error) {
      setStatus("preferencesStatus", error.message, "error");
    }
  });
}

async function initProfilePage() {
  const user = await requireAuth();
  const profileIdInput = document.getElementById("profileId");
  profileIdInput.value = new URLSearchParams(window.location.search).get("id") || user.id;

  const loadProfile = async () => {
    setStatus("profileStatus", "");
    try {
      const data = await apiFetch(`/api/profile/${profileIdInput.value.trim()}`);
      setOutput(
        "profileResult",
        `
          <div class="info-grid">
            <p><strong>Nom</strong><span>${escapeHtml(data.displayName)}</span></p>
            <p><strong>Username</strong><span>${escapeHtml(data.username)}</span></p>
            <p><strong>Email</strong><span>${escapeHtml(data.email)}</span></p>
            <p><strong>Role</strong><span>${escapeHtml(data.role)}</span></p>
            <p><strong>Departement</strong><span>${escapeHtml(data.department)}</span></p>
            <p><strong>Mailbox</strong><span>${escapeHtml(data.mailbox)}</span></p>
          </div>
          <p class="muted">${escapeHtml(data.bio)}</p>
        `
      );
    } catch (error) {
      setStatus("profileStatus", error.message, "error");
    }
  };

  document.getElementById("profileLookupForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loadProfile();
  });

  loadProfile();
}

async function renderBlogPosts() {
  const posts = await apiFetch("/api/blog");
  const html = posts
    .map(
      (post) => `
        <article class="post">
          <div class="post-meta">
            <strong>${escapeHtml(post.title)}</strong>
            <span>${escapeHtml(post.author)}</span>
          </div>
          <div class="rich-content">${post.contentHtml}</div>
          <div class="comment-list">
            ${post.comments
              .map(
                (comment) => `
                  <div class="comment">
                    <div class="comment-meta">
                      <strong>${escapeHtml(comment.authorUsername)}</strong>
                      <span>${escapeHtml(comment.createdAt)}</span>
                    </div>
                    <div class="rich-content">${comment.bodyHtml}</div>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");

  setOutput("blogResult", html || "<p class='muted'>Aucun article.</p>");
}

async function initBlogPage() {
  await requireAuth();
  await renderBlogPosts();

  document.getElementById("commentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("commentStatus", "");

    const postId = Number(document.getElementById("postId").value);
    const bodyHtml = document.getElementById("commentBody").value;

    try {
      await apiFetch("/api/blog/comments", {
        method: "POST",
        body: JSON.stringify({ postId, bodyHtml }),
      });
      document.getElementById("commentBody").value = "";
      setStatus("commentStatus", "Commentaire ajoute", "success");
      await renderBlogPosts();
    } catch (error) {
      setStatus("commentStatus", error.message, "error");
    }
  });
}

async function loadDocuments() {
  const documents = await apiFetch("/api/documents");
  const html = documents
    .map(
      (document) => `
        <article class="document-card">
          <div>
            <strong>${escapeHtml(document.title)}</strong>
            <p class="muted">${escapeHtml(document.ownerDisplayName)} · ${escapeHtml(
              document.kind
            )}</p>
          </div>
          <button class="secondary-button" data-download="${escapeHtml(
            document.downloadUrl
          )}">Lire</button>
        </article>
      `
    )
    .join("");

  setOutput("documentsList", html || "<p class='muted'>Aucun document.</p>");

  document.querySelectorAll("[data-download]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const content = await apiFetch(button.dataset.download, {
          headers: {},
        });
        setOutput(
          "documentPreview",
          typeof content === "string" ? `<pre class="json-box">${escapeHtml(content)}</pre>` : renderJson(content)
        );
      } catch (error) {
        setStatus("documentsStatus", error.message, "error");
      }
    });
  });
}

async function initDocumentsPage() {
  await requireAuth();
  await loadDocuments();

  document.getElementById("uploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("documentsStatus", "");

    const formData = new FormData();
    const fileInput = document.getElementById("documentFile");
    if (!fileInput.files[0]) {
      setStatus("documentsStatus", "Choisis un document", "error");
      return;
    }

    formData.append("title", document.getElementById("documentTitle").value.trim());
    formData.append("document", fileInput.files[0]);

    try {
      const data = await apiFetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        headers: {},
      });
      setStatus("documentsStatus", `Upload reussi: ${data.filename}`, "success");
      fileInput.value = "";
      document.getElementById("documentTitle").value = "";
      await loadDocuments();
    } catch (error) {
      setStatus("documentsStatus", error.message, "error");
    }
  });

  document.getElementById("importForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("importStatus", "");

    const archiveInput = document.getElementById("archiveFile");
    if (!archiveInput.files[0]) {
      setStatus("importStatus", "Choisis une archive zip", "error");
      return;
    }

    const formData = new FormData();
    formData.append("archive", archiveInput.files[0]);

    try {
      const data = await apiFetch("/api/trainings/import", {
        method: "POST",
        body: formData,
        headers: {},
      });
      setOutput(
        "importResult",
        `${renderJson(data)}${
          data.flag ? `<div class="flag-strip"><code>${escapeHtml(data.flag)}</code></div>` : ""
        }`
      );
      setStatus("importStatus", "Import termine", "success");
    } catch (error) {
      setStatus("importStatus", error.message, "error");
    }
  });
}

async function loadTrainings() {
  const trainings = await apiFetch("/api/trainings");
  const html = trainings
    .map(
      (training) => `
        <article class="training-card">
          <div class="post-meta">
            <strong>${escapeHtml(training.title)}</strong>
            <span>${training.approvalRequired ? "Validation manager" : "Ouvert"}</span>
          </div>
          <p>${escapeHtml(training.description)}</p>
          <div class="inline-row">
            <span class="pill">ID ${training.id}</span>
            <span class="pill">Places ${training.seats}</span>
            <span class="pill">Role cible ${escapeHtml(training.restrictedRole || "all")}</span>
          </div>
          ${
            training.registrationId
              ? `<p class="muted">Demande #${training.registrationId} · statut ${escapeHtml(
                  training.status || "pending"
                )} · confirmations ${training.confirmationCounter || 0}</p>`
              : `<button class="secondary-button" data-request-training="${training.id}">Demander l'acces</button>`
          }
          ${
            training.reviewCode
              ? `<p class="muted">Review code: <code>${escapeHtml(training.reviewCode)}</code></p>`
              : ""
          }
          ${
            training.resources.length
              ? `<div class="resource-list">${training.resources
                  .map(
                    (resource) => `
                      <button class="secondary-button" data-resource-training="${training.id}" data-resource-id="${resource.id}">
                        ${escapeHtml(resource.title)}
                      </button>
                    `
                  )
                  .join("")}</div>`
              : ""
          }
        </article>
      `
    )
    .join("");

  setOutput("trainingsList", html || "<p class='muted'>Aucune formation.</p>");

  document.querySelectorAll("[data-request-training]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const data = await apiFetch(`/api/trainings/${button.dataset.requestTraining}/request-access`, {
          method: "POST",
        });
        setOutput("trainingActionsResult", renderJson(data));
        await loadTrainings();
      } catch (error) {
        setStatus("trainingStatus", error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-resource-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const data = await apiFetch(
          `/api/trainings/${button.dataset.resourceTraining}/resources/${button.dataset.resourceId}`
        );
        setOutput(
          "trainingResourceResult",
          `
            <h3>${escapeHtml(data.resource.title)}</h3>
            <pre class="json-box">${escapeHtml(data.resource.content)}</pre>
          `
        );
      } catch (error) {
        setStatus("trainingStatus", error.message, "error");
      }
    });
  });
}

async function initTrainingsPage() {
  await requireAuth();
  await loadTrainings();

  document.getElementById("requestLookupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("trainingStatus", "");

    try {
      const requestId = document.getElementById("requestId").value.trim();
      const data = await apiFetch(`/api/trainings/requests/${requestId}`);
      setOutput(
        "trainingActionsResult",
        `${renderJson(data)}${
          data.flag ? `<div class="flag-strip"><code>${escapeHtml(data.flag)}</code></div>` : ""
        }`
      );
    } catch (error) {
      setStatus("trainingStatus", error.message, "error");
    }
  });

  document.getElementById("confirmForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("trainingStatus", "");

    try {
      const trainingId = document.getElementById("confirmTrainingId").value.trim();
      const reviewCode = document.getElementById("reviewCode").value.trim();
      const data = await apiFetch(`/api/trainings/${trainingId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ reviewCode }),
      });
      setOutput(
        "trainingActionsResult",
        `${renderJson(data)}${
          data.flag ? `<div class="flag-strip"><code>${escapeHtml(data.flag)}</code></div>` : ""
        }`
      );
      await loadTrainings();
    } catch (error) {
      setStatus("trainingStatus", error.message, "error");
    }
  });

  document.getElementById("certificateForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("certificateStatus", "");

    try {
      const trainingId = document.getElementById("certificateTrainingId").value.trim();
      const badgeUrl = document.getElementById("badgeUrl").value.trim();
      const customHtml = document.getElementById("customHtml").value;
      const attendeeName = document.getElementById("attendeeName").value.trim();
      const data = await apiFetch(`/api/trainings/${trainingId}/certificate-preview`, {
        method: "POST",
        body: JSON.stringify({ badgeUrl, customHtml, attendeeName }),
      });
      setOutput(
        "certificateResult",
        `
          ${data.flag ? `<div class="flag-strip"><code>${escapeHtml(data.flag)}</code></div>` : ""}
          ${renderJson({
            attendeeName: data.attendeeName,
            badgeUrl: data.badgeUrl,
            fetchError: data.fetchError,
            fetchedBadge: data.fetchedBadge,
          })}
          <div class="rich-preview">${data.html}</div>
        `
      );
      setStatus("certificateStatus", "Preview generee", "success");
    } catch (error) {
      setStatus("certificateStatus", error.message, "error");
    }
  });
}

async function initAdminPage() {
  await requireAuth();

  try {
    const data = await apiFetch("/api/admin");
    setOutput(
      "adminResult",
      `${renderJson(data)}${
        data.flag ? `<div class="flag-strip"><code>${escapeHtml(data.flag)}</code></div>` : ""
      }`
    );
  } catch (error) {
    setStatus("adminStatus", error.message, "error");
  }

  document.getElementById("diagnosticsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("adminStatus", "");

    try {
      const target = document.getElementById("diagnosticTarget").value.trim();
      const data = await apiFetch("/api/admin/diagnostics/ping", {
        method: "POST",
        body: JSON.stringify({ target }),
      });
      setOutput(
        "diagnosticsResult",
        `${renderJson(data)}${
          data.flag ? `<div class="flag-strip"><code>${escapeHtml(data.flag)}</code></div>` : ""
        }`
      );
      setStatus("adminStatus", "Diagnostic execute", "success");
    } catch (error) {
      setStatus("adminStatus", error.message, "error");
    }
  });
}

function initLoginPage() {
  const loginForm = document.getElementById("loginForm");
  const forgotForm = document.getElementById("forgotForm");
  const mailboxForm = document.getElementById("mailboxForm");

  loginForm?.addEventListener("submit", handleLogin);
  forgotForm?.addEventListener("submit", handleForgotPassword);
  mailboxForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    loadMailbox();
  });
}

function initResetPage() {
  const token = new URLSearchParams(window.location.search).get("token");
  if (token) {
    document.getElementById("resetToken").value = token;
  }

  document
    .getElementById("resetForm")
    .addEventListener("submit", handleResetPassword);
}

function initMailboxPage() {
  const mailbox = new URLSearchParams(window.location.search).get("mailbox");
  if (mailbox) {
    document.getElementById("mailboxName").value = mailbox;
    loadMailbox(mailbox);
  }

  document.getElementById("mailboxForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loadMailbox();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  renderApiStatus(`Verification de l'API en cours...`, "info");
  ensureApiBase().catch(() => {});

  if (page !== "login" && page !== "reset" && page !== "mailbox" && getToken()) {
    const currentUser = await refreshCurrentUser();
    const navUser = document.getElementById("navUser");
    if (currentUser && navUser) {
      navUser.textContent = `${currentUser.displayName} · ${currentUser.role}`;
    }
  }

  switch (page) {
    case "login":
      initLoginPage();
      break;
    case "reset":
      initResetPage();
      break;
    case "mailbox":
      initMailboxPage();
      break;
    case "dashboard":
      await initDashboard();
      break;
    case "profile":
      await initProfilePage();
      break;
    case "blog":
      await initBlogPage();
      break;
    case "documents":
      await initDocumentsPage();
      break;
    case "trainings":
      await initTrainingsPage();
      break;
    case "admin":
      await initAdminPage();
      break;
    default:
      break;
  }
});
