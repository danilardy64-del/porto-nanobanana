
import React, { useState } from 'react';
import { saveFirebaseConfig } from '../src/firebase';

export const FirebaseSetup: React.FC = () => {
  const [configInput, setConfigInput] = useState('');

  const handleSave = () => {
    saveFirebaseConfig(configInput);
  };

  return (
    <div className="min-h-screen bg-black text-yellow-400 flex flex-col items-center justify-center p-6 font-mono">
      <div className="max-w-3xl w-full border-4 border-yellow-400 p-8 shadow-[8px_8px_0px_0px_#ffffff]">
        <h1 className="text-4xl font-black mb-6 uppercase border-b-4 border-yellow-400 pb-4">
          ⚠️ SYSTEM SETUP REQUIRED
        </h1>
        
        <p className="mb-4 text-white font-bold text-lg">
          Website ini membutuhkan koneksi Database (Firebase) agar foto bisa tersimpan Online dan muncul di Netlify.
        </p>

        <ol className="list-decimal list-inside mb-8 text-slate-300 space-y-2 text-sm border border-yellow-400/30 p-4">
          <li>Buka <a href="https://console.firebase.google.com" target="_blank" className="text-yellow-400 underline hover:text-white">Firebase Console</a>.</li>
          <li>Buat Project Baru / Pilih Project yang ada.</li>
          <li>Masuk ke <strong>Project Settings</strong> (Ikon Gear).</li>
          <li>Scroll ke bawah ke bagian "SDK Setup and Configuration".</li>
          <li>Pilih opsi <strong>Config</strong> (bukan CDN).</li>
          <li>Copy teks yang ada di dalam kurung kurawal <code>{`{ ... }`}</code>.</li>
        </ol>

        <textarea
          value={configInput}
          onChange={(e) => setConfigInput(e.target.value)}
          placeholder={`Paste kode Firebase Config disini...\nContoh:\n{\n  "apiKey": "AIzaSy...",\n  "authDomain": "...",\n  "projectId": "..."\n}`}
          className="w-full h-64 bg-slate-900 border-2 border-yellow-400 text-white p-4 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-white mb-6 resize-none"
        />

        <button
          onClick={handleSave}
          className="w-full bg-yellow-400 text-black font-black text-xl py-4 uppercase border-2 border-white hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_#ffffff] active:translate-y-1 active:shadow-none"
        >
          SAVE CONFIGURATION & START SYSTEM
        </button>
      </div>
    </div>
  );
};
