
import React, { useRef, useState } from 'react';
import { useStory } from '../state/StoryContext';

export const StoryLibrary: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => {
    const { storiesList, openStory, deleteStory, exportStory, importStory } = useStory();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            importStory(e.target.files[0]);
        }
        e.target.value = '';
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
    };

    const handleConfirmDelete = async (id: string) => {
        try {
            await deleteStory(id);
        } catch (error) {
            console.error("Failed to delete story:", error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleExportTxt = (id: string) => {
        const story = storiesList.find(s => s.id === id);
        if (!story) return;

        let content = `${story.title.toUpperCase()}\n`;
        content += `Thể loại: ${story.genre}\n`;
        if (story.synopsis) content += `\n[TÓM TẮT]\n${story.synopsis}\n`;
        content += `\n====================================\n\n`;

        const sortedChapters = [...story.chapters].sort((a, b) => a.order - b.order);

        sortedChapters.forEach(ch => {
            content += `${ch.title.toUpperCase()}\n`;
            content += `------------------------------------\n`;
            content += `${ch.content}\n\n`;
            content += `====================================\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeTitle = story.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '_').trim(); 
        link.download = `${safeTitle}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const displayStories = storiesList.filter(story => story.storyType === 'gameBook');

    return (
        <div className="min-h-screen bg-gray-950 p-4 md:p-8 font-sans overflow-y-auto scrollbar-hide md:scrollbar-default">
             <div className="max-w-6xl mx-auto">
                <div className="flex justify-end items-center mb-4 md:mb-8 flex-wrap gap-2 md:gap-4">
                    <div className="flex gap-2 md:gap-4 w-full md:w-auto">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json,application/json" 
                            onChange={handleImport} 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 md:flex-none justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-50 font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-1 border border-gray-700 uppercase text-[10px] md:text-xs"
                        >
                            NHẬP (IMPORT)
                        </button>
                        <button 
                            onClick={onCreateNew}
                            className="flex-1 md:flex-none justify-center bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-gray-50 font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-1 border border-white/10 uppercase text-[10px] md:text-xs"
                        >
                            + TẠO MỚI
                        </button>
                    </div>
                </div>

                {displayStories.length === 0 ? (
                    <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
                        <h3 className="text-xl text-gray-400 font-medium mb-2">Chưa có game nào</h3>
                        <p className="text-gray-600 mb-6">Hãy bắt đầu hành trình sáng tạo ngay hôm nay.</p>
                        <button onClick={onCreateNew} className="text-primary-400 hover:text-primary-300 font-bold uppercase text-sm">Bắt đầu ngay &rarr;</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {displayStories.map(story => (
                            <div key={story.id} className="group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-primary-500/50 transition-all hover:shadow-2xl hover:shadow-primary-900/10 flex flex-col h-[240px] md:h-[280px]">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="p-4 md:p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2 md:mb-4">
                                        <div className="flex gap-1.5 md:gap-2">
                                            <span className="text-[10px] md:text-xs font-bold text-primary-400 px-1.5 md:px-2 py-0.5 md:py-1 bg-primary-900/20 rounded border border-primary-900/50 uppercase tracking-wider truncate max-w-[120px] md:max-w-[180px] inline-block">
                                                {story.genre}
                                            </span>
                                            {story.storyType === 'gameBook' && (
                                                <span className="text-[10px] md:text-xs font-bold text-green-400 px-1.5 md:px-2 py-0.5 md:py-1 bg-green-900/20 rounded border border-green-900/50 uppercase tracking-wider flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" className="md:w-3 md:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                                                    GAME
                                                </span>
                                            )}
                                        </div>
                                        {story.nsfw && <span className="text-[9px] md:text-[10px] text-red-500 border border-red-900/50 px-1 rounded">18+</span>}
                                    </div>
                                    
                                    <h3 className="text-lg md:text-xl font-bold text-gray-50 mb-1.5 md:mb-2 truncate font-serif group-hover:text-primary-400 transition-colors">
                                        {story.title}
                                    </h3>
                                    
                                    <p className="text-xs md:text-sm text-gray-500 line-clamp-2 mb-2 md:mb-4 flex-1">
                                        {story.synopsis}
                                    </p>
                                    
                                    <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs text-gray-600 mt-auto pt-3 md:pt-4 border-t border-gray-800 font-mono">
                                        <div>
                                            {story.chapters.length} CHƯƠNG
                                        </div>
                                        <div>
                                            {new Date(story.chapters[0]?.lastUpdated || story.createdAt).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                </div>
                                
                                {deletingId === story.id ? (
                                    <div className="flex bg-red-900/20 border-t border-red-900/50">
                                        <button 
                                            onClick={() => handleConfirmDelete(story.id)}
                                            className="flex-1 py-2.5 md:py-3 text-[11px] md:text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors animate-pulse uppercase"
                                        >
                                            XÁC NHẬN?
                                        </button>
                                        <div className="w-px bg-red-900/50"></div>
                                        <button 
                                            onClick={() => setDeletingId(null)}
                                            className="px-4 md:px-6 py-2.5 md:py-3 text-[11px] md:text-sm font-bold text-gray-400 hover:text-gray-50 transition-colors uppercase"
                                        >
                                            HỦY
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex bg-gray-950/50 border-t border-gray-800">
                                        <button 
                                            onClick={() => openStory(story.id)}
                                            className="flex-1 py-2.5 md:py-3 text-[11px] md:text-sm font-bold text-gray-300 hover:text-gray-50 hover:bg-gray-800 transition-colors uppercase"
                                        >
                                            {story.storyType === 'gameBook' ? 'CHƠI GAME' : 'MỞ TRUYỆN'}
                                        </button>
                                        
                                        <div className="w-px bg-gray-800"></div>
                                        
                                        <button 
                                            onClick={() => handleExportTxt(story.id)}
                                            className="px-2 md:px-3 py-2.5 md:py-3 text-[10px] md:text-sm font-bold text-gray-500 hover:text-emerald-400 hover:bg-gray-800 transition-colors flex items-center justify-center uppercase"
                                            title="Xuất file văn bản (TXT)"
                                        >
                                            TXT
                                        </button>

                                        <div className="w-px bg-gray-800"></div>
                                        
                                        <button 
                                            onClick={() => exportStory(story.id)}
                                            className="px-2 md:px-3 py-2.5 md:py-3 text-[10px] md:text-sm font-bold text-gray-500 hover:text-green-400 hover:bg-gray-800 transition-colors flex items-center justify-center uppercase"
                                            title="Xuất file Backup (JSON)"
                                        >
                                            JSON
                                        </button>
                                        
                                        <div className="w-px bg-gray-800"></div>
                                        
                                        <button 
                                            onClick={() => handleDeleteClick(story.id)}
                                            className="px-3 md:px-5 py-2.5 md:py-3 text-[10px] md:text-sm font-bold text-red-500/70 hover:text-red-400 hover:bg-red-900/10 transition-colors uppercase"
                                            title="Xóa truyện"
                                        >
                                            XÓA
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
             </div>
        </div>
    );
};