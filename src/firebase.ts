import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// --- AREA INI YANG NANTI HARUS ANDA ISI ---
// 1. Buka Firebase Console (Website)
// 2. Copy config SDK
// 3. Paste menimpa bagian di bawah ini:

const firebaseConfig = {
  apiKey: "PASTE_API_KEY_DISINI",
  authDomain: "PASTE_AUTH_DOMAIN_DISINI",
  projectId: "PASTE_PROJECT_ID_DISINI",
  storageBucket: "PASTE_STORAGE_BUCKET_DISINI",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID_DISINI",
  appId: "PASTE_APP_ID_DISINI"
};

// ------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);