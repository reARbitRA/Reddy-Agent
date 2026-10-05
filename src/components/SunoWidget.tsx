import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Music, ExternalLink, RefreshCw, Layers, Copy, Check, Info } from 'lucide-react';

interface SunoTrack {
  id: string;
  title: string;
  genre: string;
  type: 'song' | 'playlist';
  artist: string;
}

const PRESET_SUNO_TRACKS: SunoTrack[] = [
  {
    id: 'f94db1fa-9cd0-4d57-b4db-5a19cb2dc183',
    title: 'cybernetic neon dreams',
    genre: 'synthwave lofi',
    type: 'song',
    artist: 'Suno AI Synth'
  },
  {
    id: '43ebdedc-eafb-4e1d-872f-ebf9cb3fa102',
    title: 'retro arcade high energy',
    genre: 'chiptune metal',
    type: 'song',
    artist: 'Suno AI Shredder'
  },
  {
    id: '809d3b3c-dcde-4c28-97ff-2afc8fc59955',
    title: 'vaporwave mall ambience',
    genre: 'chill ambient',
    type: 'song',
    artist: 'Suno AI Dreamer'
  }
];

export const SunoWidget = () => {
  const [tracks, setTracks] = useState<SunoTrack[]>(PRESET_SUNO_TRACKS);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [parsedMsg, setParsedMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [currentTab, setCurrentTab] = useState<'player' | 'guide'>('player');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const activeTrack = tracks[activeTrackIndex] || PRESET_SUNO_TRACKS[0];

  // Extracts uuid or clip id from suno string
  const parseSunoUrl = (url: string): { id: string; type: 'song' | 'playlist' } | null => {
    const trimmed = url.trim();
    if (!trimmed) return null;

    // UUID Regex match (8-4-4-4-12 hex format)
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = trimmed.match(uuidRegex);
    if (!match) return null;

    const id = match[0];
    let type: 'song' | 'playlist' = 'song';

    if (trimmed.toLowerCase().includes('playlist')) {
      type = 'playlist';
    }

    return { id, type };
  };

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setParsedMsg(null);

    const parsed = parseSunoUrl(inputUrl);
    if (!parsed) {
      setParsedMsg({ text: "ERROR: INVALID SUNO URL OR UUID NOT FOUND.", isError: true });
      playTone(180, 0.15, 'sawtooth');
      return;
    }

    // Determine details
    const isPlaylist = parsed.type === 'playlist';
    const newTrack: SunoTrack = {
      id: parsed.id,
      title: isPlaylist ? 'Custom Shared Playlist' : 'Custom Imported Song',
      genre: isPlaylist ? 'user playlist' : 'user generation',
      type: parsed.type,
      artist: 'Self Transmitted'
    };

    // Prepend and select
    setTracks(prev => [newTrack, ...prev]);
    setActiveTrackIndex(0);
    setInputUrl('');
    setParsedMsg({ text: "SUCCESS: SUNO SIGNAL CALIBRATED & DEPLOYED.", isError: false });
    playTone(600, 0.2, 'sine');
  };

  const playTone = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('[reddy:audio] optional UI sound failed:', e);
    }
  };

  // Embed Player URL format
  const getEmbedUrl = (track: SunoTrack) => {
    // Standard Embed URL structure for Suno AI
    return `https://suno.com/embed/${track.id}`;
  };

  return (
    <div className="bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col relative w-full">
      <div className="absolute top-1 left-2 text-[8px] font-mono font-black text-[#facc15] tracking-widest led-flicker">
        // SUNO_AUDIO_SUITE_ACTIVE
      </div>

      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5 mt-2 select-none">
          <Music size={12} className="animate-bounce" />
          SUNO AI AUDIO
        </h3>
        <span className="px-1.5 py-0.5 text-[8px] font-mono bg-black text-[#facc15] font-black border border-black mt-2 uppercase select-none">
          {activeTrack.genre}
        </span>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 mb-3 shrink-0">
        <button
          onClick={() => {
            setCurrentTab('player');
            playTone(400, 0.05);
          }}
          className={`py-1 text-[9px] font-mono font-bold uppercase border-2 border-black active:translate-y-0.5 transition-colors cursor-pointer select-none ${
            currentTab === 'player' ? 'bg-yellow-500 text-black font-black' : 'bg-black text-zinc-500 hover:text-zinc-300'
          }`}
        >
          ARCADE PLAYER
        </button>
        <button
          onClick={() => {
            setCurrentTab('guide');
            playTone(450, 0.05);
          }}
          className={`py-1 text-[9px] font-mono font-bold uppercase border-2 border-black active:translate-y-0.5 transition-colors cursor-pointer select-none ${
            currentTab === 'guide' ? 'bg-yellow-500 text-black font-black' : 'bg-black text-zinc-500 hover:text-zinc-300'
          }`}
        >
          SUITE MANUAL
        </button>
      </div>

      {currentTab === 'player' ? (
        <div className="flex flex-col flex-1 min-h-[300px]">
          {/* Active Track Banner */}
          <div className="bg-black p-2 border border-zinc-800 text-[10px] font-mono flex items-center justify-between gap-2 shrink-0 mb-2">
            <div className="truncate select-none">
              <span className="text-[#facc15] font-black uppercase">PLAYING: </span>
              <span className="text-zinc-300 truncate uppercase">{activeTrack.title}</span>
            </div>
            <span className="text-zinc-650 shrink-0 font-bold uppercase text-[8px]">
              [{activeTrack.type}]
            </span>
          </div>

          {/* Interactive Responsive Iframe Embed */}
          <div className="relative flex-1 min-h-[160px] bg-black border-2 border-black flex items-center justify-center overflow-hidden">
            <iframe
              src={getEmbedUrl(activeTrack)}
              width="100%"
              height="100%"
              style={{ border: '0px' }}
              allow="autoplay; encrypted-media; clipboard-write"
              title={`Suno AI Player - ${activeTrack.title}`}
              className="absolute inset-0 w-full h-full bg-[#18181b]"
            />
          </div>

          {/* Preset Track Selector Grid */}
          <div className="mt-3 shrink-0">
            <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase select-none block mb-1">
              Select Preset Transmissions:
            </span>
            <div className="grid grid-cols-3 gap-1">
              {PRESET_SUNO_TRACKS.map((preset, index) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setActiveTrackIndex(index);
                    playTone(500 + index * 50, 0.08);
                  }}
                  className={`p-1.5 border border-black text-[9px] font-mono uppercase truncate cursor-pointer transition-colors active:translate-y-0.5 ${
                    activeTrack.id === preset.id
                      ? 'bg-zinc-800 border-yellow-500 text-yellow-500 font-black'
                      : 'bg-[#1c1c1e] text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={`${preset.artist} - ${preset.title}`}
                >
                  CLIP_0{index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Suno Link Importer Form */}
          <form onSubmit={handleAddTrack} className="mt-3 bg-black/40 p-2 border border-zinc-850 shrink-0">
            <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase select-none block mb-1">
              Transmit Custom Suno Link:
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Paste Suno Song/Playlist Link..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="flex-1 bg-black text-white font-mono text-[10px] px-2 py-1.5 border border-zinc-800 outline-none focus:border-yellow-500 transition-colors"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-yellow-500 text-black border border-black font-mono font-black text-[10px] uppercase cursor-pointer hover:bg-yellow-400 active:translate-y-0.5 transition-colors flex items-center gap-1 select-none"
              >
                <Play size={10} className="fill-current" />
                LOAD
              </button>
            </div>

            <AnimatePresence>
              {parsedMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mt-1.5 font-mono text-[8px] font-black uppercase text-center ${
                    parsedMsg.isError ? 'text-red-500' : 'text-emerald-500'
                  }`}
                >
                  {parsedMsg.text}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      ) : (
        /* Manual guide for connecting, authenticating and creating on Suno AI */
        <div className="flex-1 min-h-[300px] flex flex-col justify-between font-mono select-none">
          <div className="space-y-3 p-1 overflow-y-auto">
            <div className="flex gap-2 items-start border-b border-zinc-800 pb-2">
              <Info size={14} className="text-[#facc15] shrink-0 mt-0.5" />
              <div>
                <span className="text-zinc-200 text-[11px] font-bold block uppercase">How to Use Suno Suite</span>
                <span className="text-zinc-500 text-[9px] leading-relaxed block mt-0.5">
                  Listen, create and load music directly in your retro cockpit workspace.
                </span>
              </div>
            </div>

            <div className="space-y-2 text-[10px] text-zinc-400 leading-normal">
              <div>
                <span className="text-[#facc15] font-black block uppercase">1. SECURE AUTHENTICATION</span>
                <span className="block">
                  Click the button below to sign in or sign up to your official Suno account in a new secure browser tab.
                </span>
              </div>
              
              <div>
                <span className="text-[#facc15] font-black block uppercase">2. CREATE & DISCOVER MUSIC</span>
                <span className="block">
                  Browse public showcases or use AI descriptors to forge custom neon tracks inside your Suno Dashboard.
                </span>
              </div>

              <div>
                <span className="text-[#facc15] font-black block uppercase">3. SYNC WITH THE COCKPIT</span>
                <span className="block">
                  Click 'Share' on your favorite song, click 'Copy Link', then paste that link into the import tool on the Player tab!
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-800 bg-black/20 p-2 shrink-0">
            <a
              href="https://suno.com"
              target="_blank"
              rel="noreferrer"
              onClick={() => playTone(600, 0.15)}
              className="w-full py-2 bg-black border-2 border-zinc-700 text-zinc-300 hover:text-white font-mono font-black text-[10px] uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-colors select-none text-center"
            >
              <ExternalLink size={11} />
              LOGIN TO SUNO WEBSITE (NEW TAB)
            </a>

            <button
              onClick={() => {
                try {
                  navigator.clipboard.writeText('https://suno.com');
                  setCopiedUrl(true);
                  playTone(700, 0.1);
                  setTimeout(() => setCopiedUrl(false), 2000);
                } catch(e) {}
              }}
              className="w-full py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-400 font-mono text-[9px] uppercase cursor-pointer flex items-center justify-center gap-1 transition-colors select-none"
            >
              {copiedUrl ? (
                <>
                  <Check size={10} className="text-emerald-500" />
                  URL COPIED!
                </>
              ) : (
                <>
                  <Copy size={10} />
                  COPY SUNO ADDRESS
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
