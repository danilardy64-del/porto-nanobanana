
import { ref, onValue, set } from "firebase/database";
import { db } from "../src/firebase"; // Mengarah ke src/firebase.ts
import { PortfolioItem } from "../types";

/**
 * Mendengarkan perubahan data secara Realtime dari Firebase.
 */
export const subscribeToPortfolio = (onDataReceived: (items: PortfolioItem[]) => void) => {
  if (!db) {
      console.warn("Database belum terkoneksi (Menunggu Setup)");
      onDataReceived([]); 
      return () => {};
  }

  const portfolioRef = ref(db, 'portfolio/slots');
  
  const unsubscribe = onValue(portfolioRef, (snapshot) => {
    const data = snapshot.val();
    if (data && Array.isArray(data)) {
      onDataReceived(data);
    } else {
      onDataReceived([]);
    }
  }, (error) => {
    console.error("Firebase Read Error:", error);
  });

  return unsubscribe;
};

/**
 * Mengirim data terbaru ke Firebase Cloud.
 */
export const savePortfolioToCloud = async (items: PortfolioItem[]) => {
  if (!db) {
      throw new Error("Database belum disetting! Lakukan setup di halaman awal.");
  }
  
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
