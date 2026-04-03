const users = [
  {
    id: 1,
    username: "alice",
    password: "Password123!",
    displayName: "Alice Martin",
    role: "employee",
    department: "HR",
    email: "alice@corphack.local",
  },
  {
    id: 2,
    username: "admin",
    password: "Admin123!",
    displayName: "Admin CorpHack",
    role: "admin",
    department: "IT",
    email: "admin@corphack.local",
  },
];

const posts = [
  {
    id: 1,
    title: "Bienvenue sur l’intranet",
    author: "Communication",
    content: "Le portail interne CorpHack est disponible.",
    comments: [
      {
        id: 1,
        author: "alice",
        text: "Merci, bien reçu.",
      },
    ],
  },
];

module.exports = {
  users,
  posts,
};