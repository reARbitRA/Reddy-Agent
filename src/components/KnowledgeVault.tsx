import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Tag, BookOpen, Search, FolderClosed, Save } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  name: string;
  content: string;
  category: string;
}

export const KnowledgeVault = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState({ name: '', content: '', category: 'General' });

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      setItems(data.knowledge || []);
    } catch (e) {
      console.warn("Failed to fetch knowledge:", e);
    }
  };

  const handleAdd = async () => {
    if (!newItem.name || !newItem.content) return;
    try {
      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      setNewItem({ name: '', content: '', category: 'GENERAL' });
      setIsAdding(false);
      fetchKnowledge();
    } catch (e) {
      console.warn("Failed to add knowledge:", e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      fetchKnowledge();
    } catch (e) {
      console.warn("Failed to delete knowledge:", e);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div 
      className="flex flex-col h-full bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000000] relative overflow-hidden"
    >
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5">
          <FolderClosed size={12} />
          Knowledge Vault
        </h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-2 py-1 bg-[#facc15] text-black border-2 border-black font-black text-[9px] uppercase tracking-wider hover:bg-yellow-400 cursor-pointer active:translate-y-0.5"
        >
          + ADD ENTRY
        </button>
      </div>

      {/* Filter search bar */}
      <div className="relative mb-3 flex items-center">
        <div className="absolute left-3 text-zinc-600">
          <Search size={12} />
        </div>
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter notes..." 
          className="w-full bg-black border-2 border-zinc-750 py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-[#facc15] font-mono"
        />
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 space-y-2 max-h-[290px]">
        <AnimatePresence>
          {filteredItems.map((item) => (
            <motion.div 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              key={item.id} 
              className="p-2.5 bg-black border-2 border-zinc-800 hover:border-[#facc15] transition-all flex flex-col group relative"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Tag size={10} className="text-[#facc15]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[130px]">
                    {item.name}
                  </span>
                </div>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="opacity-100 group-hover:opacity-100 text-zinc-600 hover:text-red-500 cursor-pointer active:translate-y-0.5"
                >
                  <Trash2 size={10} />
                </button>
              </div>

              <div className="flex items-center mb-1">
                <span className="text-[7px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-500 px-1 py-0.5">
                  {item.category.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono tracking-tight leading-normal whitespace-pre-line">
                {item.content}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredItems.length === 0 && !isAdding && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-55 py-8">
            <BookOpen size={24} className="mb-1.5 text-zinc-600" />
            <span className="text-[9px] uppercase tracking-widest font-black">Archive Empty</span>
          </div>
        )}
      </div>

      {/* Modal drawer for adding snippets */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-[#18181b] p-4 flex flex-col z-20 border-2 border-black"
          >
            <div className="flex items-center gap-1.5 mb-3 text-[#facc15] border-b-2 border-black pb-1">
               <Plus size={14} />
               <h4 className="font-sans font-black uppercase text-xs">CREATE KNOWLEDGE ENTRY</h4>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
               <div>
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase font-mono mb-1">Title / Name</label>
                  <input 
                    type="text" 
                    value={newItem.name}
                    onChange={(e) => setNewItem(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-black border-2 border-zinc-700 p-1.5 text-xs text-zinc-100 outline-none focus:border-[#facc15]"
                    placeholder="e.g. MongoDB Connection"
                  />
               </div>
               <div>
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase font-mono mb-1">Category</label>
                  <input 
                    type="text" 
                    value={newItem.category}
                    onChange={(e) => setNewItem(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-black border-2 border-zinc-700 p-1.5 text-xs text-zinc-100 outline-none focus:border-[#facc15]"
                    placeholder="e.g. Auth, DevOps, Database"
                  />
               </div>
               <div className="flex-1">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase font-mono mb-1">Content</label>
                  <textarea 
                    value={newItem.content}
                    onChange={(e) => setNewItem(p => ({ ...p, content: e.target.value }))}
                    className="w-full h-24 bg-black border-2 border-zinc-700 p-2 text-xs text-zinc-100 outline-none resize-none font-mono focus:border-[#facc15]"
                    placeholder="Enter entry contents here..."
                  />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
               <button 
                onClick={() => setIsAdding(false)}
                className="py-2.5 bg-black border-2 border-zinc-700 text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest hover:text-white cursor-pointer active:translate-y-0.5"
               >
                 CANCEL
               </button>
               <button 
                onClick={handleAdd}
                className="py-2.5 bg-[#facc15] border-2 border-black text-black text-[10px] font-mono font-black uppercase tracking-widest hover:bg-yellow-400 cursor-pointer active:translate-y-0.5"
               >
                 SAVE ENTRY
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
