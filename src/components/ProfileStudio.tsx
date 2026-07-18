import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Copy, Check, FileText, Eye } from 'lucide-react';

interface CoderClass {
  id: string;
  name: string;
  perks: string;
  emoji: string;
}

const CLASSES: CoderClass[] = [
  { id: 'necro', name: 'Backend Engineer', perks: 'Expert in APIs, SQL Optimization, NodeJS', emoji: '⚙️' },
  { id: 'warlord', name: 'Full Stack Developer', perks: 'Expert in React, TypeScript, scalable apps', emoji: '💻' },
  { id: 'paladin', name: 'Security Specialist', perks: 'Expert in TLS, Web Guardrails, Cloud Security', emoji: '🛡️' },
  { id: 'lich', name: 'Database Administrator', perks: 'Expert in Postgres, Complex Indexes, Drizzle', emoji: '📊' }
];

export const ProfileStudio = () => {
  const [handle, setHandle] = useState('DEVELOPER');
  const [tagline, setTagline] = useState('Building modern, accessible full-stack applications.');
  const [selectedClass, setSelectedClass] = useState(CLASSES[1]);
  const [bannerColor, setBannerColor] = useState('YELLOW');
  const [skillsText, setSkillsText] = useState('React, TS, Node, Rust, Postgres');
  const [copied, setCopied] = useState(false);

  // Derive Markdown snippet representable
  const markdownTemplate = `### 👋 HELLO WORLD, I AM @${handle.toUpperCase()}

> **${selectedClass.name.toUpperCase()}** - *${selectedClass.perks}*

\`\`\`yaml
# PROFILE DETAILS
CLASS: ${selectedClass.name}
PERKS: ${selectedClass.perks}
TAGLINE: "${tagline}"
SPECIALTIES: [${skillsText.split(',').map(s => s.trim()).join(', ')}]
STATUS: ACTIVE
\`\`\`

---

#### ⚡ My Active Focus
- 🏎️ Building fast, performant APIs and database layers.
- 🧬 Creating highly responsive, accessible React interfaces.
- 📦 Designing highly maintainable codebases and server setups.

---
*README generated via AI Assistant Profile Studio.*`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdownTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col h-full">
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5">
          <Sparkles size={12} />
          GitHub Studio Builder
        </h3>
        <span className="px-1.5 py-0.5 text-[8px] font-mono bg-black text-[#facc15] font-black border border-black">
          STUDIO: ONLINE
        </span>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {/* Profile Details Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <label className="text-[8px] font-mono text-zinc-500 uppercase font-black mb-1">GH Handle</label>
            <input 
              type="text" 
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="bg-black border-2 border-zinc-700 text-xs px-2 py-1.5 outline-none font-mono text-white focus:border-[#facc15]"
              placeholder="Handle name"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[8px] font-mono text-zinc-500 uppercase font-black mb-1">Primary Specialties</label>
            <input 
              type="text" 
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="bg-black border-2 border-zinc-700 text-xs px-2 py-1.5 outline-none font-mono text-white focus:border-[#facc15]"
              placeholder="React, Node..."
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-[8px] font-mono text-zinc-500 uppercase font-black mb-1">Status Quote</label>
          <input 
            type="text" 
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full bg-black border-2 border-zinc-700 text-xs px-2 py-1.5 outline-none font-mono text-white focus:border-[#facc15]"
          />
        </div>

        {/* Specialty Class pickers */}
        <div>
          <label className="text-[8px] font-mono text-zinc-500 uppercase font-black mb-1 block">Specialty Class</label>
          <div className="grid grid-cols-2 gap-1.5">
            {CLASSES.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`border text-[9px] p-1 font-mono font-black uppercase flex items-center gap-1 cursor-pointer transition-all active:translate-y-0.5 ${
                  selectedClass.id === cls.id 
                    ? 'bg-[#facc15] text-black border-black shadow-[1px_1px_0px_0px_#000]' 
                    : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span>{cls.emoji}</span>
                <span className="truncate">{cls.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Card Preview Box */}
        <div className="bg-black border-2 border-zinc-900 p-3 mt-1 relative select-none">
          {/* Decal label */}
          <div className="absolute top-1 right-2 text-[7px] font-mono text-zinc-650 flex items-center gap-1 uppercase">
            <Eye size={8} /> Studio Live Mode
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#18181b] border-2 border-zinc-700 flex items-center justify-center text-lg font-black font-mono">
              {selectedClass.emoji}
            </div>
            <div className="min-w-0">
              <div className="text-white font-mono text-xs font-black truncate uppercase">
                @{handle}
              </div>
              <div className="text-[#facc15] font-mono text-[9px] font-bold uppercase truncate">
                {selectedClass.name}
              </div>
            </div>
          </div>
          <p className="text-[9px] text-zinc-400 font-mono tracking-tight leading-snug mt-2 pt-1.5 border-t border-zinc-900 truncate max-w-[280px]">
            "{tagline}"
          </p>
          <div className="flex gap-1.5 mt-2 overflow-hidden truncate">
            {skillsText.split(',').slice(0, 4).map((s, idx) => (
              <span key={idx} className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 text-[7px] text-cyan-400 font-mono font-black uppercase">
                {s.trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Action outputs */}
        <div className="mt-2.5">
          <button
            onClick={copyToClipboard}
            className="w-full py-2.5 bg-[#facc15] text-black font-black text-xs font-mono uppercase border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:bg-yellow-400 transition-all active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check size={14} /> MARKDOWN COPIED!
              </>
            ) : (
              <>
                <Copy size={14} /> COPY GITHUB MARKDOWN
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
