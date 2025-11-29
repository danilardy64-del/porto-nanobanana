
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PortfolioItem, StoryResponse } from './types';
import { PortfolioCard } from './components/PortfolioCard';
import { StoryModal } from './components/StoryModal';
import { subscribeToPortfolio, savePortfolioToCloud } from './utils/storage';
import { INITIAL_DATA } from './src/data/initialData'; // Load static data

const TOTAL_SLOTS = 50;
const OWNER_PASSWORD = "@Hilo123";

const EXTERNAL_LINKS = [
  { name: "GEMINI", url: "https://gemini.google.com/" },
  { name: "PIXVERSE", url: "https://pixverse.ai/" },
  { name: "PIPIT AI", url: "https://pippit.ai/id-id" },
  { name: "HIGGSFIELD", url: "https://higgsfield.ai/" },
  { name: "SEAART AGENT", url: "https://www.seaart.ai/agent/d4fekqde878c73ebah70" },
];

// Helper: Compress Image to target ~100-500KB
const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize logic: Max dimension 800px (Good balance for web viewing & speed)
        const MAX_DIM = 800;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Fill white background (handling transparent PNGs converting to JPEG)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG with 0.7 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
        } else {
            reject(new Error("Canvas context failed"));
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
  // 1. INITIALIZATION STRATEGY
  const [items, setItems] = useState<PortfolioItem[]>(() => {
    if (INITIAL_DATA && INITIAL_DATA.length > 0) {
        return Array.from({ length: TOTAL_SLOTS }, (_, i) => {
            const staticItem = INITIAL_DATA.find(d => d.id === (i + 1));
            return staticItem || {
                id: i + 1,
                imageData: null,
                story: null,
                isLoading: false,
                error: null
            };
        });
    }

    return Array.from({ length: TOTAL_SLOTS }, (_, i) => ({
      id: i + 1,
      imageData: null,
      story: null,
      isLoading: false,
      error: null
    }));
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); 
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("admin");
  const [loginPass, setLoginPass] = useState("");

  const bulkInputRef = useRef<HTMLInputElement>(null);

  // 2. FIREBASE LISTENER
  useEffect(() => {
    const unsubscribe = subscribeToPortfolio((cloudData) => {
        if (cloudData && cloudData.length > 0) {
             setItems(prevItems => {
                 const mergedItems = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
                    const cloudItem = cloudData.find((item: any) => item.id === (i + 1));
                    return cloudItem || prevItems[i];
                 });
                 return mergedItems;
             });
        }
        setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        setOnlineUsers(Math.floor(Math.random() * (85 - 12 + 1) + 12));
    }, 5000);

    const visits = localStorage.getItem('kilau_visits') || "1024";
    const newVisits = parseInt(visits) + 1;
    localStorage.setItem('kilau_visits', newVisits.toString());
    setTotalVisits(newVisits);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    if (loginUser === "admin" && loginPass === OWNER_PASSWORD) {
        setIsLoggedIn(true);
        setLoginPass(""); 
    } else {
        alert("Password Salah! Akses Ditolak.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginPass("");
  };

  const handleAuthCheck = (): boolean => {
    if (isLoggedIn) {
        return true;
    } else {
        alert("Akses Ditolak. Silakan Login sebagai Admin di kolom Header (Atas) terlebih dahulu.");
        return false;
    }
  };

  // SAVE TO CLOUD LOGIC
  const handleSaveToCloud = async () => {
    if (!handleAuthCheck()) return;
    
    if (window.confirm("Simpan perubahan ke Firebase? Data akan terlihat oleh semua pengunjung.")) {
        setIsSyncing(true);
        try {
            await savePortfolioToCloud(items);
            alert("✅ SUKSES! Perubahan tersimpan.");
        } catch (error) {
            console.error(error);
            alert("❌ Gagal menyimpan. Pastikan internet stabil.");
        } finally {
            setIsSyncing(false);
        }
    }
  };

  const handleDeleteAll = () => {
    if (!handleAuthCheck()) return;

    if (window.confirm("PERINGATAN: Hapus SEMUA foto?")) {
        const resetItems = Array.from({ length: TOTAL_SLOTS }, (_, i) => ({
            id: i + 1,
            imageData: null,
            story: null,
            isLoading: false,
            error: null
        }));
        setItems(resetItems);
    }
  };

  // MANUAL UPLOAD LOGIC WITH COMPRESSION
  const processSlotUpload = async (id: number, file: File, openModal: boolean = false) => {
    try {
        // Step 1: Compress Image
        const compressedBase64 = await compressImage(file);

        // Step 2: Set Manual Prompt Default
        const defaultStory: StoryResponse = {
            title: "JUDUL BARU",
            story: "Tulis deskripsi prompt manual disini..."
        };
        const storyJson = JSON.stringify(defaultStory);

        // Step 3: Update State
        setItems(prev => prev.map(item => 
          item.id === id 
            ? { ...item, imageData: compressedBase64, story: storyJson, isLoading: false, error: null } 
            : item
        ));

        if (openModal) {
             setSelectedItem({ 
                id, 
                imageData: compressedBase64, 
                story: storyJson, 
                isLoading: false, 
                error: null 
            });
        }
    } catch (err) {
        console.error("Compression failed", err);
        alert("Gagal memproses gambar.");
    }
  };

  const handleUpload = useCallback((id: number, file: File) => {
    processSlotUpload(id, file, true);
  }, []);

  const handleBulkClick = () => {
    if(handleAuthCheck()) {
        bulkInputRef.current?.click();
    }
  };

  const handleBulkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const emptySlots = items.filter(i => !i.imageData);

      if (emptySlots.length === 0) {
        alert("Slot penuh! Hapus beberapa gambar dulu.");
        return;
      }

      setIsProcessingBulk(true);
      const filesToProcess = files.slice(0, emptySlots.length);
      
      for (let i = 0; i < filesToProcess.length; i++) {
          const file = filesToProcess[i];
          const slotId = emptySlots[i].id;
          await processSlotUpload(slotId, file, false);
      }

      setIsProcessingBulk(false);
      e.target.value = '';
    }
  };

  const handleUpdateItem = (id: number, newStoryData: StoryResponse) => {
    const jsonString = JSON.stringify(newStoryData);
    
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, story: jsonString } 
        : item
    ));

    setSelectedItem(prev => 
      prev && prev.id === id 
        ? { ...prev, story: jsonString } 
        : prev
    );
  };

  const handleDeleteItem = (id: number) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, imageData: null, story: null, isLoading: false, error: null } 
        : item
    ));
    setSelectedItem(null);
  };

  const handleCardClick = (item: PortfolioItem) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  const getParsedStory = (jsonString: string | null): StoryResponse | null => {
      if (!jsonString) return null;
      try {
          return JSON.parse(jsonString) as StoryResponse;
      } catch (e) {
          return null;
      }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-yellow-300 selection:text-black">
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
             backgroundSize: '24px 24px' 
           }}>
      </div>
      
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b-4 border-black">
        <div className="container mx-auto px-4 py-3 flex flex-col lg:flex-row items-center justify-between gap-4">
           {/* Logo - Left */}
           <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-start">
               <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-yellow-300 border-2 border-black rounded-full flex items-center justify-center">
                       <span className="font-bold text-lg">K</span>
                   </div>
                   <span className="font-bold text-sm tracking-wider uppercase">PORTOFOLIO FROM KILAU AI</span>
               </div>
               
               <div className="flex lg:hidden items-center gap-2 text-[10px] font-bold">
                   <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                   {onlineUsers} ON
               </div>
           </div>

           {/* Login Section - Center */}
           <div className="flex-1 flex justify-center w-full lg:w-auto">
               <div className="flex items-center gap-2 bg-slate-100 p-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {!isLoggedIn ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0">
                            <input 
                                type="text" 
                                value={loginUser}
                                readOnly
                                className="w-16 sm:w-20 bg-slate-300 border-y-2 border-l-2 border-black px-2 py-1 text-xs font-bold text-slate-500 cursor-not-allowed text-center"
                            />
                            <input 
                                type="password" 
                                value={loginPass}
                                onChange={(e) => setLoginPass(e.target.value)}
                                placeholder="Password"
                                className="w-24 sm:w-32 bg-white border-2 border-black px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:font-normal"
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>
                        <button 
                            onClick={handleLogin}
                            className="bg-black text-white px-3 py-1.5 text-xs font-bold uppercase border-2 border-black hover:bg-yellow-400 hover:text-black hover:border-black transition-colors"
                        >
                            Login
                        </button>
                      </div>
                  ) : (
                      <div className="flex items-center gap-4 px-2 py-0.5">
                          <span className="text-xs font-black text-black uppercase tracking-tight flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse border border-black"></span>
                              ADMIN
                          </span>
                          
                          <button 
                            onClick={handleDeleteAll}
                            className="text-[10px] font-bold bg-red-600 text-white px-2 py-1 border border-black hover:bg-red-700 transition-all"
                            title="Reset all images"
                          >
                             RESET
                          </button>

                          {/* SAVE PERUBAHAN BUTTON */}
                          <button 
                            onClick={handleSaveToCloud}
                            disabled={isSyncing}
                            className={`text-[10px] font-bold text-white px-2 py-1 border border-black hover:bg-blue-600 transition-all flex items-center gap-1 ${isSyncing ? 'bg-slate-400 cursor-wait' : 'bg-blue-500'}`}
                            title="Simpan data ke Firebase agar terlihat oleh semua orang"
                          >
                             {isSyncing ? 'SAVING...' : '💾 SAVE PERUBAHAN'}
                          </button>

                          <div className="h-4 w-0.5 bg-slate-300"></div>
                          <button 
                            onClick={handleLogout}
                            className="text-[10px] font-bold text-red-500 hover:bg-red-500 hover:text-white px-2 py-0.5 transition-all"
                          >
                            EXIT
                          </button>
                      </div>
                  )}
               </div>
           </div>

           {/* Analytics - Right */}
          <div className="hidden lg:flex items-center gap-4">
             <div className="flex items-center gap-2 text-xs font-bold border-2 border-black px-3 py-1 bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                ONLINE: {onlineUsers}
             </div>
             <div className="flex items-center gap-2 text-xs font-bold border-2 border-black px-3 py-1 bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                👁 VISITS: {totalVisits.toLocaleString()}
             </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="mb-16 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 w-full bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
                <div className="inline-block bg-yellow-300 border-2 border-black px-4 py-1 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-sm font-black uppercase tracking-widest">Digital Portfolio</h3>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black uppercase leading-[0.9] tracking-tighter mb-6">
                    50 Prompt Poster <br/>
                    <span className="text-stroke-2 text-transparent bg-clip-text bg-black">Nanobanana Pro</span>
                </h1>
                
                <div className="h-1 w-24 bg-black mx-auto mb-6"></div>

                <p className="text-slate-600 font-medium text-lg max-w-xl mx-auto leading-relaxed mb-8">
                   Kreasikan koleksi prompt disini sesuai kreatifitas kalian.
                   <br/>
                   <span className="text-xs bg-slate-200 px-2 py-1 mt-2 inline-block rounded-sm font-mono border border-slate-400">
                      IMAGES ARE PROTECTED & CANNOT BE DOWNLOADED
                   </span>
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <input 
                      type="file" 
                      ref={bulkInputRef}
                      onChange={handleBulkChange}
                      multiple 
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {/* ADD PHOTO BUTTON */}
                    <button 
                      onClick={handleBulkClick}
                      disabled={isProcessingBulk}
                      className={`group relative inline-flex items-center justify-center px-6 py-3 bg-black text-white font-bold uppercase tracking-widest border-2 border-transparent hover:bg-white hover:text-black hover:border-black transition-all shadow-[4px_4px_0px_0px_rgba(150,150,150,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isProcessingBulk ? 'cursor-wait opacity-50' : ''}`}
                    >
                      <span className="mr-2 text-xl">+</span>
                      {isProcessingBulk ? 'Processing...' : 'Add Photos'}
                    </button>
                </div>
            </div>

            <div className="w-full lg:w-72 bg-yellow-300 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                    <span className="text-2xl">⚡</span>
                    <h3 className="font-black uppercase text-xl tracking-tight leading-6">LINK AKSES NANO BANANA PRO</h3>
                </div>
                
                <ul className="space-y-3">
                    {EXTERNAL_LINKS.map((link) => (
                        <li key={link.name}>
                            <a 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block w-full bg-white border-2 border-black px-4 py-2 font-bold text-xs uppercase hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-between group"
                            >
                                {link.name}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {items.map((item) => (
            <PortfolioCard 
              key={item.id} 
              item={item} 
              onUpload={handleUpload}
              onClick={handleCardClick}
              onAuthCheck={handleAuthCheck}
            />
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t-4 border-black bg-white py-12 mt-12">
        <div className="container mx-auto px-4 text-center">
            <p className="mt-6 text-slate-500 text-xs font-mono">
                NANOBANANA PRO EXPERIENCE • v2.0.0 • KILAU AI
            </p>
        </div>
      </footer>

      {selectedItem && (
        <StoryModal 
          item={selectedItem} 
          parsedStory={getParsedStory(selectedItem.story)}
          onClose={handleCloseModal}
          onSave={(newStory) => handleUpdateItem(selectedItem.id, newStory)}
          onDelete={() => handleDeleteItem(selectedItem.id)}
          isAdmin={isLoggedIn}
        />
      )}
    </div>
  );
};

export default App;
