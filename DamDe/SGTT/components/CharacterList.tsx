import React, { useState } from 'react';
import { Character } from '../types';

interface Props {
  characters: Character[];
}

export const CharacterList: React.FC<Props> = ({ characters }) => {
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'psych' | 'stats'>('info');

  if (characters.length === 0) {
    return <div className="text-gray-500 italic text-sm p-4">Chưa tìm thấy nhân vật nào. Hãy viết thêm và dùng chức năng "Quét thực thể" để AI phân tích.</div>;
  }

  // Safe checks for new schema vs old schema characters
  const getSafeAppearance = (char: Character) => {
      if (typeof char.appearance === 'string') return { general: char.appearance, face: '', body: '', hair: '', clothing: '' };
      return char.appearance || { general: "Chưa có thông tin", face: '', body: '', hair: '', clothing: '' };
  };

  return (
    <>
      <div className="space-y-4 p-4 pb-20">
        {characters.map(char => (
          <div 
            key={char.id} 
            onClick={() => setSelectedChar(char)}
            className="group relative bg-gray-850 border border-gray-700 rounded-lg p-3 hover:border-primary-500 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary-900/10 hover:-translate-y-0.5"
            title="Nhấn để xem chi tiết Profile"
          >
            {/* FIXED HEADER: Name takes priority, Role is constrained */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-bold text-sm text-gray-200 group-hover:text-primary-400 transition-colors line-clamp-2 leading-tight">
                  {char.name}
              </h4>
              <span 
                className="shrink-0 max-w-[45%] truncate text-[10px] px-1.5 py-0.5 rounded-full bg-gray-900 text-gray-400 border border-gray-800 group-hover:border-primary-500/50 group-hover:text-primary-400 transition-colors mt-0.5"
                title={char.role}
              >
                {char.role}
              </span>
            </div>
            
            <p className="text-xs text-gray-400 line-clamp-2 mb-3 h-8 leading-relaxed">
                {char.core_personality ? `[${char.core_personality}] ` : ''}{char.description}
            </p>
            
            {char.status && (
                <div className="mb-2 text-[10px] text-yellow-500 bg-yellow-900/10 px-2 py-1 rounded border border-yellow-900/30 truncate">
                    Trạng thái: {char.status}
                </div>
            )}
            
            <div className="flex flex-wrap gap-1 mb-1 overflow-hidden h-5">
              {char.traits.slice(0, 3).map((trait, i) => (
                <span key={i} className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-800 whitespace-nowrap">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CHARACTER DETAIL MODAL */}
      {selectedChar && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedChar(null)}
        >
            <div 
                className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-start bg-gray-850/50">
                    <div className="pr-8 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-50 leading-tight">{selectedChar.name}</h3>
                        </div>
                        <span className="inline-block text-xs font-bold px-2 py-1 rounded bg-primary-900/30 text-primary-400 border border-primary-900/50 uppercase tracking-wider mt-1">
                            {selectedChar.role}
                        </span>
                    </div>
                    <button 
                        onClick={() => setSelectedChar(null)}
                        className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-50 hover:bg-gray-800 rounded transition-colors text-xs font-bold uppercase"
                    >
                        ĐÓNG
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800 bg-gray-800/30">
                    <button onClick={() => setDetailTab('info')} className={`flex-1 py-3 text-xs font-bold uppercase ${detailTab === 'info' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-50'}`}>Hồ Sơ</button>
                    <button onClick={() => setDetailTab('psych')} className={`flex-1 py-3 text-xs font-bold uppercase ${detailTab === 'psych' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-50'}`}>Tâm Lý</button>
                    <button onClick={() => setDetailTab('stats')} className={`flex-1 py-3 text-xs font-bold uppercase ${detailTab === 'stats' ? 'text-yellow-400 border-b-2 border-yellow-500' : 'text-gray-500 hover:text-gray-50'}`}>Trạng thái</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    
                    {detailTab === 'info' && (
                        <div className="space-y-4 animate-fadeIn">
                             {/* Description */}
                             <div className="text-sm text-gray-300 leading-7 whitespace-pre-wrap">
                                {selectedChar.description}
                            </div>

                            {/* Appearance Box */}
                            <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800 space-y-3">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-800 pb-1">
                                    Ngoại hình
                                </label>
                                {(() => {
                                    const app = getSafeAppearance(selectedChar);
                                    return (
                                        <>
                                            <p className="text-sm text-gray-300 italic">{app.general}</p>
                                            {app.face && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-16 shrink-0">Khuôn mặt:</span> <span className="text-gray-300">{app.face}</span></div>}
                                            {app.hair && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-16 shrink-0">Tóc:</span> <span className="text-gray-300">{app.hair}</span></div>}
                                            {app.body && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-16 shrink-0">Dáng:</span> <span className="text-gray-300">{app.body}</span></div>}
                                            {app.clothing && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-16 shrink-0">Phục trang:</span> <span className="text-gray-300">{app.clothing}</span></div>}
                                        </>
                                    );
                                })()}
                            </div>
                            
                            {selectedChar.voiceSample && (
                                <div className="bg-gray-800/30 p-3 rounded border border-gray-700 italic text-gray-400 text-xs">
                                    <span className="text-gray-500 not-italic font-bold mr-2">Voice:</span> 
                                    "{selectedChar.voiceSample}"
                                </div>
                            )}
                        </div>
                    )}

                    {detailTab === 'psych' && (
                        <div className="animate-fadeIn space-y-4">
                            <div className="bg-purple-900/10 p-4 rounded-lg border border-purple-500/20 mb-4">
                                <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">Tính cách cốt lõi</h4>
                                <p className="text-sm text-gray-300">{selectedChar.core_personality || "Chưa xác định"}</p>
                            </div>
                            
                            <div className="text-center text-gray-600 text-[10px] italic py-4">
                                Các chỉ số Big Five được AI sử dụng ngầm để mô phỏng hành vi.
                            </div>
                        </div>
                    )}

                    {detailTab === 'stats' && (
                         <div className="animate-fadeIn space-y-4">
                             {/* Short Status from Extractor */}
                             <div className="bg-yellow-900/10 p-4 rounded-lg border border-yellow-900/30 mb-4">
                                <h4 className="text-xs font-bold text-yellow-500 uppercase mb-2">Trạng thái hiện tại</h4>
                                <p className="text-sm text-gray-300">{selectedChar.status || "Bình thường"}</p>
                             </div>
                             
                             <div className="text-center text-gray-600 text-[10px] italic py-4">
                                Ma trận cảm xúc được AI sử dụng ngầm để điều hướng hội thoại.
                             </div>
                         </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-gray-800 bg-gray-850/30">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {selectedChar.traits.map((t, i) => (
                            <span key={i} className="text-[10px] px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-400">
                                #{t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};