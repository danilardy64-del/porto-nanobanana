import React, { useRef } from 'react';
import { PortfolioItem } from '../types';

interface PortfolioCardProps {
  item: PortfolioItem;
  onUpload: (id: number, file: File) => void;
  onClick: (item: PortfolioItem) => void;
  onAuthCheck: () => boolean; // Added auth check prop
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ item, onUpload, onClick, onAuthCheck }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(item.id, e.target.files[0]);
    }
  };

  const handleClick = () => {
    if (item.imageData) {
      onClick(item);
    } else {
      // Security Check before opening file dialog
      if (onAuthCheck()) {
        fileInputRef.current?.click();
      }
    }
  };

  return (
    <div 
      className={`
        relative aspect-[3/4] cursor-pointer transition-all duration-200 group bg-white
        border-2 border-black
        ${item.imageData 
          ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1' 
          : 'border-dashed hover:border-solid hover:bg-yellow-50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}
      `}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        onClick={(e) => e.stopPropagation()} // Prevent double trigger
      />

      {/* Slot Number Tag - Industrial Style */}
      <div className="absolute top-0 left-0 z-20 bg-black text-white text-xs font-bold px-2 py-1 border-r-2 border-b-2 border-white">
        #{item.id.toString().padStart(2, '0')}
      </div>

      {item.imageData ? (
        <>
          <div className="w-full h-full relative overflow-hidden">
             <img 
               src={item.imageData} 
               alt={`Slot ${item.id}`} 
               // REVISI: Default berwarna (grayscale-0), Hover jadi abu-abu (grayscale)
               className="w-full h-full object-cover grayscale-0 group-hover:grayscale transition-all duration-300"
             />
             {/* Halftone pattern overlay effect */}
             <div className="absolute inset-0 bg-[radial-gradient(circle,#000_1px,transparent_1px)] bg-[size:4px_4px] opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-black p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <p className="text-black text-xs font-bold uppercase truncate">
              {item.isLoading ? "PROCESSING..." : "KLIK UNTUK PROMPTNYA"}
            </p>
          </div>

          {item.isLoading && (
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center border-2 border-black m-2">
               <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
               <span className="mt-2 text-xs font-bold font-mono">LOADING</span>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-black group-hover:text-black transition-colors p-4 text-center">
          <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center mb-2 bg-yellow-300 group-hover:scale-110 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
             <span className="text-2xl font-bold">+</span>
          </div>
          <span className="text-sm font-bold uppercase tracking-wide">Upload</span>
          <span className="text-[10px] bg-black text-white px-1 mt-1 font-mono">OWNER ONLY</span>
        </div>
      )}
    </div>
  );
};