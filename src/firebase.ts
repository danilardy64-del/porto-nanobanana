
import { initializeApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

// Konfigurasi Firebase Anda (Hardcoded)
const firebaseConfig = {
  apiKey: "AIzaSyAg02Bv92e25xnrc6dxLJf9C5tR6Z20CnY",
  authDomain: "nanobanana-62b6c.firebaseapp.com",
  databaseURL: "https://nanobanana-62b6c-default-rtdb.firebaseio.com",
  projectId: "nanobanana-62b6c",
  storageBucket: "nanobanana-62b6c.firebasestorage.app",
  messagingSenderId: "448241154304",
  appId: "1:448241154304:web:d1ffb7297a83decdb35be5",
  measurementId: "G-VFX34GNYCL"
};

// Initialize Firebase directly
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const isConfigured = true;

// Dummy functions to prevent breaking existing imports if any
export const saveFirebaseConfig = (configStr: string) => { return true; };
export const resetFirebaseConfig = () => { console.log("Reset disabled in hardcoded mode"); };

export { db, isConfigured };
