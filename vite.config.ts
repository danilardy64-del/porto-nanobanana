import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // INI BAGIAN PENTING:
    // Kita memaksa Vite untuk mengganti 'process.env.API_KEY' di dalam kodingan
    // menjadi string kunci API baru yang Anda berikan.
    'process.env.API_KEY': JSON.stringify("AIzaSyD16HjE2Cg70oHx-iLwYPb3UutzvDJvLx8"),
  }
})