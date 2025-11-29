
import { initializeApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

// Cek apakah ada config tersimpan di browser
const savedConfig = localStorage.getItem('kilau_firebase_config');

let app;
let db: Database | null = null;
let isConfigured = false;

if (savedConfig) {
  try {
    const config = JSON.parse(savedConfig);
    app = initializeApp(config);
    db = getDatabase(app);
    isConfigured = true;
  } catch (error) {
    console.error("Config Firebase Error:", error);
    localStorage.removeItem('kilau_firebase_config'); // Reset jika rusak
  }
}

// Fungsi helper untuk menyimpan config dari UI
export const saveFirebaseConfig = (configStr: string) => {
  try {
    // Validasi JSON sederhana
    const parsed = JSON.parse(configStr);
    if (!parsed.apiKey || !parsed.projectId) {
        throw new Error("Config tidak valid (kurang apiKey atau projectId)");
    }
    localStorage.setItem('kilau_firebase_config', configStr);
    window.location.reload(); // Reload agar config terbaca
    return true;
  } catch (e) {
    alert("Format JSON Salah! Pastikan copy semua termasuk kurung kurawal { }");
    return false;
  }
};

export const resetFirebaseConfig = () => {
    localStorage.removeItem('kilau_firebase_config');
    window.location.reload();
};

export { db, isConfigured };
