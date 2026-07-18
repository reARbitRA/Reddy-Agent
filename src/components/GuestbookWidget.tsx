import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Send, MessageSquare, Award } from 'lucide-react';

interface Entry {
  id: string;
  name: string;
  role: string;
  message: string;
  timestamp: string;
}

// TODO: Migrate static local storage signatures to a cloud Firestore persist database
const DEFAULT_ENTRIES: Entry[] = [
  { id: '1', name: 'ALEX_M', role: 'DEVELOPER', message: 'Awesome workspace! The retro design is super pleasant and responsive.', timestamp: '22:45' },
  { id: '2', name: 'SARAH_K', role: 'DESIGNER', message: 'Stunning layout and great typography choice here. Good job!', timestamp: '14:20' },
  { id: '3', name: 'MARCUS_V', role: 'HOBBYIST', message: 'Really nice interactive widgets, loving the music player and arcade games.', timestamp: '09:05' }
];

export const GuestbookWidget = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('DEVELOPER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    // Attempt local storage load
    const saved = localStorage.getItem('guestbook_signatures');
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        setEntries(DEFAULT_ENTRIES);
      }
    } else {
      setEntries(DEFAULT_ENTRIES);
      localStorage.setItem('guestbook_signatures', JSON.stringify(DEFAULT_ENTRIES));
    }
  }, []);

  const saveEntries = (updated: Entry[]) => {
    setEntries(updated);
    localStorage.setItem('guestbook_signatures', JSON.stringify(updated));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      const newEntry: Entry = {
        id: Date.now().toString(),
        name: name.trim().toUpperCase(),
        role: role.toUpperCase(),
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      };

      const updated = [newEntry, ...entries];
      saveEntries(updated);
      
      setName('');
      setMessage('');
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className={`bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col h-full ${shake ? 'animate-bounce' : ''}`}>
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5">
          <Terminal size={12} />
          Sign Guestbook
        </h3>
        <span className="px-1.5 py-0.5 text-[8px] font-mono bg-black text-cyan-400 font-black border border-black animate-pulse">
          STATUS: ONLINE
        </span>
      </div>

      {/* Inputs Form */}
      <form onSubmit={handleSubmit} className="space-y-2 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <label className="text-[8px] font-mono text-zinc-500 uppercase font-black mb-1">Name / Handle</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ALEX" 
              className="bg-black border-2 border-zinc-700 text-xs px-2 py-1.5 outline-none font-mono text-[#facc15] placeholder:text-zinc-700 focus:border-[#facc15]"
              maxLength={15}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[8px] font-mono text-zinc-500 uppercase font-black mb-1">Role</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-black border-2 border-zinc-700 text-xs px-1.5 py-1.5 outline-none font-mono text-cyan-400 cursor-pointer focus:border-cyan-400"
            >
              <option value="DEVELOPER">DEVELOPER</option>
              <option value="DESIGNER">DESIGNER</option>
              <option value="HOBBYIST">HOBBYIST</option>
              <option value="VISITOR">VISITOR</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-[8px] font-mono text-zinc-500 uppercase font-black mb-1">Your Message</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..." 
              className="flex-1 bg-black border-2 border-zinc-700 text-xs px-2 py-1.5 outline-none font-mono text-zinc-200 placeholder:text-zinc-700 focus:border-[#facc15]"
              maxLength={100}
            />
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-[#facc15] border-2 border-black p-2 font-black text-black text-xs hover:bg-yellow-400 active:translate-y-0.5 flex items-center justify-center shrink-0 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <Send size={12} />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Wall of Signatures */}
      <h4 className="text-[8px] font-mono font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2 border-t border-zinc-800 pt-2">
        <MessageSquare size={10} />
          Guestbook Entries Feed ({entries.length})
      </h4>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[220px] space-y-2">
        <AnimatePresence>
          {entries.map((item) => (
            <motion.div 
              key={item.id} 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-black border-2 border-zinc-800 p-2 relative flex flex-col hover:border-zinc-700"
            >
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white hover:text-yellow-400 cursor-pointer">
                    {item.name}
                  </span>
                  <span className={`px-1 text-[7px] font-mono font-bold leading-normal border truncate ${
                    item.role === 'DEVELOPER' ? 'bg-zinc-500/10 text-cyan-400 border-cyan-400/20' :
                    item.role === 'DESIGNER' ? 'bg-zinc-500/10 text-emerald-400 border-emerald-400/20' :
                    item.role === 'VISITOR' ? 'bg-zinc-500/10 text-red-400 border-red-400/20' :
                    'bg-zinc-500/10 text-orange-400 border-orange-400/20'
                  }`}>
                    {item.role}
                  </span>
                </div>
                <span className="text-[8px] font-mono text-zinc-600">
                  {item.timestamp}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 font-mono tracking-tight leading-normal">
                {item.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
