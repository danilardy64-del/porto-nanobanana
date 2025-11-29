import React, { useEffect, useState } from 'react';
import { PortfolioItem, StoryResponse } from '../types';

interface StoryModalProps {
  item: PortfolioItem | null;
  parsedStory: StoryResponse | null;
  onClose: () => void;
  onSave: (newStory: StoryResponse) => void;
  onDelete: () => void;
  isAdmin: boolean;
}

export const StoryModal: React.FC<StoryModalProps> = ({ item, parsedStory, onClose, onSave, onDelete, isAdmin }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStory, setEditStory] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Sync state when props change
  useEffect(() => {
    if (parsedStory) {
      setEditTitle(parsedStory.title);
      setEditStory(parsedStory.story);
      
      // AUTO-EDIT: If this is a new upload (default title) and user is admin, enter edit mode automatically
      if (parsedStory.title === "JUDUL BARU" && isAdmin) {
          setIsEditing(true);
      }
    } else {
      setEditTitle('');
      setEditStory('');
    }
  }, [parsedStory, isAdmin]);

  // Reset delete confirmation when modal opens/closes
  useEffect(() => {
    setDeleteConfirm(false);
  }, [item]);

  const handleSave = () => {
    onSave({
      title: editTitle,
      story: editStory
    });
    setIsEditing(false);
  };

  const handleCopy = () => {
    if (parsedStory?.story) {
      navigator.clipboard.writeText(parsedStory.story);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleDeleteClick = () => {
    if (deleteConfirm) {
      onDelete();
    } else {
      setDeleteConfirm(true);
      // Auto-reset confirmation after 3 seconds if not clicked
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop with dot pattern */}
      <div 
        className="absolute inset-0 bg-yellow-500/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Content Container - Neo-Brutalist Box */}
      <div className="relative w-full max-w-6xl bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row h-[85vh] md:h-[80vh] overflow-hidden">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 bg-white border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image Section - PROTECTED (No Right Click, No Drag) */}
        <div 
            className="w-full md:w-1/2 h-1/2 md:h-full bg-slate-100 border-b-4 md:border-b-0 md:border-r-4 border-black flex items-center justify-center relative p-8 select-none"
            onContextMenu={(e) => e.preventDefault()}
        >
           <div className="absolute inset-0 bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_50%,#000_50%,#000_75%,transparent_75%,transparent)] bg-[length:24px_24px] opacity-5"></div>
           
           {item.imageData && (
             <div className="relative border-2 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-1 group">
                <img 
                    src={item.imageData} 
                    alt="Portfolio Detail" 
                    className="w-full h-full object-contain max-h-[60vh] pointer-events-none"
                    draggable="false"
                />
                {/* Overlay to further prevent interaction/screenshooting context */}
                <div className="absolute inset-0 z-10 opacity-0" onContextMenu={(e) => e.preventDefault()}></div>
             </div>
           )}
           
           <div className="absolute bottom-4 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 border border-black shadow-[2px_2px_0px_0px_white]">
               DO NOT COPY IMAGE
           </div>
        </div>

        {/* Story/Prompt Section */}
        <div className="w-full md:w-1/2 flex flex-col h-1/2 md:h-full bg-white relative">
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
                {item.isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
                    <div className="w-16 h-16 border-8 border-black border-t-yellow-400 rounded-full animate-spin"></div>
                    <div>
                        <p className="text-black text-xl font-bold uppercase tracking-wider">Analyzing Visuals</p>
                        <p className="text-slate-500 font-mono text-sm mt-2">...generating prompt...</p>
                    </div>
                    </div>
                ) : item.error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="text-black bg-red-100 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <h3 className="text-xl font-bold uppercase">Error</h3>
                        </div>
                        <p className="text-slate-600 font-mono">{item.error}</p>
                    </div>
                ) : parsedStory ? (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="inline-block px-3 py-1 bg-black text-white text-xs font-bold uppercase border border-black shadow-[2px_2px_0px_0px_rgba(250,204,21,1)]">
                            Slot #{item.id}
                            </span>
                            <span className="inline-block px-3 py-1 bg-yellow-300 text-black text-xs font-bold uppercase border border-black">
                                {isEditing ? 'Editing Mode' : 'Prompt Detail'}
                            </span>
                        </div>

                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Title</label>
                                    <input 
                                        type="text" 
                                        value={editTitle} 
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full border-2 border-black p-2 font-bold text-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Prompt / Description</label>
                                    <textarea 
                                        value={editStory}
                                        onChange={(e) => setEditStory(e.target.value)}
                                        className="w-full h-64 border-2 border-black p-3 font-medium text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-slate-50 resize-none"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-3xl md:text-5xl font-black text-black leading-[0.9] uppercase tracking-tighter break-words">
                                    {parsedStory.title}
                                </h2>
                                <div className="w-full h-2 bg-black pattern-diagonal-lines-sm text-yellow-300"></div>
                                <div className="prose prose-lg text-slate-800 leading-relaxed font-medium">
                                    {parsedStory.story.split('\n').map((paragraph, idx) => (
                                        <p key={idx} className="mb-4">{paragraph}</p>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono">
                         <p>[NO PROMPT DATA]</p>
                         {isAdmin && (
                            <button 
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditTitle("New Title");
                                    setEditStory("Write your prompt here...");
                                }}
                                className="mt-4 text-xs underline hover:text-black"
                            >
                                Create Manually
                            </button>
                         )}
                    </div>
                )}
            </div>

            {/* Footer Action Bar */}
            <div className="border-t-4 border-black p-4 md:p-6 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
                {!item.isLoading && (
                    <>
                        {isEditing ? (
                             <div className="flex gap-4 w-full md:w-auto">
                                <button 
                                    onClick={handleSave}
                                    className="flex-1 md:flex-none px-6 py-3 bg-green-500 text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all uppercase"
                                >
                                    Save Changes
                                </button>
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 md:flex-none px-6 py-3 bg-white text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all uppercase"
                                >
                                    Cancel
                                </button>
                             </div>
                        ) : (
                            <div className="flex gap-4 w-full">
                                <button 
                                    onClick={handleCopy}
                                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all uppercase ${copyFeedback ? 'bg-green-400 text-black' : 'bg-yellow-300 text-black'}`}
                                >
                                    {copyFeedback ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            COPIED!
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                            COPY PROMPT
                                        </>
                                    )}
                                </button>
                                
                                {isAdmin && (
                                    <>
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-3 bg-white text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                                            title="Edit Prompt Description"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>

                                        <button 
                                            onClick={handleDeleteClick}
                                            className={`px-4 py-3 font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all uppercase ${deleteConfirm ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}
                                            title="Delete Image (Admin Only)"
                                        >
                                            {deleteConfirm ? "CONFIRM?" : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};