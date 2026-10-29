import React, { useState } from 'react';
import { useSachHiep } from '../state/SachHiepContext';
import { CharacterList } from './CharacterList';
import { BookOpen, Globe2, Users, Plus, X, LogOut, Settings as SettingsIcon } from 'lucide-react';

interface Props {
    onOpenSettings: () => void;
    isOpen: boolean;    
    onClose: () => void; 
}

export const SachHiepSidebar: React.FC<Props> = ({ onOpenSettings, isOpen, onClose }) => {
  const { 
    story, 
    activeChapterId, 
    selectChapter, 
    addChapter, 
    characters, 
    closeStory,
    updateWorldLore
  } = useSachHiep();
  
  const [tab, setTab] = useState<'chapters' | 'world' | 'knowledge'>('chapters');
  const [loreInput, setLoreInput] = useState('');

  if (!story) return null;

  const addLoreItem = () => {
      if (!loreInput.trim()) return;
      const currentLore = story.worldLore || [];
      updateWorldLore([...currentLore, loreInput.trim()]);
      setLoreInput('');
  };

  const removeLoreItem = (index: number) => {
      const currentLore = story.worldLore || [];
      const newLore = [...currentLore];
      newLore.splice(index, 1);
      updateWorldLore(newLore);
  };

  return (
    <div className={`
        fixed inset-y-0 left-0 z-50 w-80 h-full
        bg-gray-900 border-r border-gray-800 flex flex-col shadow-2xl
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-950/40">
         <div className="flex flex-col overflow-hidden mr-2">
            <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent truncate">
                    Dâm Tu Thần Bút
                </h1>
            </div>
            <p className="text-xs text-gray-300 mt-1 truncate max-w-[160px] font-medium" title={story.title}>
                {story.title}
            </p>
         </div>
         
         <div className="flex gap-1.5 shrink-0">
             <button 
                onClick={closeStory} 
                className="p-2 text-gray-400 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                title="Thoát ra tủ sách"
             >
                <LogOut size={16} />
             </button>
             
             <button 
                onClick={onOpenSettings} 
                className="p-2 text-gray-400 hover:text-pink-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                title="Cài đặt truyện"
             >
                <SettingsIcon size={16} />
             </button>

             <button 
                onClick={onClose} 
                className="md:hidden p-2 text-rose-400 hover:text-rose-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                title="Đóng thanh bên"
             >
                <X size={16} />
             </button>
         </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-800 shrink-0 bg-gray-950/20">
        <button 
            onClick={() => setTab('chapters')} 
            className={`flex-1 py-3 px-2 text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                tab === 'chapters' 
                    ? 'text-pink-400 border-b-2 border-pink-500 bg-pink-500/5' 
                    : 'text-gray-400 hover:text-gray-200'
            }`}
        >
            <BookOpen size={14} />
            <span>Chương</span>
        </button>

        <button 
            onClick={() => setTab('world')} 
            className={`flex-1 py-3 px-2 text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                tab === 'world' 
                    ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-500/5' 
                    : 'text-gray-400 hover:text-gray-200'
            }`}
        >
            <Globe2 size={14} />
            <span>Thế giới</span>
        </button>

        <button 
            onClick={() => setTab('knowledge')} 
            className={`flex-1 py-3 px-2 text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                tab === 'knowledge' 
                    ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5' 
                    : 'text-gray-400 hover:text-gray-200'
            }`}
        >
            <Users size={14} />
            <span>Nhân vật</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-900/50">
        {tab === 'chapters' && (
          <div className="p-3 space-y-1.5">
            {story.chapters.map(chapter => (
              <button 
                  key={chapter.id} 
                  onClick={() => { selectChapter(chapter.id); if (window.innerWidth < 768) onClose(); }} 
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all ${
                      activeChapterId === chapter.id 
                          ? 'bg-gray-800 text-gray-50 shadow-md border-l-3 border-pink-500' 
                          : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`}
              >
                <div className="font-semibold text-xs truncate text-gray-200">{chapter.title}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {(chapter.content || "").replace(/\\n/g, ' ').slice(0, 45) || "Chương trống..."}
                </div>
              </button>
            ))}
            <button 
                onClick={addChapter} 
                className="w-full py-2.5 mt-2 border border-dashed border-gray-700 hover:border-pink-500/50 rounded-xl text-gray-400 hover:text-pink-400 transition-colors text-xs uppercase font-bold flex items-center justify-center gap-1.5"
            >
                <Plus size={14} />
                <span>Thêm chương mới</span>
            </button>
          </div>
        )}

        {tab === 'world' && (
            <div className="p-4 space-y-4">
                {story.storyBible && (
                    <div className="space-y-3">
                        <div className="bg-gray-800/60 border border-gray-700/80 p-3 rounded-xl">
                            <h3 className="text-xs font-bold text-pink-400 uppercase mb-1.5">Thế giới (Story Bible)</h3>
                            <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{story.storyBible.world}</p>
                        </div>
                        <div className="bg-gray-800/60 border border-gray-700/80 p-3 rounded-xl">
                            <h3 className="text-xs font-bold text-rose-400 uppercase mb-1.5">Quy tắc / Cấm kỵ</h3>
                            <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{story.storyBible.rules}</p>
                        </div>
                        <div className="bg-gray-800/60 border border-gray-700/80 p-3 rounded-xl">
                            <h3 className="text-xs font-bold text-amber-400 uppercase mb-1.5">Trạng thái Cốt truyện</h3>
                            <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{story.storyBible.arc}</p>
                        </div>
                    </div>
                )}
                
                <div className="pt-3 border-t border-gray-800">
                    <div className="mb-3">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                            Thêm thông tin Lore (Ghi chú cố định)
                        </label>
                        <div className="flex gap-1.5 mb-2">
                            <input 
                                type="text" 
                                value={loreInput}
                                onChange={e => setLoreInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') addLoreItem();
                                }}
                                className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-100 focus:border-amber-500 outline-none placeholder-gray-600"
                                placeholder="VD: Cổ độc chỉ giải được bằng cửu dương chân khí..."
                            />
                            <button 
                                onClick={addLoreItem}
                                className="px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 text-xs font-semibold"
                            >
                                Thêm
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            {(story.worldLore || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start group bg-gray-800/60 rounded-lg p-2 border border-gray-800 hover:border-gray-700">
                                    <span className="text-xs text-gray-300 leading-snug">{item}</span>
                                    <button 
                                        onClick={() => removeLoreItem(idx)}
                                        className="text-gray-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 px-1 text-[11px] font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {(story.worldLore || []).length === 0 && (
                                <div className="text-center text-gray-500 text-xs italic py-3">Chưa có ghi chú lore nào.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {tab === 'knowledge' && (
            <div className="p-3">
                <CharacterList characters={characters} />
            </div>
        )}
      </div>
    </div>
  );
};