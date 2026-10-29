
import React from 'react';
import { AlertTriangle, PlusCircle, PlayCircle, X } from 'lucide-react';

interface ChapterLimitModalProps {
    current: number;
    limit: number;
    model: string;
    onClose: () => void;
    onAddChapter: () => void;
    onContinue: () => void;
}

export const ChapterLimitModal: React.FC<ChapterLimitModalProps> = ({ current, limit, model, onClose, onAddChapter, onContinue }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scaleIn">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-900/30 rounded-full">
                            <AlertTriangle className="text-amber-500" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-100">Sắp chạm giới hạn chương</h3>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        Model <span className="text-[#5b639a] font-bold">{model}</span> hoạt động tốt nhất trong phạm vi <span className="text-gray-200 font-bold">{limit.toLocaleString()}</span> chữ/ chương, bạn nên chuyển sang viết tiếp nội dung ở chương mới
                    </p>

                    <div className="space-y-3">
                        <button 
                            onClick={onAddChapter}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-[#5b639a] hover:bg-[#4a5182] text-white rounded-xl font-bold transition-all shadow-lg"
                        >
                            <PlusCircle size={18} />
                            Thêm chương mới
                        </button>
                        <button 
                            onClick={onContinue}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-bold transition-all border border-gray-700"
                        >
                            <PlayCircle size={18} />
                            Viết tiếp (nếu bạn vẫn muốn viết chương hiện tại)
                        </button>
                    </div>
                </div>
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};
