import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Kita tidak perlu lagi memaksa define process.env
  // Vite otomatis mengenali variabel yang diawali dengan VITE_
})