import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // base relativa: funziona sia in locale sia su GitHub Pages (con HashRouter)
  // senza dover conoscere in anticipo il nome del repository.
  base: './',
  plugins: [react(), tailwindcss()],
})
