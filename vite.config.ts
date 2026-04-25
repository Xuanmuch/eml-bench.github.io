import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Actions sets VITE_BASE=/repo-name/ for Project Pages.
// User/org site at username.github.io → use VITE_BASE=/ or omit.
const base = (process.env.VITE_BASE ?? '/').replace(/\/?$/, '/')

export default defineConfig({
  base,
  publicDir: 'public',
  plugins: [react()],
  // Listen on all interfaces so SSH port-forward / WSL / LAN access works (not only 127.0.0.1 on the dev machine).
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
})
