const API_URL = "http://localhost:3000";

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

function requireAuth() {
  if (!getToken()) {
    window.location.href = "index.html";
  }
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();

  const errorBox = document.getElementById("error");
  errorBox.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      errorBox.textContent = data.error || "Erreur de connexion";
      return;
    }

    setSession(data.token, data.user);
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error(error);
    errorBox.textContent = "Serveur inaccessible";
  }
}

async function loadDashboard() {
  requireAuth();

  const user = getUser();
  const dashboardUser = document.getElementById("dashboardUser");
  const tokenStatus = document.getElementById("tokenStatus");

  if (dashboardUser && user) {
    dashboardUser.innerHTML = `
      <p><strong>Nom :</strong> ${user.displayName}</p>
      <p><strong>Username :</strong> ${user.username}</p>
      <p><strong>Rôle :</strong> ${user.role}</p>
    `;
  }

  try {
    const response = await fetch(`${API_URL}/api/token`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      tokenStatus.innerHTML = `<div class="error-box">${data.error || "Token invalide"}</div>`;
      return;
    }

    tokenStatus.innerHTML = `
      <p class="status-ok">Token valide</p>
      <p><strong>Utilisateur :</strong> ${data.user.username}</p>
      <p><strong>Rôle :</strong> ${data.user.role}</p>
    `;
  } catch (error) {
    console.error(error);
    tokenStatus.innerHTML = `<div class="error-box">Erreur API</div>`;
  }
}

async function loadProfilePage() {
  requireAuth();

  const user = getUser();
  const profileBox = document.getElementById("profile");
  const errorBox = document.getElementById("profileError");

  if (!user) return;

  errorBox.textContent = "";

  try {
    const response = await fetch(`${API_URL}/profile?id=${user.id}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      errorBox.textContent = data.error || "Erreur profil";
      return;
    }

    profileBox.innerHTML = `
      <p><strong>Nom :</strong> ${data.displayName}</p>
      <p><strong>Email :</strong> ${data.email}</p>
      <p><strong>Département :</strong> ${data.department}</p>
      <p><strong>Rôle :</strong> ${data.role}</p>
    `;
  } catch (error) {
    console.error(error);
    errorBox.textContent = "Impossible de charger le profil";
  }
}

async function loadBlogPage() {
  requireAuth();

  const blogBox = document.getElementById("blog");
  const errorBox = document.getElementById("blogError");

  errorBox.textContent = "";
  blogBox.innerHTML = "";

  try {
    const response = await fetch(`${API_URL}/blog`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const posts = await response.json();

    if (!response.ok) {
      errorBox.textContent = posts.error || "Erreur blog";
      return;
    }

    posts.forEach((post) => {
      const commentsHtml = post.comments
        .map(
          (comment) => `
            <div class="comment">
              <strong>${comment.author}</strong> : ${comment.text}
            </div>
          `
        )
        .join("");

      blogBox.innerHTML += `
        <article class="post">
          <h3>${post.title}</h3>
          <p><strong>Auteur :</strong> ${post.author}</p>
          <p>${post.content}</p>
          <div>
            <h4>Commentaires</h4>
            ${commentsHtml || "<p>Aucun commentaire</p>"}
          </div>
        </article>
      `;
    });
  } catch (error) {
    console.error(error);
    errorBox.textContent = "Impossible de charger le blog";
  }
}

async function sendComment() {
  requireAuth();

  const status = document.getElementById("commentStatus");
  const postId = Number(document.getElementById("postId").value);
  const text = document.getElementById("comment").value.trim();

  status.textContent = "";

  if (!postId || !text) {
    status.textContent = "Post ID et commentaire requis";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/blog/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ postId, text }),
    });

    const data = await response.json();

    if (!response.ok) {
      status.textContent = data.error || "Erreur commentaire";
      return;
    }

    status.textContent = "Commentaire ajouté";
    document.getElementById("comment").value = "";
    loadBlogPage();
  } catch (error) {
    console.error(error);
    status.textContent = "Erreur serveur";
  }
}

const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", handleUpload);
}

async function handleUpload(event) {
  event.preventDefault();
  requireAuth();

  const uploadMessage = document.getElementById("uploadMessage");
  const fileInput = document.getElementById("file");
  const file = fileInput.files[0];

  uploadMessage.textContent = "";

  if (!file) {
    uploadMessage.textContent = "Choisis un fichier";
    return;
  }

  const formData = new FormData();
  formData.append("document", file);

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      uploadMessage.textContent = data.error || "Erreur upload";
      return;
    }

    uploadMessage.textContent = `Upload réussi : ${data.filename}`;
    uploadMessage.className = "status-info";
  } catch (error) {
    console.error(error);
    uploadMessage.textContent = "Erreur serveur";
  }
}

async function loadAdminPage() {
  requireAuth();

  const adminBox = document.getElementById("admin");
  const errorBox = document.getElementById("adminError");

  adminBox.innerHTML = "";
  errorBox.textContent = "";

  try {
    const response = await fetch(`${API_URL}/admin`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      errorBox.textContent = data.error || "Accès refusé";
      return;
    }

    adminBox.innerHTML = `
      <p class="status-ok">${data.message}</p>
      <p><strong>Utilisateurs :</strong> ${data.stats.users}</p>
      <p><strong>Posts :</strong> ${data.stats.posts}</p>
    `;
  } catch (error) {
    console.error(error);
    errorBox.textContent = "Erreur admin";
  }
}