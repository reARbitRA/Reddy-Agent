import React, { useState } from 'react';
import { Cpu, CheckCircle, Smartphone, Database, SquareTerminal } from 'lucide-react';

interface TechItem {
  name: string;
  version: string;
  proficiency: number; // percentage
  experience: string;
  description: string;
  diagnosticCode: string;
  color: string;
}

const TECHS: TechItem[] = [
  {
    name: "REACT",
    version: "v19.0",
    proficiency: 96,
    experience: "5 YEARS",
    description: "A popular JavaScript library for building user interfaces with declarative component architecture.",
    diagnosticCode: "STATUS: ACTIVE\nRENDER_ENGINE: REACT 19\nDOM_STATUS: SYNCED",
    color: "cyan"
  },
  {
    name: "TYPESCRIPT",
    version: "v5.8",
    proficiency: 98,
    experience: "4 YEARS",
    description: "TypeScript adds static type checking to JavaScript, improving developer productivity and catching bugs early.",
    diagnosticCode: "TYPE_CHECKING: ENABLED\nSTRICT_MODE: TRUE\nERRORS: 0",
    color: "yellow"
  },
  {
    name: "NODE.JS",
    version: "v22.0",
    proficiency: 92,
    experience: "5 YEARS",
    description: "An open-source, cross-platform JavaScript runtime environment for executing JS code server-side.",
    diagnosticCode: "SERVER_STATUS: RUNNING\nVERSION: Node 22\nPORT_BINDING: 3000",
    color: "green"
  },
  {
    name: "TAILWIND",
    version: "v4.0",
    proficiency: 95,
    experience: "4 YEARS",
    description: "A utility-first CSS framework for rapid and highly customizable styling directly inside markup.",
    diagnosticCode: "COMPILER: PARSED\nTHEME: DEFAULT\nUTILITIES: INJECTED",
    color: "yellow"
  },
  {
    name: "DOCKER",
    version: "v24.0",
    proficiency: 85,
    experience: "3 YEARS",
    description: "A platform designed to build, run, and share applications with containers securely.",
    diagnosticCode: "DAEMON: RUNNING\nSTATUS: ACTIVE",
    color: "cyan"
  },
  {
    name: "GEMINI_API",
    version: "SDK v2.4",
    proficiency: 94,
    experience: "2 YEARS",
    description: "Google's powerful family of generative AI models for natural language task processing.",
    diagnosticCode: "MODEL: GEMINI-2.5-FLASH\nAPI_STATUS: CONNECTED",
    color: "orange"
  },
  {
    name: "POSTGRESQL",
    version: "v16.2",
    proficiency: 88,
    experience: "3 YEARS",
    description: "PostgreSQL is a powerful, open-source object-relational database system.",
    diagnosticCode: "DIALECT: POSTGRESQL\nSTATUS: RUNNING",
    color: "green"
  },
  {
    name: "RUST",
    version: "Cargo_1.80",
    proficiency: 80,
    experience: "1.5 YEARS",
    description: "Rust is a multi-paradigm, high-performance programming language designed for safety and speed.",
    diagnosticCode: "CARGO: STABLE\nCOMPILED: OK",
    color: "orange"
  }
];

export const TechStackGrid = () => {
  const [selectedTech, setSelectedTech] = useState<TechItem>(TECHS[0]);

  const drawProgressBar = (val: number) => {
    const bars = Math.round(val / 5);
    return `[${'='.repeat(bars)}${'-'.repeat(20 - bars)}] ${val}%`;
  };

  return (
    <div className="bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col h-full col-span-1">
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5">
          <Cpu size={12} />
          Tech Stack
        </h3>
        <span className="px-1.5 py-0.5 text-[8px] font-mono bg-black text-[#facc15] font-black border border-black animate-pulse">
          STATUS: ONLINE
        </span>
      </div>

      {/* Grid of buttons to click */}
      <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 mb-4">
        {TECHS.map((tech) => {
          const isSelected = selectedTech.name === tech.name;
          return (
            <button
              key={tech.name}
              onClick={() => setSelectedTech(tech)}
              className={`border-2 p-1.5 text-[9px] font-black font-mono tracking-tighter text-center uppercase relative transition-all active:translate-y-0.5 cursor-pointer ${
                isSelected 
                  ? 'bg-[#facc15] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                  : 'bg-black text-white border-zinc-700 hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div className="truncate">{tech.name}</div>
              <div className={`text-[7px] opacity-70 ${isSelected ? 'text-black' : 'text-zinc-500'}`}>
                {tech.version}
              </div>
            </button>
          );
        })}
      </div>

      {/* Terminal Telemetry readout */}
      <div className="flex-1 bg-black border-2 border-zinc-800 p-3 flex flex-col font-mono text-xs text-[#facc15] relative select-text min-h-[140px]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-2 text-[8px] text-zinc-500">
          <span className="flex items-center gap-1">
            <SquareTerminal size={10} className="text-[#facc15]" />
            DIALECT_INFO // STACK_READOUT
          </span>
          <span className="text-zinc-600">v4.0</span>
        </div>

        {/* Console content */}
        <div className="space-y-1.5 flex-1 text-[11px] leading-tight">
          <div>
            <span className="text-zinc-500 font-bold uppercase">SYS DIAGNOSTIC:</span>{' '}
            <span className="text-white font-black">{selectedTech.name} {selectedTech.version}</span>
          </div>
          <div>
            <span className="text-zinc-500 font-bold uppercase">PROFICIENCY:</span>{' '}
            <span className="text-emerald-400 font-black">{drawProgressBar(selectedTech.proficiency)}</span>
          </div>
          <div>
            <span className="text-zinc-500 font-bold uppercase">ACTIVE EXP:</span>{' '}
            <span className="text-cyan-400 font-black">{selectedTech.experience}</span>
          </div>
          <div className="border-t border-zinc-900/40 my-1 pt-1 text-zinc-300 leading-snug">
            {selectedTech.description}
          </div>
          
          <div className="bg-zinc-950/80 border border-zinc-900 p-2 mt-2 font-mono text-[9px] text-[#facc15]/70 whitespace-pre-line leading-normal">
            {selectedTech.diagnosticCode}
          </div>
        </div>

        {/* LED blink dot */}
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>
    </div>
  );
};
