import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PortfolioItem, StoryResponse } from './types';
import { PortfolioCard } from './components/PortfolioCard';
import { StoryModal } from './components/StoryModal';
import { GeneratorModal } from './components/GeneratorModal';
import { generateStoryFromImage } from './services/geminiService';
import { savePortfolioToDB, loadPortfolioFromDB } from './utils/storage';

const TOTAL_SLOTS = 50;
const OWNER_PASSWORD = "@Hilo123";

const App: React.FC = () => {
  // Initialize 50 empty slots initially
  const [items, setItems] = useState<PortfolioItem[]>(() => 
    Array.from({ length: TOTAL_SLOTS }, (_, i) => ({
      id: i + 1,
      imageData: null,
      story: null,
      isLoading: false,
      error: null
    }))
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("admin");
  const [loginPass, setLoginPass] = useState("");

  const bulkInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Data from IndexedDB on Mount
  useEffect(() => {
    const initData = async () => {
        const storedItems = await loadPortfolioFromDB();
        if (storedItems && storedItems.length > 0) {
            // Merge stored items with default structure to ensure 50 slots
            const mergedItems = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
                const found = storedItems.find(item => item.id === (i + 1));
                return found || {
                    id: i + 1,
                    imageData: null,
                    story: null,
                    isLoading: false,
                    error: null
                };
            });
            setItems(mergedItems);
        }
        setIsLoaded(true);
    };
    initData();
  }, []);

  // 2. Save Data to IndexedDB whenever items change
  useEffect(() => {
    if (isLoaded) {
        // Debounce slightly or just save (IDB is async so it's relatively non-blocking)
        const timeout = setTimeout(() => {
            savePortfolioToDB(items);
        }, 500);
        return () => clearTimeout(timeout);
    }
  }, [items, isLoaded]);

  // Fake Analytics Logic
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

  // Login Logic
  const handleLogin = () => {
    if (loginUser === "admin" && loginPass === OWNER_PASSWORD) {
        setIsLoggedIn(true);
        setLoginPass(""); // Clear password for security
    } else {
        alert("Password Salah! Akses Ditolak.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginPass("");
  };

  // Security Logic
  const handleAuthCheck = (): boolean => {
    if (isLoggedIn) {
        return true;
    } else {
        alert("Akses Ditolak. Silakan Login sebagai Admin di kolom Header (Atas) terlebih dahulu.");
        return false;
    }
  };

  // Core logic to process a single file upload - Refactored to be Promise-based
  const processSlotUpload = async (id: number, file: File, openModal: boolean = false) => {
    // 1. Read File to Base64
    const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
      
    // 2. Update state to show image and loading status
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, imageData: base64String, isLoading: true, error: null } 
        : item
    ));

    if (openModal) {
        setSelectedItem({ 
            id, 
            imageData: base64String, 
            story: null, 
            isLoading: true, 
            error: null 
        });
    }

    // 3. Call API
    try {
      const storyData = await generateStoryFromImage(base64String);
      const storyJson = JSON.stringify(storyData);
      
      setItems(prev => prev.map(item => 
        item.id === id 
          ? { ...item, story: storyJson, isLoading: false } 
          : item
      ));

      if (openModal) {
            setSelectedItem(prev => 
              prev && prev.id === id 
              ? { ...prev, story: storyJson, isLoading: false } 
              : prev
          );
      }

    } catch (error: any) {
      const errorMsg = error.message || "Failed to analyze";
      setItems(prev => prev.map(item => 
        item.id === id 
          ? { ...item, isLoading: false, error: errorMsg } 
          : item
      ));
        if (openModal) {
          setSelectedItem(prev => 
              prev && prev.id === id 
              ? { ...prev, isLoading: false, error: errorMsg } 
              : prev
          );
        }
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
        alert("All slots are full! Delete some images to upload more.");
        return;
      }

      setIsProcessingBulk(true);
      const filesToProcess = files.slice(0, emptySlots.length);
      
      // Sequential processing with delay to respect rate limits
      for (let i = 0; i < filesToProcess.length; i++) {
          const file = filesToProcess[i];
          const slotId = emptySlots[i].id;
          
          await processSlotUpload(slotId, file, false);
          
          // Add a 5-second delay between requests to avoid Rate Limit (429)
          if (i < filesToProcess.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 5000));
          }
      }

      setIsProcessingBulk(false);

      if (files.length > emptySlots.length) {
         alert(`Uploaded ${emptySlots.length} images. ${files.length - emptySlots.length} images were skipped.`);
      }
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
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
             backgroundSize: '24px 24px' 
           }}>
      </div>
      
      {/* Minimal Sticky Header */}
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
                                title="Username automatically set to admin"
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
                              ADMIN ACCESS UNLOCKED
                          </span>
                          <div className="h-4 w-0.5 bg-slate-300"></div>
                          <button 
                            onClick={handleLogout}
                            className="text-[10px] font-bold text-red-500 hover:bg-red-500 hover:text-white px-2 py-0.5 transition-all"
                          >
                            LOGOUT
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="mb-16 max-w-3xl mx-auto text-center">
            <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-1 transition-transform hover:rotate-0">
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
                    <button 
                    onClick={handleBulkClick}
                    disabled={isProcessingBulk}
                    className={`group relative inline-flex items-center justify-center px-6 py-3 bg-black text-white font-bold uppercase tracking-widest border-2 border-transparent hover:bg-white hover:text-black hover:border-black transition-all shadow-[4px_4px_0px_0px_rgba(150,150,150,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isProcessingBulk ? 'cursor-wait opacity-50' : ''}`}
                    >
                    <span className="mr-2 text-xl">+</span>
                    {isProcessingBulk ? 'Uploading Sequentially...' : 'Add Photos'}
                    </button>

                    <button 
                    onClick={() => setShowGenerator(true)}
                    className="group relative inline-flex items-center justify-center px-6 py-3 bg-yellow-400 text-black font-bold uppercase tracking-widest border-2 border-black hover:bg-yellow-300 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                    >
                    <span className="mr-2 text-xl">✨</span>
                    Try Generate Img
                    </button>
                </div>
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

      {showGenerator && (
        <GeneratorModal onClose={() => setShowGenerator(false)} />
      )}
    </div>
  );
};

export default App;