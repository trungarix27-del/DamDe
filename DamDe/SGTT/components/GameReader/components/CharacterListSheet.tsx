import React, { useState } from 'react';
import { X } from 'lucide-react';
import { GameManager } from '../../../infra/gameManager';

export const CharacterListSheet: React.FC<{ gameManager: GameManager; onClose: () => void }> = ({ gameManager, onClose }) => {
  const chars = gameManager.aiCharacters;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-[#121212] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md h-[80vh] max-h-[95vh] flex flex-col overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
        
        {/* Drag Handle */}
        <div className="flex justify-center my-3 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="m11 13.73-4 6.93"/></svg>
            </div>
            <h3 className="text-lg font-bold text-white tracking-wider">Hồ sơ nhân vật ({chars.length})</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {chars.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-white/30">Chưa có dữ liệu nhân vật</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chars.map((char, index) => (
                <CharacterCard key={index} char={char} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CharacterCard: React.FC<{ char: any }> = ({ char }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const memories = char.memory || [];
  const reversedMemories = [...memories].reverse().slice(0, 5);

  const identity = char.identity || 'Chưa rõ';
  const personality = char.personality || 'Chưa có';
  const motivation = char.motivation || 'Chưa rõ';
  const appearance = char.appearance || 'Không rõ ràng';
  const status = char.status || 'Bình thường';
  const other = char.other || '';
  const equipment = char.equipment;
  const backpack = char.backpack;
  const imagePath = char.imagePath;
  const hasImage = !!imagePath;

  return (
    <div className="bg-[#222222] rounded-xl border border-purple-400/20 shadow-[0_4px_6px_rgba(0,0,0,0.5)] overflow-hidden transition-all">
      {/* Tile Header */}
      <div 
        className="flex items-center p-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-[52px] h-[52px] rounded-full bg-purple-500/10 border-[1.5px] border-purple-400/50 flex items-center justify-center overflow-hidden shrink-0 mr-4">
          {hasImage ? (
            <img src={imagePath} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-purple-400 text-[22px] font-bold">{char.name?.[0] || '?'}</span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-bold text-base truncate">{char.name || '???'}</h4>
          <div className="mt-1.5 flex">
            <div className="px-2 py-0.5 bg-blue-500/15 rounded border border-blue-500/40 truncate max-w-full">
              <span className="text-blue-400 text-[10px] font-medium">{identity}</span>
            </div>
          </div>
        </div>
        
        <div className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-[#1E1E1E] p-4 rounded-b-xl border-t border-white/5">
          {hasImage && (
            <div className="h-[300px] w-full mb-4 bg-black/25 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
              <img src={imagePath} alt={char.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          )}

          {/* Section 1: Basic Info */}
          <SectionHeader title="Thông tin cơ bản" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} />
          
          <TextBox label="Thân phận" content={identity} />
          <div className="h-2"></div>
          <TextBox label="Trạng thái hiện tại" content={status} />
          <div className="h-2"></div>
          <TextBox label="Tính cách" content={personality} />
          <div className="h-2"></div>
          <TextBox label="Động lực chính" content={motivation} />
          <div className="h-2"></div>
          <TextBox label="Ngoại hình" content={appearance} />
          
          {other && (
            <>
              <div className="h-2"></div>
              <TextBox label="Ghi chú" content={other} />
            </>
          )}
          
          <div className="h-5"></div>

          {/* Section 2: Equipment */}
          <SectionHeader title="Trang bị & Vật phẩm" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-11"/><path d="M10 22V10"/><path d="M14 22V10"/><path d="M4 10l2-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2l2 6"/><path d="M12 2v8"/></svg>} />
          <div className="flex gap-3 items-start">
            <div className="flex-1 min-w-0"><InventoryColumn label="Trang bị" data={equipment} icon={<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>} /></div>
            <div className="flex-1 min-w-0"><InventoryColumn label="Ba lô" data={backpack} icon={<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/><path d="M4 12H2v4h2"/><path d="M20 12h2v4h-2"/><path d="M8 12h8v4H8z"/></svg>} /></div>
          </div>

          <div className="h-5"></div>
          <div className="h-[1px] bg-white/10 w-full mb-5"></div>
          
          {/* Section 3: Memories */}
          <SectionHeader title={`Ký ức nhân vật (${memories.length})`} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v2"/><path d="M14 10v.2A3 3 0 0 0 15.1 16v0H19v0h0a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3h0a3 3 0 0 0-3 3v2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>} />
          
          {reversedMemories.length === 0 ? (
            <div className="py-2">
              <p className="text-white/25 italic text-xs">Chưa có mảnh ký ức nào...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reversedMemories.map((mem: any, idx: number) => {
                const timeStr = typeof mem.time === 'number' ? `DAY ${mem.time}` : `${mem.time}`;
                return (
                  <div key={idx} className="flex items-start gap-2.5 mb-2">
                    <span className="text-purple-400 text-[10px] font-mono mt-0.5 whitespace-nowrap">{timeStr}</span>
                    <p className="text-white/60 text-xs leading-[1.3] flex-1">{mem.content || ''}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="text-purple-400/80">{icon}</div>
    <span className="text-purple-400/90 text-sm font-bold tracking-wider">{title}</span>
    <div className="flex-1 h-[1px] bg-white/10"></div>
  </div>
);

const TextBox: React.FC<{ label: string; content: string }> = ({ label, content }) => (
  <div className="flex flex-col">
    <span className="text-gray-500 text-[11px] mb-1">{label}</span>
    <div className="w-full p-2.5 bg-black/25 rounded-md">
      <p className="text-white/70 text-xs leading-[1.4] whitespace-pre-wrap">{content}</p>
    </div>
  </div>
);

const InventoryColumn: React.FC<{ label: string; data: any; icon: React.ReactNode }> = ({ label, data, icon }) => {
  let content = "Không có";
  if (data) {
    if (Array.isArray(data)) {
      content = data.length === 0 ? "Trống" : data.join('\n');
    } else {
      content = String(data);
      if (!content) content = "Trống";
    }
  }

  return (
    <div className="p-2.5 bg-white/5 rounded-lg flex flex-col">
      <div className="flex items-center gap-1 mb-1.5">
        <div className="text-white/40">{icon}</div>
        <span className="text-white/40 text-[11px]">{label}</span>
      </div>
      <p className="text-white/70 text-xs leading-[1.4] whitespace-pre-wrap">{content}</p>
    </div>
  );
};

