import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SquareTerminal, 
  Send, 
  Settings, 
  Activity, 
  FolderClosed, 
  ShieldAlert, 
  HelpCircle,
  HelpCircle as QuestionIcon,
  ChevronDown,
  Sparkles,
  Zap,
  Cpu,
  Tv,
  AlertTriangle,
  Play,
  Volume2,
  RefreshCw,
  Copy,
  Check,
  Download,
  Terminal,
  MessagesSquare,
  Mic,
  MicOff
} from 'lucide-react';

// Custom Widget Imports
import { SunoWidget } from './components/SunoWidget';
import { GuestbookWidget } from './components/GuestbookWidget';
import { TechStackGrid } from './components/TechStackGrid';
import { SystemStatusMonitor } from './components/SystemStatusMonitor';
import { ArcadeCabinetWidget } from './components/ArcadeCabinetWidget';
import { ProfileStudio } from './components/ProfileStudio';
import { KeyDeck } from './components/KeyDeck';
import { KnowledgeVault } from './components/KnowledgeVault';
import { TaskTracker } from './components/TaskTracker';
import { WorkspaceWidget } from './components/WorkspaceWidget';

interface LogEntry {
  id: string;
  timestamp: string;
  fullTimestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
  reaction?: 'useful' | 'incorrect';
}

// --- Neo-Brutalist Custom Target Cursor ---
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const onMouseOver = (e: MouseEvent) => {
      if (!e.target) return;
      const target = e.target as HTMLElement;
      const tagName = target.tagName || '';
      const isClickable = 
        tagName === 'BUTTON' || 
        tagName === 'A' || 
        tagName === 'INPUT' || 
        tagName === 'SELECT' || 
        tagName === 'TEXTAREA' || 
        (typeof target.closest === 'function' && (target.closest('button') || target.closest('a')));
        
      setIsHovering(!!isClickable);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
    };
  }, []);

  return (
    <div className="hidden lg:block pointer-events-none z-[9999] fixed top-0 left-0">
      <div 
        className="w-5 h-5 border-2 border-[#facc15] bg-black/40 transition-transform duration-100 ease-out"
        style={{ 
          transform: `translate(${position.x - 10}px, ${position.y - 10}px) ${isHovering ? 'scale(1.5) rotate(45deg)' : 'scale(1)'}`,
          borderColor: isHovering ? '#facc15' : '#71717a'
        }}
      />
      <div 
        className="w-1.5 h-1.5 bg-[#facc15] absolute"
        style={{ transform: `translate(${position.x - 3}px, ${position.y - 3}px)` }}
      />
    </div>
  );
};

export default function App() {
  const [isLaunched, setIsLaunched] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(() => {
    return localStorage.getItem('reddy_system_instruction') || "You are REDDY, a helpful AI Assistant. You help users run tasks, answer questions, and manage knowledge.";
  });
  
  const [registeredSkills, setRegisteredSkills] = useState<string[]>([]);
  const [activeAuditItems, setActiveAuditItems] = useState<{ id: string; file: string; line: number; text: string; category: string; description: string }[] | null>(null);
  const [selectedAuditIds, setSelectedAuditIds] = useState<string[]>([]);
  const [isPurging, setIsPurging] = useState(false);
  
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('reddy_chat_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [
          { id: 'initial-1', timestamp: new Date().toLocaleTimeString(), fullTimestamp: new Date().toLocaleString(), message: 'REDDY AI ASSISTANT INITIALIZED: OK', type: 'success' },
          { id: 'initial-2', timestamp: new Date().toLocaleTimeString(), fullTimestamp: new Date().toLocaleString(), message: 'INGRESS PORT 3000 ROUTING STATUS: ACTIVE', type: 'info' },
        ];
      }
    }
    return [
      { id: 'initial-1', timestamp: new Date().toLocaleTimeString(), fullTimestamp: new Date().toLocaleString(), message: 'REDDY AI ASSISTANT INITIALIZED: OK', type: 'success' },
      { id: 'initial-2', timestamp: new Date().toLocaleTimeString(), fullTimestamp: new Date().toLocaleString(), message: 'INGRESS PORT 3000 ROUTING STATUS: ACTIVE', type: 'info' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('reddy_chat_logs', JSON.stringify(logs));
    localStorage.setItem('reddy_system_instruction', systemInstruction);
  }, [logs, systemInstruction]);

  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSkills();
    fetchSettings();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isProcessing]);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      setRegisteredSkills(data.skills || []);
    } catch (e) {
      console.warn("Failed to fetch skills:", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings?session_id=default');
      const data = await res.json();
      if (data.instruction) {
        setSystemInstruction(data.instruction);
      }
    } catch (e) {
      console.warn("Failed to fetch settings:", e);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'default', instruction: systemInstruction }),
      });
      addLog("Core Instruction Protocols Transmitted Successfully.", "success");
      setShowSettings(false);
    } catch (e: any) {
      addLog(`Failed to update system protocols: ${e.message}`, "error");
    }
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      timestamp: new Date().toLocaleTimeString(), 
      fullTimestamp: new Date().toLocaleString(),
      message, 
      type 
    }]);
  };

  const handleClearChat = () => {
    setLogs([
      { 
        id: Date.now().toString(), 
        timestamp: new Date().toLocaleTimeString(), 
        fullTimestamp: new Date().toLocaleString(),
        message: 'SYSTEM CACHE PURGED. TERMINAL READY.', 
        type: 'info' 
      }
    ]);
    
    // Audio purge sound
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('[reddy:audio] optional UI sound failed:', e);
    }
  };
  const handleReaction = (id: string, reaction: 'useful' | 'incorrect') => {
    setLogs(prev => prev.map(log => 
      log.id === id ? { ...log, reaction: log.reaction === reaction ? undefined : reaction } : log
    ));
    
    // Quick audio feedback
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(reaction === 'useful' ? 880 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('[reddy:audio] optional UI sound failed:', e);
    }
  };

  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addLog("Speech recognition not supported in this browser.", "error");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      addLog("VOICE_INPUT_READY: LISTENING...", "info");
      
      // Audio start beep
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } catch (e) {
        console.warn('[reddy:audio] optional UI sound failed:', e);
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(transcript);
      addLog(`VOICE_CAPTURED: "${transcript}"`, "success");
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
      addLog(`VOICE_ERROR: ${event.error}`, "error");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const triggerMockPurgeAudit = async () => {
    setIsProcessing(true);
    addLog("PROTOCOL 12: PRE-AUDIT SWEEP COMMENCING...", "warn");
    
    // Play alert sound
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('[reddy:audio] optional UI sound failed:', e);
    }

    try {
      const res = await fetch('/api/purge/audit');
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        setActiveAuditItems(data.results);
        setSelectedAuditIds(data.results.map((r: any) => r.id)); // default select all
        
        // Log results overview
        const summary = data.results.map((r: any) => `* [${r.category}] in ${r.file} at line ${r.line}: "${r.text.trim()}"`).join('\n');
        addLog(`MOCK_PURGE AUDIT REPORT COMPLETED:\nFound ${data.results.length} placeholder dependencies:\n${summary}\n\n[WARNING] Protocol 12 is paused and waiting for human clearance. Select items from the purge checklist.`, "warn");
      } else {
        addLog("PROTOCOL 12 COMPLETED: Zero mock placeholders, TODOs, or static hardcoded strings found. Workspace pristine.", "success");
      }
    } catch (e: any) {
      addLog(`AUDIT RUNTIME FATAL: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeMockPurge = async () => {
    if (!activeAuditItems || selectedAuditIds.length === 0) return;
    setIsPurging(true);
    addLog("INITIATING SYSTEM SANITIZATION PURGE PROTOCOL...", "warn");
    
    // Play sci-fi purge alarm
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      // Siren effect
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.3);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('[reddy:audio] optional UI sound failed:', e);
    }

    const selectedItems = activeAuditItems.filter(item => selectedAuditIds.includes(item.id));

    try {
      const res = await fetch('/api/purge/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems }),
      });
      const data = await res.json();
      
      if (data.status === "success") {
        addLog(`SANITY CHECKS COMPLETED: Purged ${selectedItems.length} mock dependencies!`, "success");
        data.purgedDetails.forEach((logStr: string) => {
          addLog(`» ${logStr}`, "info");
        });
        setActiveAuditItems(null);
      } else {
        throw new Error(data.error || "Execute failed");
      }
    } catch (e: any) {
      addLog(`PURGE SYSTEM CORRUPTION: ${e.message}`, "error");
    } finally {
      setIsPurging(false);
    }
  };

  const handleSend = async () => {
    if (!userInput.trim() || isProcessing) return;
    
    const message = userInput;
    setUserInput('');
    setIsProcessing(true);
    addLog(`USER COMMAND: ${message}`, 'info');

    // Intercept purge commands
    const cleanMessage = message.trim().toLowerCase();
    if (cleanMessage === '/purge' || cleanMessage === 'purge' || cleanMessage.includes('mock purge')) {
      setIsProcessing(false);
      triggerMockPurgeAudit();
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: 'default' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addLog(`REDDY: ${data.response}`, 'success');
    } catch (error: any) {
      addLog(`ERROR SIGNAL EXTRAPOLATION: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isLaunched) {
    return (
      <div className="min-h-screen bg-[#09090b] engineering-grid flex flex-col items-center justify-center p-6 lg:p-10 relative overflow-hidden select-none">
        <CustomCursor />
        {/* CRT glass monitor overlays */}
        <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20 z-0" />
        <div className="absolute inset-0 vignette-edges pointer-events-none z-0" />

        <div className="z-10 flex flex-col items-center justify-center text-center max-w-2xl w-full border-4 border-black bg-[#18181b] p-8 shadow-[8px_8px_0px_0px_#000000]">
          {/* Accent caution stripes decaling top of launch screen */}
          <div className="w-full h-4 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#facc15_10px,#facc15_20px)] border-b-4 border-black -mt-8 -mx-8 mb-6 shrink-0" />

          <h1 className="text-5xl md:text-7xl font-sans font-black text-red-505 text-red-500 tracking-tighter leading-none mb-2 uppercase select-none">
            REDDY
          </h1>
          <p className="font-mono text-zinc-500 text-[10px] tracking-[0.3em] font-black uppercase mb-6 border-b-2 border-zinc-800 pb-2.5 w-full">
            // COGNITIVE ASSISTANT WORKSPACE
          </p>

          <div className="bg-black border-2 border-zinc-850 p-4 font-mono text-left w-full space-y-2 text-zinc-300 select-text mb-6">
            <div className="text-[11px] text-[#facc15] font-black font-mono leading-none flex items-center gap-1.5 justify-between">
              <span>SYSTEM_LAUNCH_LOG</span>
              <span className="animate-pulse">ONLINE</span>
            </div>
            <div className="text-[11px] font-mono leading-relaxed space-y-1 mt-1">
              <div>CLUSTER_NODE: <span className="text-white">COGNITIVE_RESONATOR</span></div>
              <div>INGRESS_PORT: <span className="text-[#facc15]">3000 // ACTIVE</span></div>
              <div>PRIVACY: <span className="text-white">LOCAL DATA ENVELOPE HIGH</span></div>
            </div>
          </div>

          <button
            onClick={() => setIsLaunched(true)}
            className="w-full py-3 bg-[#facc15] text-black font-mono font-black border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:bg-yellow-400 transition-all active:translate-y-0.5 cursor-pointer text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Zap size={14} className="fill-current text-current" />
            INITIALIZE WORKSPACE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] engineering-grid text-[#f4f4f5] font-mono flex flex-col p-4 gap-4 overflow-y-auto relative select-none">
      <CustomCursor />
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-25 z-0" />
      <div className="absolute inset-0 vignette-edges pointer-events-none z-0" />

      {/* --- INDUSTRIAL TOP NAVIGATION ROW --- */}
      <header className="flex items-center justify-between border-4 border-black bg-[#18181b] px-4 py-2 shadow-[4px_4px_0px_0px_#000] z-45 relative shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black border-2 border-red-500 flex items-center justify-center text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M12 2v9" />
              <circle cx="8" cy="15" r="1.2" className="fill-current text-red-500" />
              <circle cx="16" cy="15" r="1.2" className="fill-current text-red-500" />
              <path d="M9 18h6" />
            </svg>
          </div>
          <h1 className="text-sm md:text-base font-sans font-black tracking-tight uppercase flex items-center gap-2">
            REDDY <span className="text-xs bg-red-500 text-white font-mono font-bold px-1.5 py-0.5 leading-none shadow-[0px_0px_8px_rgba(239,68,68,0.5)]">ASSISTANT</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-[9px] font-mono select-none">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-400 font-bold uppercase">ONLINE</span>
            </div>
            <div className="text-zinc-500 font-bold">PORT: 3000</div>
          </div>
          
          <button 
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-1 px-2.5 bg-black text-white hover:text-[#facc15] border-2 border-zinc-800 hover:border-[#facc15] text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all hover:shadow-[1px_1px_0px_0px_rgba(250,204,21,1)]"
          >
            <Settings size={12} /> SETTINGS
          </button>
        </div>
      </header>

      {/* Main Container Dashboard */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 z-40 relative min-h-0">
        
        {/* --- LEFT HAND SECTION: Profiles & Technical diagnostic matrices (4 columns) --- */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* GitHub dynamic profile README studio */}
          <div className="flex-1">
            <ProfileStudio />
          </div>

          {/* Connected skills technical proficiences */}
          <div className="flex-1">
            <TechStackGrid />
          </div>

          {/* Working Suno AI Audio Player Widget */}
          <div className="shrink-0">
            <SunoWidget />
          </div>

          {/* Secure Google Workspace (Sheets, Gmail, Docs) Integration Widget */}
          <div className="shrink-0">
            <WorkspaceWidget />
          </div>
        </div>

        {/* --- CENTRAL SECTION: Active virtual game engine & Cyber chat Core (5 columns) --- */}
        <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-4">
          
          {/* Integrated Mini-game virtual arcade cabinet screen */}
          <div className="flex-1 min-h-[350px]">
            <ArcadeCabinetWidget />
          </div>

          {/* REDDY chatbot interaction engine box */}
          <div className="flex-1 bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col min-h-[440px]">
            
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3 shrink-0">
              <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5">
                <SquareTerminal size={12} className="text-[#facc15]" />
                AI Chat Terminal
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClearChat}
                  className="px-1.5 py-0.5 text-[8px] font-mono bg-black text-red-400 border border-zinc-850 hover:bg-red-950/20 transition-colors uppercase leading-none select-none cursor-pointer"
                >
                  PURGE_LOGS
                </button>
                <button 
                  onClick={triggerMockPurgeAudit}
                  className="px-1.5 py-0.5 text-[8px] font-mono bg-black text-yellow-500 border border-zinc-850 hover:bg-yellow-950/20 transition-colors uppercase leading-none select-none cursor-pointer"
                >
                  MOCK_PURGE_SOLVER
                </button>
                <span className="px-1.5 py-0.5 text-[8px] font-mono bg-black text-cyan-400 border border-zinc-850 animate-pulse leading-none uppercase select-none">
                  STATUS: ONLINE
                </span>
                <span className="px-1.5 py-0.5 text-[8px] font-mono bg-[#facc15] text-black font-extrabold border border-black leading-none uppercase select-none">
                  CHAT_DECK
                </span>
              </div>
            </div>

            {/* --- REDDY PORTRAIT CRT MONITOR (ACTIVE FACIAL VISUALIZER) --- */}
            <div 
              onClick={() => {
                // Interactive reboot chirp on click
                try {
                  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                  const ctx = new AudioContextClass();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sawtooth';
                  osc.frequency.setValueAtTime(600, ctx.currentTime);
                  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
                  gain.gain.setValueAtTime(0.06, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.3);
                } catch (e) {
                  console.warn('[reddy:audio] optional UI sound failed:', e);
                }
                addLog("REDDY agent pinged manually.", "warn");
              }}
              className="mb-3 p-3 bg-black border-2 border-zinc-800 hover:border-red-500 relative overflow-hidden transition-all group cursor-pointer flex gap-4 select-none shadow-inner"
            >
              <div className="absolute top-0 right-0 h-2 w-2 bg-[repeating-linear-gradient(45deg,#000,#000_2px,#ef4444_2px,#ef4444_4px)]" />
              
              {/* Retro CRT Matrix Face grid */}
              <div className="w-14 h-14 bg-zinc-950 border border-zinc-805 shrink-0 flex items-center justify-center relative shadow-[inset_0px_0px_10px_rgba(239,68,68,0.4)]">
                {/* Scanline pattern overlay inside avatar */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_3px,_3px_100%] pointer-events-none" />
                
                {isProcessing ? (
                  // Thinking soundwave / radar visual in RED
                  <div className="flex gap-1 items-end h-8">
                    <span className="w-1.5 bg-red-500 animate-[pulse_0.4s_infinite] h-8" />
                    <span className="w-1.5 bg-red-500 animate-[pulse_0.3s_infinite_0.1s] h-5" />
                    <span className="w-1.5 bg-red-500 animate-[pulse_0.5s_infinite_0.2s] h-7" />
                    <span className="w-1.5 bg-red-500 animate-[pulse_0.3s_infinite_0.3s] h-4" />
                  </div>
                ) : (
                  // Idle sovereign AI cybernetic facial sensor - Cool Red Vector Icon
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.7)]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M12 2v9" />
                    <circle cx="8" cy="15" r="1.2" className="fill-current text-red-500" />
                    <circle cx="16" cy="15" r="1.2" className="fill-current text-red-500" />
                    <path d="M9 18h6" />
                  </svg>
                )}
              </div>
 
              {/* Bot Meta indicators right side */}
              <div className="flex-1 font-mono text-[10px] flex flex-col justify-between text-zinc-405 leading-tight">
                <div className="flex items-center justify-between">
                  <span className="text-red-500 font-extrabold uppercase text-[11px] tracking-tight group-hover:text-red-400">REDDY // COGNITIVE_ASSISTANT</span>
                  <span className={`text-[8px] px-1 py-0.2 select-none border border-current ${isProcessing ? 'text-red-400 bg-red-950/20' : 'text-zinc-650'}`}>
                    {isProcessing ? "THINKING" : "IDLE"}
                  </span>
                </div>
                <div className="text-zinc-500 font-mono text-[9px] space-y-0.5 select-none mt-1">
                  <div>VIRTUAL REGISTRY: <span className="text-zinc-350">{registeredSkills.length} SKILLS INITIALIZED </span></div>
                  <div>ROUTING CORE: <span className="text-[#facc15]">STANDARD_STREAM</span></div>
                  <div className="text-[8px] text-zinc-600 truncate">PROMPT: "{systemInstruction.substring(0, 50)}..."</div>
                </div>
              </div>
            </div>

            {/* Chat outputs block with high UX terminal cells */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 max-h-[350px] space-y-3.5 min-h-[160px] my-1 bg-black p-3 border-2 border-black shadow-inner">
              <AnimatePresence initial={false}>
                {logs.map((log, i) => {
                  const isUser = log.type === 'info';
                  
                  // Simple formatted message parser to output real logs beautifully
                  const renderConsoleBlock = (text: string) => {
                    const parts = text.split(/(```[\s\S]*?```)/g);
                    return parts.map((part, index) => {
                      if (part.startsWith('```')) {
                        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
                        const language = match ? match[1] : 'CYPHER';
                        const code = match ? match[2] : part.slice(3, -3);
                        return (
                          <div key={index} className="bg-[#0b0b0c] border border-zinc-800 my-2 font-mono text-[10px] text-emerald-400 p-2.5 relative select-text shadow-sm">
                            <div className="flex justify-between items-center text-[8px] text-zinc-500 border-b border-zinc-900 pb-1 mb-1.5 uppercase select-none">
                              <span>{language || 'PARSED_CYPHER'} // OUTPUT</span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(code);
                                  // Quick audio chirp
                                  try {
                                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                    const ctx = new AudioContextClass();
                                    const osc = ctx.createOscillator();
                                    const gain = ctx.createGain();
                                    osc.type = 'sine';
                                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                                    gain.gain.setValueAtTime(0.04, ctx.currentTime);
                                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                                    osc.connect(gain);
                                    gain.connect(ctx.destination);
                                    osc.start();
                                    osc.stop(ctx.currentTime + 0.1);
                                  } catch (e) {
                                    console.warn('[reddy:audio] optional UI sound failed:', e);
                                  }
                                }}
                                className="text-[#facc15] hover:underline cursor-pointer flex items-center gap-1 active:scale-95 text-[7px]"
                              >
                                <Copy size={8} /> COPY CODE
                              </button>
                            </div>
                            <pre className="overflow-x-auto whitespace-pre leading-normal custom-scrollbar">{code}</pre>
                          </div>
                        );
                      }
                      
                      const lines = part.split('\n');
                      return (
                        <div key={index} className="space-y-1 text-[11px] leading-relaxed select-text mt-0.5 text-zinc-300">
                          {lines.map((line, lIdx) => {
                            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                              return (
                                <div key={lIdx} className="flex gap-2 pl-2 text-cyan-400 font-mono text-[10px] mt-0.5">
                                  <span className="text-[#facc15]">▪</span>
                                  <span className="text-zinc-300">{line.replace(/^[\s\-\*]+/, '')}</span>
                                </div>
                              );
                            }
                            if (line.trim().startsWith('> ')) {
                              return (
                                <blockquote key={lIdx} className="border-l-2 border-[#facc15] bg-[#1c1917]/20 pl-2.5 py-0.5 my-1 text-zinc-400 italic font-mono text-xs text-opacity-85">
                                  {line.replace(/^[\s\>]+/, '')}
                                </blockquote>
                              );
                            }
                            return (
                              <p key={lIdx} className="whitespace-pre-wrap">{line}</p>
                            );
                          })}
                        </div>
                      );
                    });
                  };

                  return (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className={`flex flex-col border-2 relative transition-all ${
                        isUser ? 'border-zinc-805 bg-[#09090b]' : 'border-zinc-850 bg-[#1c1917]/20'
                      }`}
                    >
                      {/* Message header stripe */}
                      <div className="flex items-center justify-between text-[8px] font-mono font-bold leading-none border-b border-black py-1 px-2 select-none">
                        <span className={`flex items-center gap-1.5 ${isUser ? 'text-zinc-400' : 'text-[#facc15]'}`}>
                          {isUser ? <Terminal size={10} className="text-zinc-500" /> : <SquareTerminal size={10} className="text-[#facc15]" />}
                          {isUser ? '» USER MESSAGE' : '» AI ASSISTANT'}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {!isUser && (
                            <div className="flex items-center gap-1 mr-2 border-x border-zinc-800 px-2">
                              <button
                                onClick={() => handleReaction(log.id, 'useful')}
                                className={`p-0.5 transition-colors hover:text-emerald-400 ${log.reaction === 'useful' ? 'text-emerald-400' : 'text-zinc-600'}`}
                                title="Useful"
                              >
                                <Check size={10} />
                              </button>
                              <button
                                onClick={() => handleReaction(log.id, 'incorrect')}
                                className={`p-0.5 transition-colors hover:text-red-400 ${log.reaction === 'incorrect' ? 'text-red-400' : 'text-zinc-600'}`}
                                title="Incorrect"
                              >
                                <ShieldAlert size={10} />
                              </button>
                            </div>
                          )}
                          <span 
                            className="text-zinc-650 font-normal cursor-help" 
                            title={log.fullTimestamp || log.timestamp}
                          >
                            [{log.timestamp}]
                          </span>
                          {!isUser && (
                            <button
                              onClick={() => {
                                // Simulate TTS aloud reading standard browser speech API synthesis
                                if ('speechSynthesis' in window) {
                                  try {
                                    window.speechSynthesis.cancel();
                                    const cleanText = log.message.replace(/```[\s\S]*?```/g, ' [code omitted] ');
                                    const utterance = new SpeechSynthesisUtterance(cleanText);
                                    utterance.pitch = 0.85; // cyber robot voice pitch
                                    utterance.rate = 1.05;
                                    window.speechSynthesis.speak(utterance);
                                    
                                    // Voice play audio feedback
                                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                    const ctx = new AudioContextClass();
                                    const osc = ctx.createOscillator();
                                    osc.type = 'sine';
                                    osc.frequency.setValueAtTime(320, ctx.currentTime);
                                    const gain = ctx.createGain();
                                    gain.gain.setValueAtTime(0.04, ctx.currentTime);
                                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                                    osc.connect(gain);
                                    gain.connect(ctx.destination);
                                    osc.start();
                                    osc.stop(ctx.currentTime + 0.1);
                                  } catch (e) {
                                    console.warn('[reddy:audio] optional UI sound failed:', e);
                                  }
                                }
                              }}
                              className="text-cyan-400 hover:text-[#facc15] cursor-pointer"
                              title="READ OUTPUT"
                            >
                              <Volume2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actual payload box */}
                      <div className="p-2 pb-2.5 font-mono select-text bg-[#030303]/40 flex flex-col">
                        {renderConsoleBlock(log.message)}
                        
                        {log.reaction && (
                          <div className={`mt-2 self-end text-[7px] font-black uppercase px-1.5 py-0.5 animate-in fade-in slide-in-from-bottom-1 border ${
                            log.reaction === 'useful' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>
                            {log.reaction === 'useful' ? 'MARK_ACCEPTED' : 'MARK_INCORRECT'}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {isProcessing && (
                <div className="text-[9px] font-mono uppercase text-[#facc15] animate-pulse select-none flex items-center gap-2 mt-2 border border-dashed border-[#facc15]/30 p-2 bg-[#facc15]/5">
                  <span className="w-1.5 h-1.5 bg-[#facc15] block rounded-full animate-ping" />
                  AI Assistant is generating response...
                </div>
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Ingress prompts trigger shortcuts */}
            <div className="flex gap-1 overflow-x-auto custom-scrollbar py-1 shrink-0 mt-1 pb-2 select-none">
               {[
                 { label: 'AUDIT', text: 'Run system diagnostics parameter audit' },
                 { label: 'SUMMARIZE', text: 'Summarize the current setup' },
                 { label: 'CAPABILITIES', text: 'Display full skill lists and ready modules' },
                 { label: 'HELP_CODE', text: 'Provide compiler assembly troubleshooting' },
                 { label: 'REBOOT', text: '/reboot' }
               ].map((q, i) => (
                 <button 
                  key={i}
                  type="button"
                  onClick={() => {
                    // Audio chirp
                    try {
                      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                      const ctx = new AudioContextClass();
                      const osc = ctx.createOscillator();
                      osc.type = 'sine';
                      osc.frequency.setValueAtTime(540, ctx.currentTime);
                      const gain = ctx.createGain();
                      gain.gain.setValueAtTime(0.02, ctx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.start();
                      osc.stop(ctx.currentTime + 0.05);
                    } catch (e) {
                      console.warn('[reddy:audio] optional UI sound failed:', e);
                    }
                    
                    if (q.text === '/reboot') {
                      setLogs([
                        { 
                          id: 'reboot-1', 
                          timestamp: new Date().toLocaleTimeString(), 
                          fullTimestamp: new Date().toLocaleString(),
                          message: 'AI ASSISTANT CHAT SESSION RESET: SUCCESS.', 
                          type: 'success' 
                        },
                        { 
                          id: 'reboot-2', 
                          timestamp: new Date().toLocaleTimeString(), 
                          fullTimestamp: new Date().toLocaleString(),
                          message: 'System stands ready for new instructions.', 
                          type: 'info' 
                        }
                      ]);
                    } else {
                      setUserInput(q.text);
                    }
                  }}
                  className="px-2.5 py-1 text-[8px] font-mono bg-black text-zinc-500 border border-zinc-850 hover:border-[#facc15] hover:text-[#facc15] transition-all cursor-pointer select-none shrink-0"
                 >
                   [{q.label}]
                 </button>
               ))}
            </div>

            {/* Shell Command Enter Line */}
            <div className="flex gap-2 shrink-0 select-none">
              <div className="flex-grow bg-black border-2 border-zinc-750 px-3 py-1.5 flex items-center gap-2 focus-within:border-[#facc15]">
                <span className="text-[#facc15] font-black text-xs leading-none">&gt;&gt;</span>
                <input 
                  type="text" 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Audio click
                      try {
                        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                        const ctx = new AudioContextClass();
                        const osc = ctx.createOscillator();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(400, ctx.currentTime);
                        const gain = ctx.createGain();
                        gain.gain.setValueAtTime(0.03, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.06);
                      } catch (e) {
                        console.warn('[reddy:audio] optional UI sound failed:', e);
                      }
                      handleSend();
                    }
                  }}
                  placeholder={isListening ? "Listening..." : "Type your message here..."} 
                  className="bg-transparent border-none outline-none text-xs w-full text-zinc-200 placeholder:text-zinc-800"
                  disabled={isProcessing || isListening}
                />
                <button
                  type="button"
                  onClick={startListening}
                  className={`p-1.5 transition-colors cursor-pointer ${isListening ? 'text-red-500 animate-pulse' : 'text-zinc-600 hover:text-zinc-300'}`}
                  title="Voice Input"
                >
                  {isListening ? <Mic size={14} /> : <Mic size={14} />}
                </button>
              </div>
              <button 
                onClick={() => {
                  // Audio submit click
                  try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    const ctx = new AudioContextClass();
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(520, ctx.currentTime);
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.04, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.08);
                  } catch (e) {
                    console.warn('[reddy:audio] optional UI sound failed:', e);
                  }
                  handleSend();
                }}
                disabled={isProcessing}
                className="bg-[#facc15] text-black border-2 border-black font-black px-4 text-xs tracking-widest uppercase hover:bg-yellow-400 cursor-pointer active:translate-y-0.5 shrink-0"
              >
                <Send size={12} />
              </button>
            </div>

          </div>

        </div>

        {/* --- RIGHT HAND SECTION: Diagnostics & GuestbookWall signatures (3 columns) --- */}
        <div className="lg:col-span-12 xl:col-span-3 flex flex-col gap-4">
          
          {/* Real-time system monitor stats */}
          <div className="shrink-0">
            <SystemStatusMonitor />
          </div>

          {/* Key validations input */}
          <div className="shrink-0">
            <KeyDeck />
          </div>

          {/* Live latency execution charts */}
          <div className="shrink-0 flex-1 min-h-[220px]">
            <TaskTracker />
          </div>

          {/* Secure memory registry details database */}
          <div className="shrink-0 flex-1 min-h-[200px]">
            <KnowledgeVault />
          </div>

          {/* Tactile digital guestbook wall of signatures */}
          <div className="flex-1 min-h-[280px]">
            <GuestbookWidget />
          </div>

        </div>

      </div>

      {/* Settings Modal dialogue in same aesthetic */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6 select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#18181b] border-4 border-black p-6 md:p-8 max-w-2xl w-full shadow-[8px_8px_0px_0px_#000000]"
            >
              <div className="flex items-center gap-1.5 mb-4 border-b-2 border-black pb-2 text-[#facc15]">
                <Settings size={18} />
                <h2 className="font-sans font-black uppercase text-sm tracking-tight">Customize AI Instructions</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[8px] font-black text-zinc-500 uppercase font-mono mb-2">System Instructions</label>
                  <textarea 
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    className="w-full h-44 bg-black border-2 border-zinc-700 p-3 text-xs font-mono text-zinc-200 focus:border-[#facc15] outline-none resize-none"
                    placeholder="Provide default guidelines for the AI assistant..."
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 bg-black border-2 border-zinc-700 text-[10px] font-black uppercase text-zinc-400 hover:text-white cursor-pointer active:translate-y-0.5"
                  >
                    ABORT
                  </button>
                  <button 
                    onClick={handleUpdateSettings}
                    className="px-6 py-2 bg-[#facc15] text-black border-2 border-black text-[10px] font-black uppercase hover:bg-yellow-400 cursor-pointer active:translate-y-0.5"
                  >
                    SAVE CHANGES
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOCK PURGE AUDIT PROTOCOL MODAL */}
      <AnimatePresence>
        {activeAuditItems && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 md:p-6 select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#18181b] border-4 border-black w-full max-w-3xl shadow-[8px_8px_0px_0px_#000000] flex flex-col max-h-[90vh]"
            >
              <div className="w-full h-4 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#facc15_10px,#facc15_20px)] border-b-4 border-black shrink-0" />
              
              <div className="p-4 md:p-6 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4 shrink-0">
                  <div className="flex items-center gap-2 text-[#facc15]">
                    <AlertTriangle size={18} className="animate-pulse text-yellow-500" />
                    <h2 className="font-sans font-black uppercase text-sm md:text-base tracking-tight">PROTOCOL 12: MOCK_PURGE CONTROL</h2>
                  </div>
                  <span className="px-1.5 py-0.5 text-[8px] font-mono bg-black text-yellow-500 border border-yellow-850 font-extrabold select-none animate-pulse">
                    MOCK/TODO AUDIT ENGINE
                  </span>
                </div>

                <div className="bg-black p-3 border border-zinc-800 text-zinc-400 text-xs font-mono mb-4 leading-relaxed shrink-0">
                  <span className="text-[#facc15] font-black">SCAN_TARGET:</span> <span className="text-white font-black">./src</span><br />
                  <span className="text-zinc-500">The compiler audited source files. Check the elements you wish to surgically replace or archive before launching the sanitization bio-pulse.</span>
                </div>

                <div className="flex-1 overflow-y-auto border-2 border-black bg-black p-2 custom-scrollbar min-h-[180px]">
                  <table className="w-full text-left font-mono text-[10px] md:text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 font-black uppercase">
                        <th className="pb-2 pl-2 w-10">SEL</th>
                        <th className="pb-2 w-32">CATEGORY</th>
                        <th className="pb-2 w-48">FILE LOCATION</th>
                        <th className="pb-2">DUMMY CONTENT excerpt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {activeAuditItems.map((item) => {
                        const isChecked = selectedAuditIds.includes(item.id);
                        return (
                          <tr key={item.id} className={`hover:bg-zinc-950 transition-colors ${isChecked ? 'text-zinc-100' : 'text-zinc-650'}`}>
                            <td className="py-2.5 pl-2">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => {
                                  try {
                                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                    const ctx = new AudioContextClass();
                                    const osc = ctx.createOscillator();
                                    osc.frequency.setValueAtTime(isChecked ? 400 : 700, ctx.currentTime);
                                    const gain = ctx.createGain();
                                    gain.gain.setValueAtTime(0.02, ctx.currentTime);
                                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                                    osc.connect(gain); gain.connect(ctx.destination);
                                    osc.start(); osc.stop(ctx.currentTime + 0.05);
                                  } catch (e) {
                                    console.warn('[reddy:audio] optional UI sound failed:', e);
                                  }

                                  setSelectedAuditIds(prev => 
                                    prev.includes(item.id) 
                                      ? prev.filter(id => id !== item.id) 
                                      : [...prev, item.id]
                                  );
                                }}
                                className="accent-[#facc15] cursor-pointer h-3.5 w-3.5 border-2 border-zinc-700 bg-black"
                              />
                            </td>
                            <td className="py-2.5 pr-2 font-black">
                              <span className={`px-1 rounded text-[9px] ${
                                item.category === "TODO_COMMENT" ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-900/30' : 'bg-amber-950/40 text-amber-500 border border-amber-900/30'
                              }`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="py-2.5 pr-2 text-zinc-400 font-mono truncate max-w-[160px]">
                              {item.file}:{item.line}
                            </td>
                            <td className="py-2.5 pr-2 text-emerald-400 font-mono truncate max-w-[200px]" title={item.text}>
                              <code>{item.text.trim()}</code>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-between items-center bg-black/60 p-3 border border-zinc-850 shrink-0">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedAuditIds(activeAuditItems.map(i => i.id));
                      }}
                      className="px-2.5 py-1 bg-[#18181b] border border-zinc-700 text-[9px] font-black uppercase text-zinc-300 hover:text-white cursor-pointer"
                    >
                      SELECT ALL
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedAuditIds([]);
                      }}
                      className="px-2.5 py-1 bg-[#18181b] border border-zinc-700 text-[9px] font-black uppercase text-zinc-300 hover:text-white cursor-pointer"
                    >
                      CLEAR ALL
                    </button>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-bold select-none leading-none">
                    {selectedAuditIds.length} OF {activeAuditItems.length} SELECTED FOR PURGING
                  </span>
                </div>

                <div className="flex gap-3 justify-end mt-4 shrink-0">
                  <button 
                    onClick={() => setActiveAuditItems(null)}
                    className="px-5 py-2.5 bg-black border-2 border-zinc-700 text-xs font-black uppercase text-zinc-400 hover:text-white cursor-pointer active:translate-y-0.5"
                  >
                    ABORT PURGE
                  </button>
                  <button 
                    onClick={executeMockPurge}
                    disabled={selectedAuditIds.length === 0 || isPurging}
                    className="px-6 py-2.5 bg-yellow-500 text-black font-mono font-black border-2 border-black hover:bg-yellow-400 tracking-wider text-xs uppercase cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                  >
                    {isPurging ? (
                      <span className="w-4 h-4 border-2 border-black border-t-transparent animate-spin rounded-full inline-block" />
                    ) : (
                      <Zap size={14} className="fill-current" />
                    )}
                    EXECUTE BIO-PULSE PURGE
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FLOATING INDUSTRIAL FOOTER STATS --- */}
      <footer className="border-t-2 border-zinc-900 flex items-center justify-between h-8 shrink-0 mt-2 text-[9px] text-zinc-650 font-bold select-none px-1">
        <div className="flex gap-4">
          <span>PORT: <span className="text-zinc-500 font-mono">3000 // ACTIVE</span></span>
          <span className="hidden md:inline">SYSTEM STATUS: <span className="text-[#facc15]">ONLINE</span></span>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[8px] text-zinc-700 uppercase">Active Terminals:</span>
          <span className="w-1.5 h-1.5 bg-[#facc15] block" />
          <span className="w-1.5 h-1.5 bg-zinc-800 block" />
        </div>
      </footer>
    </div>
  );
}
