import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(rootDir, "index.html"),
        dashboard: resolve(rootDir, "dashboard.html"),
        profile: resolve(rootDir, "profile.html"),
        blog: resolve(rootDir, "blog.html"),
        documents: resolve(rootDir, "documents.html"),
        upload: resolve(rootDir, "upload.html"),
        trainings: resolve(rootDir, "trainings.html"),
        admin: resolve(rootDir, "admin.html"),
        settings: resolve(rootDir, "settings.html"),
        reset: resolve(rootDir, "reset.html"),
        mailbox: resolve(rootDir, "mailbox.html"),
      },
    },
  },
});
