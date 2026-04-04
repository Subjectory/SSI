const API_CONFIG_KEY = "corphack_api_url";

function buildApiCandidates() {
  const searchParams = new URLSearchParams(window.location.search);
  const queryApi = searchParams.get("api");
  const savedApi = localStorage.getItem(API_CONFIG_KEY);
  const candidates = [queryApi, savedApi];

  if (
    window.location.protocol === "file:" ||
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
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
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

function formatDate(value) {
  if (!value) {
    return "Non renseigne";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatRole(role) {
  const labels = {
    employee: "Collaborateur",
    manager: "Manager",
    admin: "Administrateur",
  };

  return labels[role] || role || "Utilisateur";
}

function firstName(value) {
  return String(value || "").trim().split(/\s+/)[0] || "Bonjour";
}

function renderJson(value) {
  return `<pre class="json-box">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function renderEmptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function renderFlagStrip(flags) {
  const items = Array.isArray(flags) ? flags.filter(Boolean) : [flags].filter(Boolean);
  if (!items.length) {
    return "";
  }

  return `
    <div class="flag-strip">
      ${items.map((flag) => `<code>${escapeHtml(flag)}</code>`).join("")}
    </div>
  `;
}

function renderMetricCard(value, label, hint = "") {
  return `
    <article class="metric-card">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
      ${hint ? `<p class="helper-text">${escapeHtml(hint)}</p>` : ""}
    </article>
  `;
}

function renderKeyValueGrid(items) {
  return `
    <div class="key-value-grid">
      ${items
        .map(
          (item) => `
            <article class="key-value-item">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderApiStatus(message = "", type = "info") {
  const nodes = document.querySelectorAll("[data-api-status]");
  nodes.forEach((node) => {
    if (!message) {
      node.hidden = true;
      node.textContent = "";
      node.className = "status-box error";
      return;
    }

    node.hidden = false;
    node.className = `status-box ${type}`;
    node.textContent = message;
  });
}

function setStatus(elementId, message = "", type = "info") {
  const node = document.getElementById(elementId);
  if (!node) {
    return;
  }

  if (!message) {
    node.hidden = true;
    node.textContent = "";
    node.className = "status-box info";
    return;
  }

  node.hidden = false;
  node.className = `status-box ${type}`;
  node.textContent = message;
}

function setOutput(elementId, html = "") {
  const node = document.getElementById(elementId);
  if (!node) {
    return;
  }

  node.innerHTML = html;
}

function buildNetworkErrorMessage(apiUrl) {
  if (window.location.protocol === "https:" && String(apiUrl).startsWith("http://")) {
    return `Le navigateur bloque probablement un appel HTTP depuis une page HTTPS. Ouvrez le frontend sur http://localhost:5173 ou exposez aussi le backend en HTTPS. API cible: ${apiUrl}`;
  }

  return `Backend introuvable sur ${apiUrl}. Lancez npm start dans /backend puis rechargez la page.`;
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
        renderApiStatus();
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

function applyWorkspaceChrome(user, page) {
  document.querySelectorAll("[data-user-name]").forEach((node) => {
    node.textContent = user.displayName || user.username;
  });

  document.querySelectorAll("[data-user-role]").forEach((node) => {
    node.textContent = `${formatRole(user.role)} · ${user.department || "Equipe"}`;
  });

  document.querySelectorAll("[data-user-email]").forEach((node) => {
    node.textContent = user.email || "user@corphack.local";
  });

  document.querySelectorAll("[data-nav-target]").forEach((link) => {
    link.classList.toggle("active", link.dataset.navTarget === page);
  });

  document.querySelectorAll("[data-admin-only]").forEach((node) => {
    node.hidden = user.role !== "admin";
  });
}

function sanitizeWidgetList(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function handleLogin(event) {
  event.preventDefault();
  setStatus("loginStatus");

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
  setStatus("forgotStatus");
  setOutput("forgotResult");

  const email = document.getElementById("forgotEmail").value.trim();

  try {
    await ensureApiBase();
    const body = new URLSearchParams();
    body.append("email", email);

    const response = await fetch(`${activeApiUrl}/api/auth/forgot-password`, {
      method: "POST",
      body,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Erreur de recuperation");
    }

    setStatus("forgotStatus", data.message, "success");

    if (data.mailbox) {
      setOutput(
        "forgotResult",
        `
          <p class="helper-text">
            Le message de recuperation a ete prepare.
            <a class="link-inline" href="mailbox.html?mailbox=${encodeURIComponent(
              data.mailbox
            )}">Ouvrir le centre de messages</a>
          </p>
        `
      );
    }
  } catch (error) {
    setStatus("forgotStatus", error.message, "error");
  }
}

async function handleResetPassword(event) {
  event.preventDefault();
  setStatus("resetStatus");

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

async function loadMailbox(mailboxValue) {
  const mailbox = mailboxValue || document.getElementById("mailboxName")?.value.trim();
  if (!mailbox) {
    setStatus("mailboxStatus", "Precisez une boite de reception.", "error");
    return;
  }

  try {
    const data = await apiFetch(
      `/api/mail-preview?mailbox=${encodeURIComponent(mailbox)}`,
      { auth: false }
    );

    const messagesHtml = data.messages.length
      ? data.messages
          .map(
            (message) => `
              <article class="mail-card">
                <div class="mail-header">
                  <div>
                    <strong>${escapeHtml(message.subject)}</strong>
                    <span>${escapeHtml(formatDate(message.createdAt))}</span>
                  </div>
                  <span class="meta-tag">${escapeHtml(data.mailbox)}</span>
                </div>
                <div class="mail-body">${message.htmlBody}</div>
                <div class="meta-row">
                  <span class="meta-tag">Message #${escapeHtml(message.id)}</span>
                </div>
                ${renderJson(message.metadata)}
              </article>
            `
          )
          .join("")
      : renderEmptyState("Aucun message disponible pour cette boite.");

    setOutput(
      "mailboxResult",
      `
        <div class="meta-row">
          <span class="meta-tag">Boite ${escapeHtml(data.mailbox)}</span>
          <span class="meta-tag">${escapeHtml(data.count)} message(s)</span>
        </div>
        ${renderFlagStrip(data.flags)}
        <div class="mail-list">${messagesHtml}</div>
      `
    );
    setStatus("mailboxStatus", "Messages charges.", "success");
  } catch (error) {
    setStatus("mailboxStatus", error.message, "error");
  }
}

function renderDashboardTrainings(trainings) {
  if (!trainings.length) {
    return renderEmptyState("Aucune formation a afficher pour le moment.");
  }

  return trainings
    .slice(0, 3)
    .map((training) => {
      const status = training.registrationId
        ? training.accessGranted
          ? "Acces actif"
          : training.status || "pending"
        : "Aucune demande";

      return `
        <article class="list-card">
          <div class="list-card-header">
            <div>
              <h3>${escapeHtml(training.title)}</h3>
              <p>${escapeHtml(training.description)}</p>
            </div>
            <span class="section-kicker">${training.approvalRequired ? "Validation" : "Ouvert"}</span>
          </div>
          <div class="meta-row">
            <span class="meta-tag">${escapeHtml(status)}</span>
            <span class="meta-tag">${escapeHtml(training.seats)} place(s)</span>
            <span class="meta-tag">${escapeHtml(training.restrictedRole || "Tous profils")}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDashboardDocuments(documents) {
  if (!documents.length) {
    return renderEmptyState("La bibliotheque est vide.");
  }

  return documents
    .slice(0, 4)
    .map(
      (document) => `
        <article class="list-card">
          <div class="list-card-header">
            <div>
              <h3>${escapeHtml(document.title)}</h3>
              <p>${escapeHtml(document.ownerDisplayName)} · ${escapeHtml(document.kind)}</p>
            </div>
            <span class="meta-tag">${escapeHtml(formatDate(document.createdAt))}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDashboardPosts(posts) {
  if (!posts.length) {
    return renderEmptyState("Aucune annonce recente.");
  }

  return posts
    .slice(0, 3)
    .map(
      (post) => `
        <article class="list-card">
          <div class="list-card-header">
            <div>
              <h3>${escapeHtml(post.title)}</h3>
              <p>${escapeHtml(post.author)}</p>
            </div>
            <span class="meta-tag">${escapeHtml(post.comments.length)} commentaire(s)</span>
          </div>
          <div class="rich-content">${post.contentHtml}</div>
        </article>
      `
    )
    .join("");
}

async function initDashboardPage(user) {
  const [trainings, documents, posts] = await Promise.all([
    apiFetch("/api/trainings"),
    apiFetch("/api/documents"),
    apiFetch("/api/blog"),
  ]);

  const activeAccess = trainings.filter((training) => training.accessGranted || training.resources.length).length;
  const pending = trainings.filter(
    (training) => training.registrationId && !training.accessGranted
  ).length;

  document.getElementById("dashboardGreeting").textContent = `Bonjour ${firstName(
    user.displayName
  )}, bienvenue dans Horizon`;
  document.getElementById("dashboardSummaryText").textContent =
    pending > 0
      ? `Vous avez ${pending} demande(s) de formation en cours de traitement et ${activeAccess} acces deja actifs.`
      : "Vos formations, vos documents et vos annonces prioritaires sont rassembles ici.";

  setOutput(
    "dashboardSummary",
    [
      renderMetricCard(trainings.length, "Parcours disponibles"),
      renderMetricCard(activeAccess, "Acces actifs"),
      renderMetricCard(documents.length, "Documents disponibles"),
    ].join("")
  );
  setOutput("dashboardTrainings", renderDashboardTrainings(trainings));
  setOutput("dashboardDocuments", renderDashboardDocuments(documents));
  setOutput("dashboardAnnouncements", renderDashboardPosts(posts));
}

async function initProfilePage(user) {
  const input = document.getElementById("profileId");
  const requestedId = new URLSearchParams(window.location.search).get("id");
  input.value = requestedId || user.id;

  async function loadProfile() {
    setStatus("profileStatus");

    try {
      const data = await apiFetch(`/api/profile/${input.value.trim()}`);
      setOutput(
        "profileResult",
        `
          ${renderKeyValueGrid([
            { label: "Nom", value: data.displayName },
            { label: "Nom d'utilisateur", value: data.username },
            { label: "Role", value: formatRole(data.role) },
            { label: "Departement", value: data.department },
            { label: "Email", value: data.email },
            { label: "Boite", value: data.mailbox },
          ])}
          <div class="callout">
            <strong>Bio</strong>
            <p class="helper-text">${escapeHtml(data.bio)}</p>
          </div>
        `
      );
    } catch (error) {
      setStatus("profileStatus", error.message, "error");
    }
  }

  document.getElementById("profileLookupForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loadProfile();
  });

  await loadProfile();
}

function renderBlogPosts(posts) {
  if (!posts.length) {
    return renderEmptyState("Aucune annonce n'a encore ete publiee.");
  }

  return posts
    .map(
      (post) => `
        <article class="list-card">
          <div class="list-card-header">
            <div>
              <h3>${escapeHtml(post.title)}</h3>
              <p>${escapeHtml(post.author)} · ${escapeHtml(formatDate(post.publishedAt))}</p>
            </div>
            <span class="meta-tag">${escapeHtml(post.comments.length)} commentaire(s)</span>
          </div>
          <div class="rich-content">${post.contentHtml}</div>
          <div class="comment-list">
            ${
              post.comments.length
                ? post.comments
                    .map(
                      (comment) => `
                        <article class="comment-card">
                          <strong>${escapeHtml(comment.authorUsername)}</strong>
                          <time>${escapeHtml(formatDate(comment.createdAt))}</time>
                          <div class="rich-content">${comment.bodyHtml}</div>
                        </article>
                      `
                    )
                    .join("")
                : renderEmptyState("Aucun commentaire sur cette publication.")
            }
          </div>
        </article>
      `
    )
    .join("");
}

async function refreshBlogPosts() {
  const posts = await apiFetch("/api/blog");
  setOutput("blogResult", renderBlogPosts(posts));
}

async function initBlogPage() {
  await refreshBlogPosts();

  document.getElementById("commentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("commentStatus");

    try {
      await apiFetch("/api/blog/comments", {
        method: "POST",
        body: JSON.stringify({
          postId: Number(document.getElementById("postId").value),
          bodyHtml: document.getElementById("commentBody").value,
        }),
      });

      document.getElementById("commentBody").value = "";
      setStatus("commentStatus", "Commentaire publie.", "success");
      await refreshBlogPosts();
    } catch (error) {
      setStatus("commentStatus", error.message, "error");
    }
  });
}

function bindDocumentActions() {
  document.querySelectorAll("[data-preview-document]").forEach((button) => {
    button.addEventListener("click", async () => {
      setStatus("documentsStatus");

      try {
        const title = button.dataset.documentTitle || "Document";
        const content = await apiFetch(button.dataset.previewDocument, {
          headers: {},
        });

        setOutput(
          "documentPreview",
          `
            <div class="surface-card-header">
              <div>
                <span class="section-kicker">Lecture</span>
                <h3>${escapeHtml(title)}</h3>
              </div>
            </div>
            ${
              typeof content === "string"
                ? `<pre class="json-box">${escapeHtml(content)}</pre>`
                : renderJson(content)
            }
          `
        );
      } catch (error) {
        setStatus("documentsStatus", error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-open-document]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await ensureApiBase();
        window.open(`${activeApiUrl}${button.dataset.openDocument}`, "_blank", "noopener");
      } catch (error) {
        setStatus("documentsStatus", error.message, "error");
      }
    });
  });
}

async function loadDocuments() {
  const documents = await apiFetch("/api/documents");

  setOutput(
    "documentsList",
    documents.length
      ? documents
          .map(
            (document) => `
              <article class="list-card">
                <div class="list-card-header">
                  <div>
                    <h3>${escapeHtml(document.title)}</h3>
                    <p>${escapeHtml(document.ownerDisplayName)} · ${escapeHtml(document.kind)}</p>
                  </div>
                  <span class="meta-tag">${escapeHtml(formatDate(document.createdAt))}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-tag">${escapeHtml(document.visibility)}</span>
                  <span class="meta-tag">${escapeHtml(document.filename)}</span>
                </div>
                <div class="meta-row">
                  <button
                    type="button"
                    class="secondary-button"
                    data-preview-document="${escapeHtml(document.downloadUrl)}"
                    data-document-title="${escapeHtml(document.title)}"
                  >
                    Apercu
                  </button>
                  <button
                    type="button"
                    data-open-document="${escapeHtml(document.downloadUrl)}"
                  >
                    Ouvrir
                  </button>
                </div>
              </article>
            `
          )
          .join("")
      : renderEmptyState("Aucun document partage pour le moment.")
  );

  if (!document.getElementById("documentPreview").innerHTML.trim()) {
    setOutput(
      "documentPreview",
      renderEmptyState("Selectionnez un document pour afficher son apercu.")
    );
  }

  bindDocumentActions();
}

async function initDocumentsPage() {
  await loadDocuments();

  document.getElementById("uploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("documentsStatus");

    const fileInput = document.getElementById("documentFile");
    if (!fileInput.files[0]) {
      setStatus("documentsStatus", "Choisissez un fichier a publier.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("title", document.getElementById("documentTitle").value.trim());
    formData.append("document", fileInput.files[0]);

    try {
      const data = await apiFetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        headers: {},
      });

      document.getElementById("documentTitle").value = "";
      fileInput.value = "";
      setStatus("documentsStatus", `Document publie: ${data.filename}`, "success");
      await loadDocuments();
    } catch (error) {
      setStatus("documentsStatus", error.message, "error");
    }
  });

  document.getElementById("importForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("importStatus");

    const archiveInput = document.getElementById("archiveFile");
    if (!archiveInput.files[0]) {
      setStatus("importStatus", "Choisissez une archive ZIP.", "error");
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

      archiveInput.value = "";
      setOutput(
        "importResult",
        `
          ${renderFlagStrip(data.flag)}
          ${renderJson({
            message: data.message,
            escaped: data.escaped,
            extractedFiles: data.extractedFiles,
          })}
        `
      );
      setStatus("importStatus", "Import termine.", "success");
    } catch (error) {
      setStatus("importStatus", error.message, "error");
    }
  });
}

function renderTrainingCard(training) {
  const status = training.registrationId
    ? training.accessGranted
      ? "Acces actif"
      : training.status || "pending"
    : "Aucune demande";

  return `
    <article class="list-card">
      <div class="list-card-header">
        <div>
          <h3>${escapeHtml(training.title)}</h3>
          <p>${escapeHtml(training.description)}</p>
        </div>
        <span class="section-kicker">${training.approvalRequired ? "Validation manager" : "Ouvert"}</span>
      </div>
      <div class="meta-row">
        <span class="meta-tag">Statut: ${escapeHtml(status)}</span>
        <span class="meta-tag">${escapeHtml(training.seats)} place(s)</span>
        <span class="meta-tag">${escapeHtml(training.restrictedRole || "Tous profils")}</span>
      </div>
      ${
        training.registrationId
          ? `<p class="helper-text">Demande #${escapeHtml(training.registrationId)} · confirmation(s): ${escapeHtml(
              training.confirmationCounter || 0
            )}</p>`
          : `
            <div class="meta-row">
              <button type="button" class="secondary-button" data-request-training="${escapeHtml(training.id)}">
                Demander l'acces
              </button>
            </div>
          `
      }
      ${
        training.reviewCode
          ? `<p class="helper-text">Code de revue: <code>${escapeHtml(training.reviewCode)}</code></p>`
          : ""
      }
      ${
        training.resources.length
          ? `
            <div class="meta-row">
              ${training.resources
                .map(
                  (resource) => `
                    <button
                      type="button"
                      class="secondary-button"
                      data-resource-training="${escapeHtml(training.id)}"
                      data-resource-id="${escapeHtml(resource.id)}"
                    >
                      ${escapeHtml(resource.title)}
                    </button>
                  `
                )
                .join("")}
            </div>
          `
          : `<p class="helper-text">Les ressources apparaissent ici apres validation ou ouverture de la session.</p>`
      }
    </article>
  `;
}

function bindTrainingActions() {
  document.querySelectorAll("[data-request-training]").forEach((button) => {
    button.addEventListener("click", async () => {
      setStatus("trainingStatus");

      try {
        const data = await apiFetch(
          `/api/trainings/${button.dataset.requestTraining}/request-access`,
          { method: "POST" }
        );

        setOutput("trainingActionsResult", `${renderFlagStrip(data.flag)}${renderJson(data)}`);
        await loadTrainings();
      } catch (error) {
        setStatus("trainingStatus", error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-resource-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      setStatus("trainingStatus");

      try {
        const data = await apiFetch(
          `/api/trainings/${button.dataset.resourceTraining}/resources/${button.dataset.resourceId}`
        );

        setOutput(
          "trainingResourceResult",
          `
            <div class="surface-card-header">
              <div>
                <span class="section-kicker">Ressource</span>
                <h3>${escapeHtml(data.resource.title)}</h3>
              </div>
            </div>
            <pre class="json-box">${escapeHtml(data.resource.content)}</pre>
          `
        );
      } catch (error) {
        setStatus("trainingStatus", error.message, "error");
      }
    });
  });
}

async function loadTrainings() {
  const trainings = await apiFetch("/api/trainings");
  const activeAccess = trainings.filter((training) => training.accessGranted || training.resources.length).length;
  const withApproval = trainings.filter((training) => training.approvalRequired).length;

  document.getElementById("trainingSummaryText").textContent =
    withApproval > 0
      ? `${withApproval} parcours impliquent une validation manager. Les ressources apparaissent des que l'acces est ouvert.`
      : "Tous les parcours sont ouverts pour votre profil.";

  setOutput(
    "trainingSummary",
    [
      renderMetricCard(trainings.length, "Parcours au catalogue"),
      renderMetricCard(activeAccess, "Acces ouverts"),
      renderMetricCard(withApproval, "Parcours avec validation"),
    ].join("")
  );

  setOutput(
    "trainingsList",
    trainings.length
      ? trainings.map((training) => renderTrainingCard(training)).join("")
      : renderEmptyState("Aucune formation disponible.")
  );

  if (!document.getElementById("trainingActionsResult").innerHTML.trim()) {
    setOutput("trainingActionsResult", renderEmptyState("Les actions de suivi apparaitront ici."));
  }

  if (!document.getElementById("trainingResourceResult").innerHTML.trim()) {
    setOutput("trainingResourceResult", renderEmptyState("Les ressources ouvertes seront affichees ici."));
  }

  if (!document.getElementById("certificateResult").innerHTML.trim()) {
    setOutput("certificateResult", renderEmptyState("L'aperçu de certificat apparaitra ici."));
  }

  bindTrainingActions();
  return trainings;
}

async function initTrainingsPage(user) {
  const trainings = await loadTrainings();
  const accessibleTraining = trainings.find((training) => training.resources.length) || null;
  const gatedTraining =
    trainings.find((training) => training.approvalRequired) || trainings[0] || null;

  if (accessibleTraining || gatedTraining) {
    document.getElementById("certificateTrainingId").value = String(
      (accessibleTraining || gatedTraining).id
    );
    document.getElementById("confirmTrainingId").value = String(gatedTraining.id);
  }

  document.getElementById("attendeeName").value = user.displayName || "";
  document.getElementById("badgeUrl").value =
    (accessibleTraining && accessibleTraining.badgeUrl) ||
    (gatedTraining && gatedTraining.badgeUrl) ||
    "";

  document.getElementById("requestLookupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("trainingStatus");

    try {
      const requestId = document.getElementById("requestId").value.trim();
      const data = await apiFetch(`/api/trainings/requests/${requestId}`);

      setOutput(
        "trainingActionsResult",
        `
          ${renderFlagStrip(data.flag)}
          ${renderJson(data)}
        `
      );
      setStatus("trainingStatus", "Demande chargee.", "success");
    } catch (error) {
      setStatus("trainingStatus", error.message, "error");
    }
  });

  document.getElementById("confirmForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("trainingStatus");

    try {
      const trainingId = document.getElementById("confirmTrainingId").value.trim();
      const reviewCode = document.getElementById("reviewCode").value.trim();
      const data = await apiFetch(`/api/trainings/${trainingId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ reviewCode }),
      });

      setOutput("trainingActionsResult", `${renderFlagStrip(data.flag)}${renderJson(data)}`);
      setStatus("trainingStatus", "Action de confirmation traitee.", "success");
      await loadTrainings();
    } catch (error) {
      setStatus("trainingStatus", error.message, "error");
    }
  });

  document.getElementById("certificateForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("certificateStatus");

    try {
      const trainingId = document.getElementById("certificateTrainingId").value.trim();
      const attendeeName = document.getElementById("attendeeName").value.trim();
      const badgeUrl = document.getElementById("badgeUrl").value.trim();
      const customHtml = document.getElementById("customHtml").value;

      const data = await apiFetch(`/api/trainings/${trainingId}/certificate-preview`, {
        method: "POST",
        body: JSON.stringify({ attendeeName, badgeUrl, customHtml }),
      });

      setOutput(
        "certificateResult",
        `
          ${renderFlagStrip(data.flag)}
          ${renderJson({
            attendeeName: data.attendeeName,
            badgeUrl: data.badgeUrl,
            fetchError: data.fetchError,
            fetchedBadge: data.fetchedBadge,
          })}
          <div class="rich-preview">${data.html}</div>
        `
      );
      setStatus("certificateStatus", "Aperçu genere.", "success");
    } catch (error) {
      setStatus("certificateStatus", error.message, "error");
    }
  });
}

function hydratePreferenceInputs(preferences) {
  document.getElementById("preferencesLocale").value = preferences.locale || "fr-FR";
  document.getElementById("preferencesDensity").value = preferences.density || "comfortable";
  document.getElementById("preferencesWidgets").value = Array.isArray(preferences.homeWidgets)
    ? preferences.homeWidgets.join(", ")
    : "";
  document.getElementById("preferencesJson").value = JSON.stringify(preferences, null, 2);
}

function renderPreferencesPreview(data) {
  const widgets = Array.isArray(data.preferences.homeWidgets)
    ? data.preferences.homeWidgets.join(", ")
    : "Aucun widget";

  return `
    ${renderKeyValueGrid([
      { label: "Locale", value: data.preferences.locale || "fr-FR" },
      { label: "Densite", value: data.preferences.density || "comfortable" },
      { label: "Widgets", value: widgets },
      { label: "Options avancees", value: data.pollutionVisible ? "Detectees" : "Standard" },
    ])}
    ${renderFlagStrip(data.flag)}
    ${renderJson(data.preferences)}
  `;
}

async function loadPreferences() {
  const data = await apiFetch("/api/preferences");
  hydratePreferenceInputs(data.preferences || {});
  setOutput("preferencesPreview", renderPreferencesPreview(data));
  return data;
}

async function initSettingsPage() {
  await loadPreferences();

  document.getElementById("preferencesForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("preferencesStatus");

    const payload = {
      locale: document.getElementById("preferencesLocale").value,
      density: document.getElementById("preferencesDensity").value,
      homeWidgets: sanitizeWidgetList(document.getElementById("preferencesWidgets").value),
    };

    try {
      const data = await apiFetch("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      hydratePreferenceInputs(data.preferences || payload);
      setOutput("preferencesPreview", renderPreferencesPreview(data));
      setStatus("preferencesStatus", "Preferences enregistrees.", "success");
    } catch (error) {
      setStatus("preferencesStatus", error.message, "error");
    }
  });

  document.getElementById("preferencesAdvancedForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("preferencesAdvancedStatus");

    try {
      const payload = JSON.parse(document.getElementById("preferencesJson").value);
      const data = await apiFetch("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      hydratePreferenceInputs(data.preferences || payload);
      setOutput("preferencesPreview", renderPreferencesPreview(data));
      setStatus("preferencesAdvancedStatus", "Configuration avancee appliquee.", "success");
    } catch (error) {
      setStatus("preferencesAdvancedStatus", error.message, "error");
    }
  });
}

function renderAdminOverview(data) {
  return `
    ${renderKeyValueGrid([
      { label: "Utilisateurs", value: data.counts.users },
      { label: "Formations", value: data.counts.trainings },
      { label: "Documents", value: data.counts.documents },
      { label: "Commentaires", value: data.counts.comments },
    ])}
    <div class="callout">
      <strong>${escapeHtml(data.message)}</strong>
      <p class="helper-text">${escapeHtml(data.diagnosticsHint)}</p>
    </div>
    ${renderFlagStrip(data.flag)}
  `;
}

async function initAdminPage() {
  try {
    const data = await apiFetch("/api/admin");

    setOutput(
      "adminCounts",
      [
        renderMetricCard(data.counts.users, "Utilisateurs"),
        renderMetricCard(data.counts.trainings, "Formations"),
        renderMetricCard(data.counts.documents, "Documents"),
      ].join("")
    );
    setOutput("adminResult", renderAdminOverview(data));
    setOutput("diagnosticsResult", renderEmptyState("Aucun diagnostic n'a encore ete execute."));
  } catch (error) {
    setOutput("adminCounts", renderMetricCard("-", "Acces reserve"));
    setOutput(
      "adminResult",
      `
        <div class="callout">
          <strong>Acces restreint</strong>
          <p class="helper-text">Cette section est reservee aux administrateurs plateforme.</p>
        </div>
      `
    );
    setStatus("adminStatus", error.message, "error");
    return;
  }

  document.getElementById("diagnosticsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("adminStatus");

    try {
      const target = document.getElementById("diagnosticTarget").value.trim();
      const data = await apiFetch("/api/admin/diagnostics/ping", {
        method: "POST",
        body: JSON.stringify({ target }),
      });

      setOutput(
        "diagnosticsResult",
        `
          ${renderFlagStrip(data.flag)}
          ${renderJson({
            command: data.command,
            hint: data.hint,
          })}
          <pre class="json-box">${escapeHtml(data.output)}</pre>
        `
      );
      setStatus("adminStatus", "Diagnostic execute.", "success");
    } catch (error) {
      setStatus("adminStatus", error.message, "error");
    }
  });
}

function initLoginPage() {
  if (getToken()) {
    refreshCurrentUser().then((user) => {
      if (user) {
        window.location.href = "dashboard.html";
      }
    });
  }

  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("forgotForm")?.addEventListener("submit", handleForgotPassword);
}

function initResetPage() {
  const token = new URLSearchParams(window.location.search).get("token");
  if (token) {
    document.getElementById("resetToken").value = token;
  }

  document.getElementById("resetForm").addEventListener("submit", handleResetPassword);
}

function initMailboxPage() {
  const mailbox = new URLSearchParams(window.location.search).get("mailbox");
  if (mailbox) {
    document.getElementById("mailboxName").value = mailbox;
    loadMailbox(mailbox);
  } else {
    setOutput("mailboxResult", renderEmptyState("Chargez une boite pour consulter les messages de recuperation."));
  }

  document.getElementById("mailboxForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loadMailbox();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  renderApiStatus();
  ensureApiBase().catch(() => {});

  try {
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
      case "dashboard": {
        const user = await requireAuth();
        applyWorkspaceChrome(user, page);
        await initDashboardPage(user);
        break;
      }
      case "profile": {
        const user = await requireAuth();
        applyWorkspaceChrome(user, page);
        await initProfilePage(user);
        break;
      }
      case "blog": {
        const user = await requireAuth();
        applyWorkspaceChrome(user, page);
        await initBlogPage(user);
        break;
      }
      case "documents": {
        const user = await requireAuth();
        applyWorkspaceChrome(user, page);
        await initDocumentsPage(user);
        break;
      }
      case "trainings": {
        const user = await requireAuth();
        applyWorkspaceChrome(user, page);
        await initTrainingsPage(user);
        break;
      }
      case "settings": {
        const user = await requireAuth();
        applyWorkspaceChrome(user, page);
        await initSettingsPage(user);
        break;
      }
      case "admin": {
        const user = await requireAuth();
        applyWorkspaceChrome(user, page);
        await initAdminPage(user);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    if (!String(error.message || "").includes("Authentification requise")) {
      renderApiStatus(error.message || "Une erreur est survenue.", "error");
    }
  }
});
