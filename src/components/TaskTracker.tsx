import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { Clock, ShieldCheck, Activity } from 'lucide-react';

interface HistoryItem {
  timestamp: number;
  message: string;
  success: boolean;
  latency: number;
}

export const TaskTracker = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/tasks/history');
        const data = await res.json();
        setHistory(data.history || []);
      } catch (e) {
        console.warn("Failed to fetch history:", e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartData = history.map((h, i) => ({
    name: i,
    latency: h.latency,
    status: h.success ? 1 : 0,
    timestamp: new Date(h.timestamp).toLocaleTimeString()
  }));

  const successCount = history.filter(h => h.success).length;
  const avgLatency = history.length > 0 
    ? Math.round(history.reduce((acc, h) => acc + h.latency, 0) / history.length) 
    : 0;

  return (
    <div 
      className="flex flex-col h-full bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000000]"
    >
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
         <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5">
            <Activity size={12} />
            AI Query Latency
         </h3>
         <span className="px-1.5 py-0.5 text-[8px] font-mono bg-black text-[#facc15] font-black border border-black animate-pulse">
           STATUS: ACTIVE
         </span>
      </div>

      <div className="flex items-center justify-between mb-4 bg-black p-2 border-2 border-black">
         <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span className="text-[10px] font-mono font-black text-emerald-400 uppercase">{successCount}/{history.length} OK</span>
         </div>
         <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-cyan-400" />
            <span className="text-[10px] font-mono font-black text-cyan-400 uppercase">{avgLatency}ms AVE</span>
         </div>
      </div>

      <div className="flex-1 min-h-[120px] bg-black p-2 border-2 border-black overflow-hidden relative">
        <div className="absolute top-1 left-2 text-[7px] font-mono text-zinc-700 tracking-wider">
          LATENCY_MONITOR // CHART_DATA
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="2 2" stroke="#27272a" vertical={false} opacity={0.6} />
            <XAxis hide dataKey="name" />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000000', border: '2px solid #000000', fontSize: '9px', fontFamily: 'monospace', color: '#facc15' }}
              itemStyle={{ color: '#facc15' }}
              cursor={{ stroke: '#facc15', strokeWidth: 1.5 }}
            />
            <Area 
              type="stepAfter" 
              dataKey="latency" 
              stroke="#facc15" 
              fillOpacity={0.2} 
              fill="#facc15" 
              strokeWidth={2}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 pb-1 border-t-2 border-black pt-4">
        <div className="flex flex-col gap-1">
           <span className="text-[8px] font-mono font-black text-zinc-500 uppercase tracking-widest leading-none">System Stability</span>
           <div className="flex items-center gap-2">
             <div className="h-3 flex-grow bg-black border border-zinc-700 overflow-hidden p-0.5">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${(successCount / (history.length || 1)) * 100}%` }}
                   className="h-full bg-emerald-500"
                 />
             </div>
             <span className="text-[10px] font-mono text-emerald-400 font-bold">
               {Math.round((successCount / (history.length || 1)) * 100)}%
             </span>
           </div>
        </div>
        <div className="flex flex-col gap-1">
           <span className="text-[8px] font-mono font-black text-zinc-500 uppercase tracking-widest leading-none">Load Factor</span>
           <div className="flex items-center gap-2">
             <div className="h-3 flex-grow bg-black border border-zinc-700 overflow-hidden p-0.5">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${Math.min(100, (avgLatency / 2000) * 100)}%` }}
                   className="h-full bg-cyan-400"
                 />
             </div>
             <span className="text-[10px] font-mono text-cyan-400 font-bold">
               {Math.min(100, Math.round((avgLatency / 2000) * 100))}%
             </span>
           </div>
        </div>
      </div>
    </div>
  );
};
