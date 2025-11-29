import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // INI BAGIAN PENTING:
    // Kita memaksa Vite untuk mengganti 'process.env.API_KEY' di dalam kodingan
    // menjadi string kunci API Anda yang sebenarnya.
    'process.env.API_KEY': JSON.stringify("AIzaSyApXH_2TL8e1fFsCwzW0lfu22GGodr7O6A"),
  }
})