import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Production builds are served from GitHub Pages at /beef-app/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/beef-app/' : '/',
  plugins: [react()],
}))
