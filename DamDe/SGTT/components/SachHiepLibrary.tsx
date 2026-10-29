import React, { useRef, useState } from 'react';
import { useSachHiep } from '../state/SachHiepContext';
import { BookOpen, Plus, Upload, Download, Trash2, FileText, Sparkles, BookMarked } from 'lucide-react';

export const SachHiepLibrary: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => {
    const { storiesList, openStory, deleteStory, exportStory, exportStoryEpub, importStory } = useSachHiep();
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

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeTitle = story.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '_').trim(); 
        link.download = `${safeTitle || 'tieu_thuyet'}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gray-950 p-4 md:p-8 font-sans overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
                                <BookOpen className="text-pink-500 w-7 h-7" />
                                Tủ Truyện & Tiểu Thuyết AI
                            </h1>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                            Sáng tác chuyên sâu: Sắc Hiệp • Tu Tiên • Kỳ Ảo • Huyền Huyễn • Đồng Nhân
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json,application/json" 
                            onChange={handleImport} 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-medium py-2.5 px-4 rounded-xl border border-gray-700 shadow-sm transition-all text-xs md:text-sm"
                            title="Nhập bản thảo sao lưu JSON"
                        >
                            <Upload size={16} />
                            <span>Nhập Bản Thảo</span>
                        </button>
                        <button 
                            onClick={onCreateNew}
                            className="flex items-center gap-2 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-pink-900/30 hover:shadow-pink-900/50 transition-all text-xs md:text-sm transform hover:-translate-y-0.5"
                        >
                            <Plus size={18} />
                            <span>Tạo Truyện Mới</span>
                        </button>
                    </div>
                </div>

                {/* Story Grid / Empty state */}
                {storiesList.length === 0 ? (
                    <div className="text-center py-20 px-6 bg-gray-900/40 rounded-2xl border border-gray-800 border-dashed max-w-2xl mx-auto">
                        <div className="w-16 h-16 bg-pink-500/10 text-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-pink-500/20">
                            <BookMarked size={32} />
                        </div>
                        <h3 className="text-xl text-gray-200 font-semibold mb-2">Chưa có tác phẩm nào trong tủ truyện</h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Bắt đầu hành trình sáng tác ngay bây giờ với sự hỗ trợ của AI: lên dàn ý, kiến tạo bối cảnh thế giới, thiết lập nhân vật và chấp bút từng chương hồi.
                        </p>
                        <button 
                            onClick={onCreateNew} 
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-pink-900/40 transition-all text-sm"
                        >
                            <Sparkles size={18} />
                            Bắt đầu sáng tác ngay
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {storiesList.map(story => (
                            <div 
                                key={story.id} 
                                className="group relative bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden hover:border-pink-500/50 transition-all hover:shadow-xl hover:shadow-pink-950/30 flex flex-col h-[270px]"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="p-5 flex-1 flex flex-col overflow-hidden">
                                    <div className="flex justify-between items-start gap-2 mb-2.5">
                                        <span className="text-[11px] font-bold text-pink-400 px-2.5 py-0.5 bg-pink-950/40 rounded-full border border-pink-800/50 uppercase tracking-wider truncate max-w-[170px]">
                                            {story.genre || "Tiên Hiệp"}
                                        </span>
                                        {story.nsfw && (
                                            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/50 border border-rose-800/60 px-2 py-0.5 rounded-full shrink-0">
                                                18+ Sắc
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h3 
                                        onClick={() => openStory(story.id)}
                                        className="text-lg font-bold text-gray-100 mb-2 line-clamp-1 group-hover:text-pink-400 transition-colors cursor-pointer"
                                        title={story.title}
                                    >
                                        {story.title}
                                    </h3>
                                    
                                    <p className="text-xs text-gray-400 line-clamp-3 mb-3 flex-1 leading-relaxed">
                                        {story.synopsis || "Chưa có mô tả tóm tắt cho tác phẩm này."}
                                    </p>
                                    
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-3 border-t border-gray-800/80 font-mono">
                                        <div className="flex items-center gap-1.5 font-medium text-gray-300">
                                            <FileText size={13} className="text-pink-400" />
                                            <span>{story.chapters?.length || 0} CHƯƠNG</span>
                                        </div>
                                        <div>
                                            {new Date(story.chapters[0]?.lastUpdated || story.createdAt).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                </div>
                                
                                {deletingId === story.id ? (
                                    <div className="flex bg-rose-950/30 border-t border-rose-900/60 p-1">
                                        <button 
                                            onClick={() => handleConfirmDelete(story.id)}
                                            className="flex-1 py-2 text-xs font-bold text-rose-300 hover:text-rose-100 hover:bg-rose-900/50 rounded-lg transition-colors uppercase animate-pulse"
                                        >
                                            Xác nhận xóa?
                                        </button>
                                        <div className="w-px bg-rose-900/60 my-1"></div>
                                        <button 
                                            onClick={() => setDeletingId(null)}
                                            className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white rounded-lg transition-colors uppercase"
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center bg-gray-950/70 border-t border-gray-800 p-1 gap-1">
                                        <button 
                                            onClick={() => openStory(story.id)}
                                            className="flex-1 py-2 text-xs font-bold text-pink-400 hover:text-white hover:bg-pink-600 rounded-lg transition-all uppercase flex items-center justify-center gap-1.5"
                                        >
                                            <Sparkles size={14} />
                                            <span>Viết / Đọc</span>
                                        </button>
                                        
                                        <div className="w-px h-5 bg-gray-800"></div>
                                        
                                        <button 
                                            onClick={() => handleExportTxt(story.id)}
                                            className="px-2.5 py-2 text-[11px] font-bold text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors"
                                            title="Xuất file văn bản TXT"
                                        >
                                            TXT
                                        </button>

                                        <button 
                                            onClick={() => exportStoryEpub(story.id)}
                                            className="px-2.5 py-2 text-[11px] font-bold text-gray-400 hover:text-sky-400 hover:bg-gray-800 rounded-lg transition-colors"
                                            title="Xuất sách điện tử EPUB (đọc trên điện thoại, Kindle)"
                                        >
                                            EPUB
                                        </button>
                                        
                                        <button 
                                            onClick={() => exportStory(story.id)}
                                            className="px-2.5 py-2 text-[11px] font-bold text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors"
                                            title="Sao lưu JSON"
                                        >
                                            JSON
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleDeleteClick(story.id)}
                                            className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                                            title="Xóa truyện"
                                        >
                                            <Trash2 size={15} />
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