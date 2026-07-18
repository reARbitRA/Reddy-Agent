import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ShieldCheck, ShieldAlert, KeyRound, Lock, Zap } from 'lucide-react';

export const KeyDeck = () => {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'valid' | 'invalid'>('idle');
  const [showKey, setShowKey] = useState(false);
  const [activeKeySource, setActiveKeySource] = useState<string>('Detecting...');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/keys/status');
      const data = await res.json();
      setActiveKeySource(data.source || 'Unknown');
    } catch (e) {
      console.warn("Failed to fetch key status:", e);
    }
  };

  const validateAndSave = async () => {
    if (!key.trim()) return;
    setStatus('scanning');
    
    try {
      const res = await fetch('/api/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      
      if (data.valid) {
        setStatus('valid');
        await fetch('/api/keys/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });
        setTimeout(() => {
          setKey('');
          setStatus('idle');
          fetchStatus();
        }, 2000);
      } else {
        setStatus('invalid');
      }
    } catch (e) {
      setStatus('invalid');
    }
  };

  return (
    <div 
      className="bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000000] relative overflow-hidden flex flex-col h-full"
    >
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5">
          <KeyRound size={12} />
          Gemini API Key Setup
        </h3>
        <div className="flex items-center gap-2">
           <span className="text-[8px] font-mono text-zinc-500 uppercase font-black">Status:</span>
           <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-tighter">{activeKeySource}</span>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-center gap-4">
        <div className="relative flex items-center">
          <div className="absolute left-3 text-zinc-500">
            <Lock size={12} />
          </div>
          <input 
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter Gemini API key (optional)..."
            className="w-full bg-black border-2 border-zinc-700 py-2.5 pl-8 pr-9 text-xs font-mono text-cyan-400 placeholder:text-zinc-800 outline-none focus:border-[#facc15] select-text"
          />
          <button 
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 text-zinc-500 hover:text-white cursor-pointer"
          >
            {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>

        <button 
          onClick={validateAndSave}
          disabled={status === 'scanning' || !key.trim()}
          className={`w-full py-2.5 font-mono font-black text-xs uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer transition-all active:translate-y-0.5 disabled:opacity-30 ${
            status === 'scanning' ? 'bg-zinc-800 text-zinc-500' :
            status === 'valid' ? 'bg-emerald-500 text-black font-black' :
            status === 'invalid' ? 'bg-red-500 text-black font-black' :
            'bg-[#facc15] text-black hover:bg-yellow-400'
          }`}
        >
          {status === 'idle' && <span className="flex items-center justify-center gap-1.5"><Zap size={12} /> SAVE API KEY</span>}
          {status === 'scanning' && 'Validating Key...'}
          {status === 'valid' && 'Key Verified & Set'}
          {status === 'invalid' && 'Invalid Key / Reset'}
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 transition-all duration-300 ${
            activeKeySource === 'Detecting...' ? 'bg-zinc-800' : 
            status === 'invalid' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
          }`} />
          <div className="flex flex-col">
            <span className="text-[7px] font-mono font-bold text-zinc-500 uppercase tracking-wider leading-none">Authentication Engine</span>
            <span className="text-[9px] font-mono text-zinc-300 uppercase leading-snug mt-0.5">
              {status === 'idle' ? 'Awaiting inputs' : status === 'scanning' ? 'Processing key...' : status === 'invalid' ? 'Disconnected / Invalid' : 'Connection Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
