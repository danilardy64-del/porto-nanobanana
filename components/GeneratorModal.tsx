import React, { useState, useRef } from 'react';
import { generateImageWithGemini } from '../services/geminiService';
import { GeneratorState } from '../types';

interface GeneratorModalProps {
  onClose: () => void;
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({ onClose }) => {
  const [state, setState] = useState<GeneratorState>({
    prompt: "A futuristic portrait of [Subject] wearing a neon industrial jacket...",
    aspectRatio: "1:1",
    referenceImage: null,
    isGenerating: false,
    resultImage: null,
    error: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ ...prev, referenceImage: reader.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    // API Key Selection for gemini-3-pro-image-preview
    const aistudio = (window as any).aistudio;
    if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try {
                await aistudio.openSelectKey();
            } catch (e) {
                // User cancelled or error
                return;
            }
        }
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      const result = await generateImageWithGemini(state.prompt, state.aspectRatio, state.referenceImage);
      setState(prev => ({ ...prev, isGenerating: false, resultImage: result }));
    } catch (err: any) {
      // Check for "Requested entity was not found" to retry key selection
      if (err.message && err.message.includes("Requested entity was not found") && aistudio) {
         try {
             await aistudio.openSelectKey();
             // Inform user to try again
             setState(prev => ({ ...prev, isGenerating: false, error: "API Key updated. Please try again." }));
             return;
         } catch (e) {
             // ignore
         }
      }
      setState(prev => ({ ...prev, isGenerating: false, error: err.message }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-white border-4 border-black shadow-[16px_16px_0px_0px_#FFFF00] flex flex-col md:flex-row max-h-[90vh] overflow-hidden">
        
        {/* Controls Side */}
        <div className="w-full md:w-1/2 p-6 md:p-8 bg-slate-50 overflow-y-auto border-b-4 md:border-b-0 md:border-r-4 border-black">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-black uppercase">Try Generator</h2>
             <button onClick={onClose} className="hover:bg-black hover:text-white px-2 border-2 border-black font-bold">✕ ESC</button>
          </div>

          <div className="space-y-6">
            {/* Reference Image */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase bg-black text-white px-2 py-1">1. Reference Face/Style</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-black h-32 flex items-center justify-center hover:bg-yellow-100 transition-colors relative overflow-hidden group"
              >
                {state.referenceImage ? (
                  <img src={state.referenceImage} alt="Ref" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <span className="text-sm font-bold text-slate-400">CLICK TO UPLOAD REFERENCE</span>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
               <label className="text-xs font-bold uppercase bg-black text-white px-2 py-1">2. Prompt</label>
               <textarea 
                 value={state.prompt}
                 onChange={(e) => setState(prev => ({ ...prev, prompt: e.target.value }))}
                 className="w-full h-32 border-2 border-black p-3 font-mono text-sm focus:ring-4 focus:ring-yellow-300 focus:outline-none"
                 placeholder="Describe the image..."
               />
            </div>

            {/* Ratio */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase bg-black text-white px-2 py-1">3. Aspect Ratio</label>
                <div className="grid grid-cols-5 gap-2">
                    {["1:1", "16:9", "9:16", "4:3", "3:4"].map((ratio) => (
                        <button
                            key={ratio}
                            onClick={() => setState(prev => ({ ...prev, aspectRatio: ratio as any }))}
                            className={`border-2 border-black text-xs font-bold py-2 ${state.aspectRatio === ratio ? 'bg-black text-white' : 'bg-white hover:bg-slate-200'}`}
                        >
                            {ratio}
                        </button>
                    ))}
                </div>
            </div>

            {/* Generate Button */}
            <button 
                onClick={handleGenerate}
                disabled={state.isGenerating}
                className={`w-full py-4 border-2 border-black font-black uppercase text-xl shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all ${state.isGenerating ? 'bg-slate-300 cursor-wait' : 'bg-yellow-400 hover:bg-yellow-300'}`}
            >
                {state.isGenerating ? 'GENERATING...' : 'RUN GENERATION'}
            </button>

            {state.error && (
                <div className="p-3 bg-red-100 border-2 border-red-500 text-red-700 text-xs font-bold">
                    {state.error}
                </div>
            )}
          </div>
        </div>

        {/* Preview Side */}
        <div className="w-full md:w-1/2 bg-black/5 p-6 md:p-8 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] bg-[size:16px_16px] opacity-10 pointer-events-none"></div>
            
            {state.resultImage ? (
                <div className="relative border-4 border-white shadow-xl max-h-full max-w-full">
                    <img src={state.resultImage} alt="Generated" className="max-h-[60vh] object-contain" />
                    <a 
                        href={state.resultImage} 
                        download="kilau-generated.png" 
                        className="absolute bottom-4 right-4 bg-black text-white px-4 py-2 text-xs font-bold uppercase hover:bg-yellow-400 hover:text-black border-2 border-white"
                    >
                        Download
                    </a>
                </div>
            ) : (
                <div className="text-center text-slate-400 font-mono">
                    <div className="text-6xl mb-4 opacity-20">?</div>
                    <p>RESULT WILL APPEAR HERE</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};