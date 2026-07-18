import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Zap, Thermometer } from 'lucide-react';

export const SystemStatusMonitor = () => {
  const [cpuFreq, setCpuFreq] = useState(65); // percentage
  const [ramAllocation, setRamAllocation] = useState(48); // percentage
  const [overclock, setOverclock] = useState(false);
  const [temp, setTemp] = useState(42);
  const [packetRate, setPacketRate] = useState(124);

  useEffect(() => {
    // Dynamic variance based on slider inputs
    const interval = setInterval(() => {
      // Temp derives from CPU load + Overclock
      const computedTemp = Math.round(35 + (cpuFreq * 0.4) + (overclock ? 12 : 0) + (Math.random() * 4 - 2));
      setTemp(computedTemp);

      // Packet rate oscillates
      setPacketRate((rate) => {
        const delta = Math.round((Math.random() * 16 - 8) + (cpuFreq * 0.15));
        const next = rate + delta;
        return next < 30 ? 30 : next > 450 ? 450 : next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [cpuFreq, overclock]);

  // Derived indicator status
  const isHighHeat = temp > 75;
  const isOptimal = cpuFreq < 80 && !isHighHeat;

  return (
    <div className="bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col h-full">
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5">
          <Activity size={12} className="text-[#facc15]" />
          System Status
        </h3>
        <span className={`px-1.5 py-0.5 text-[8px] font-mono font-black border border-black ${
          isHighHeat 
            ? 'bg-red-500 text-black animate-ping' 
            : 'bg-black text-[#facc15]'
        }`}>
          {isHighHeat ? 'OVERHEAT WARNING' : 'SYSTEM: ONLINE'}
        </span>
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-center">
        {/* Analog Gauges */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          {/* Temperature indicator */}
          <div className="bg-black p-2 border-2 border-zinc-800 flex items-center gap-2">
            <Thermometer size={16} className={isHighHeat ? 'text-red-500 animate-bounce' : 'text-[#facc15]'} />
            <div className="flex flex-col">
              <span className="text-[7px] font-mono text-zinc-500 uppercase">CPU Temperature</span>
              <span className={`text-sm font-mono font-black ${isHighHeat ? 'text-red-500' : 'text-white'}`}>
                {temp} °C
              </span>
            </div>
          </div>

          {/* Core Power status */}
          <div className="bg-black p-2 border-2 border-zinc-800 flex items-center gap-2">
            <Zap size={16} className={overclock ? 'text-orange-500 animate-pulse' : 'text-[#facc15]'} />
            <div className="flex flex-col">
              <span className="text-[7px] font-mono text-zinc-500 uppercase">Network Rate</span>
              <span className="text-sm font-mono font-black text-white">
                {packetRate} pkt/s
              </span>
            </div>
          </div>
        </div>

        {/* Sliders to modify metrics */}
        <div className="space-y-3">
          {/* CPU SLIDER */}
          <div className="flex flex-col">
            <div className="flex justify-between text-[9px] font-mono font-bold uppercase mb-1">
              <span className="text-zinc-400">CPU Thread Limit</span>
              <span className="text-[#facc15] font-black">{cpuFreq}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={cpuFreq}
              onChange={(e) => setCpuFreq(Number(e.target.value))}
              className="w-full h-2 bg-black border-2 border-black accent-[#facc15] cursor-pointer"
            />
          </div>

          {/* RAM ALLOCATION SLIDER */}
          <div className="flex flex-col">
            <div className="flex justify-between text-[9px] font-mono font-bold uppercase mb-1">
              <span className="text-zinc-400">Memory Allocation</span>
              <span className="text-[#facc15] font-black">{ramAllocation}%</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="95" 
              value={ramAllocation}
              onChange={(e) => setRamAllocation(Number(e.target.value))}
              className="w-full h-2 bg-black border-2 border-black accent-[#facc15] cursor-pointer"
            />
          </div>
        </div>

        {/* Overclock Toggle */}
        <button
          onClick={() => setOverclock(!overclock)}
          className={`border-2 p-2 mt-2 font-mono text-[9px] font-black text-center uppercase tracking-widest cursor-pointer transition-all active:translate-y-0.5 ${
            overclock
              ? 'bg-red-500 text-black border-black shadow-[2px_2px_0px_0px_#000]'
              : 'bg-black text-zinc-400 border-zinc-700 hover:border-[#facc15] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          {overclock ? '⚡ PERFORMANCE BOOST INSTALLED' : '⚠️ ENABLE PERFORMANCE BOOST'}
        </button>

        {/* Status flags */}
        <div className="flex gap-2 justify-between text-[8px] font-mono border-t border-zinc-800 pt-3 mt-2 text-zinc-500">
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 ${isOptimal ? 'bg-emerald-500' : 'bg-red-500'} block`} />
            <span>SYSTEM OK</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 ${overclock ? 'bg-orange-500' : 'bg-zinc-800'} block`} />
            <span>BOOST ENGAGED</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 block animate-pulse" />
            <span>STABLE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
