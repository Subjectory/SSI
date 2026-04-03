import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3000";

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");

  const [posts, setPosts] = useState([]);
  const [blogError, setBlogError] = useState("");
  const [commentText, setCommentText] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const [adminData, setAdminData] = useState(null);
  const [adminError, setAdminError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Erreur de connexion");
        return;
      }

      setToken(data.token);
      setUser(data.user);
    } catch (error) {
      console.error(error);
      setLoginError("Serveur inaccessible");
    }
  }

  async function loadProfile() {
    if (!token || !user) return;
    setProfileError("");

    try {
      const res = await fetch(`${API_URL}/profile?id=${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.error || "Erreur profil");
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error(error);
      setProfileError("Impossible de charger le profil");
    }
  }

  async function loadBlog() {
    if (!token) return;
    setBlogError("");

    try {
      const res = await fetch(`${API_URL}/blog`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setBlogError(data.error || "Erreur blog");
        return;
      }

      setPosts(data);
    } catch (error) {
      console.error(error);
      setBlogError("Impossible de charger le blog");
    }
  }

  async function handleComment(postId) {
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`${API_URL}/blog/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId,
          text: commentText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erreur commentaire");
        return;
      }

      setCommentText("");
      loadBlog();
    } catch (error) {
      console.error(error);
      alert("Erreur serveur");
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    setUploadMessage("");

    if (!selectedFile) {
      setUploadMessage("Choisis un fichier");
      return;
    }

    const formData = new FormData();
    formData.append("document", selectedFile);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadMessage(data.error || "Erreur upload");
        return;
      }

      setUploadMessage(`Upload réussi : ${data.filename}`);
    } catch (error) {
      console.error(error);
      setUploadMessage("Erreur serveur");
    }
  }

  async function loadAdmin() {
    setAdminError("");
    setAdminData(null);

    try {
      const res = await fetch(`${API_URL}/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setAdminError(data.error || "Accès refusé");
        return;
      }

      setAdminData(data);
    } catch (error) {
      console.error(error);
      setAdminError("Erreur admin");
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    setProfile(null);
    setPosts([]);
    setAdminData(null);
    setUsername("");
    setPassword("");
    setCommentText("");
    setSelectedFile(null);
    setLoginError("");
    setProfileError("");
    setBlogError("");
    setUploadMessage("");
    setAdminError("");
  }

  useEffect(() => {
    if (token && user) {
      loadProfile();
      loadBlog();
    }
  }, [token, user]);

  if (!token) {
    return (
      <div className="page">
        <div className="login-card">
          <h1>CorpHack Intranet</h1>
          <p className="subtitle">Portail employé — Espace interne</p>

          <form onSubmit={handleLogin} className="login-form">
            <label>Nom d’utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alice"
            />

            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />

            {loginError && <div className="error-box">{loginError}</div>}

            <button type="submit">Se connecter</button>
          </form>

          <div className="demo-box">
            <p><strong>Comptes de démo</strong></p>
            <p>Employé : <code>alice</code> / <code>Password123!</code></p>
            <p>Admin : <code>admin</code> / <code>Admin123!</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="topbar">
        <div>
          <p className="tag">CorpHack — Intranet sécurisé</p>
          <h1>Bonjour, {user.displayName}</h1>
          <p className="subtitle">Rôle : {user.role}</p>
        </div>

        <button onClick={logout} className="logout-btn">
          Déconnexion
        </button>
      </header>

      <main className="layout">
        <section className="main-column">
          <div className="panel">
            <h2>Mon profil</h2>
            {profileError && <div className="error-box">{profileError}</div>}
            {profile ? (
              <div className="info-box">
                <p><strong>Nom :</strong> {profile.displayName}</p>
                <p><strong>Email :</strong> {profile.email}</p>
                <p><strong>Département :</strong> {profile.department}</p>
                <p><strong>Rôle :</strong> {profile.role}</p>
              </div>
            ) : (
              <p>Chargement du profil...</p>
            )}
          </div>

          <div className="panel">
            <h2>Blog interne</h2>
            {blogError && <div className="error-box">{blogError}</div>}

            {posts.map((post) => (
              <div key={post.id} className="post-card">
                <h3>{post.title}</h3>
                <p><strong>Auteur :</strong> {post.author}</p>
                <p>{post.content}</p>

                <div className="comments-box">
                  <h4>Commentaires</h4>
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="comment-item">
                      <strong>{comment.author} :</strong> {comment.text}
                    </div>
                  ))}
                </div>

                <div className="comment-form">
                  <input
                    type="text"
                    placeholder="Ajouter un commentaire"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button onClick={() => handleComment(post.id)}>
                    Publier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="sidebar-card">
          <div className="panel">
            <h2>Upload document</h2>
            <form onSubmit={handleUpload} className="upload-form">
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
              <button type="submit">Envoyer</button>
            </form>
            {uploadMessage && <p className="status-text">{uploadMessage}</p>}
          </div>

          <div className="panel">
            <h2>Admin panel</h2>
            <button onClick={loadAdmin}>Tester accès admin</button>

            {adminError && <div className="error-box">{adminError}</div>}

            {adminData && (
              <div className="info-box">
                <p>{adminData.message}</p>
                <p><strong>Utilisateurs :</strong> {adminData.stats.users}</p>
                <p><strong>Posts :</strong> {adminData.stats.posts}</p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}