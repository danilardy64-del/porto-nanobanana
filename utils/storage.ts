import { PortfolioItem } from "../types";

const DB_NAME = "KilauPortfolioDB";
const STORE_NAME = "slots";
const DB_VERSION = 1;

/**
 * Opens the IndexedDB database.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save all portfolio items to IndexedDB.
 * We store each item individually to handle large base64 strings better.
 */
export const savePortfolioToDB = async (items: PortfolioItem[]) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Clear store first to ensure clean state or just put items
    // Using put to update existing ones
    items.forEach((item) => {
      store.put(item);
    });

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to save to DB:", error);
  }
};

/**
 * Load all portfolio items from IndexedDB.
 */
export const loadPortfolioFromDB = async (): Promise<PortfolioItem[] | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as PortfolioItem[];
        if (result && result.length > 0) {
            // Sort by ID to ensure correct order
            resolve(result.sort((a, b) => a.id - b.id));
        } else {
            resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to load from DB:", error);
    return null;
  }
};
