import { ref, onValue, set } from "firebase/database";
import { db } from "../src/firebase"; // Mengarah ke src/firebase.ts
import { PortfolioItem } from "../types";

/**
 * Mendengarkan perubahan data secara Realtime dari Firebase.
 * Setiap kali ada perubahan di server, fungsi ini akan jalan otomatis.
 */
export const subscribeToPortfolio = (onDataReceived: (items: PortfolioItem[]) => void) => {
  const portfolioRef = ref(db, 'portfolio/slots');
  
  // Fungsi ini 'berlangganan' ke database
  const unsubscribe = onValue(portfolioRef, (snapshot) => {
    const data = snapshot.val();
    if (data && Array.isArray(data)) {
      onDataReceived(data);
    } else {
      // Jika database kosong, return null biar App.tsx pakai default
      onDataReceived([]);
    }
  }, (error) => {
    console.error("Firebase Read Error:", error);
  });

  // Return fungsi cleanup
  return unsubscribe;
};

/**
 * Mengirim data terbaru ke Firebase Cloud.
 * Ini yang dilakukan saat Admin klik "SAVE TO CLOUD".
 */
export const savePortfolioToCloud = async (items: PortfolioItem[]) => {
  try {
    const portfolioRef = ref(db, 'portfolio/slots');
    await set(portfolioRef, items);
    console.log("Data successfully saved to Firebase Cloud!");
    return true;
  } catch (error) {
    console.error("Failed to save to Firebase:", error);
    throw error;
  }
};