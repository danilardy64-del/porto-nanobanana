import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// --- AREA INI YANG NANTI HARUS ANDA ISI ---
// Ganti tulisan "GANTI_DENGAN_..." di bawah ini dengan kode dari Firebase Console Anda
const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY_DARI_FIREBASE",
  authDomain: "GANTI_DENGAN_AUTHDOMAIN",
  projectId: "GANTI_DENGAN_PROJECT_ID",
  storageBucket: "GANTI_DENGAN_STORAGE_BUCKET",
  messagingSenderId: "GANTI_DENGAN_MESSAGING_ID",
  appId: "GANTI_DENGAN_APP_ID"
};
// ------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);