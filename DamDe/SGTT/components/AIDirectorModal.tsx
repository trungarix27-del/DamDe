import React from 'react';
import { Compass, Sparkles, X, RotateCcw, Play, CheckCircle2, AlertOctagon } from 'lucide-react';

interface AIDirectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    chapterTitle?: string;
    mainText: string;
    onMainChange: (val: string) => void;
    endingText: string;
    onEndingChange: (val: string) => void;
    onGenerate: () => void;
    isGenerating: boolean;
}

export const AIDirectorModal: React.FC<AIDirectorModalProps> = ({
    isOpen,
    onClose,
    chapterTitle,
    mainText,
    onMainChange,
    endingText,
    onEndingChange,
    onGenerate,
    isGenerating
}) => {
    if (!isOpen) return null;

    const hasAnyContent = mainText.trim().length > 0 || endingText.trim().length > 0;

    const handleClear = () => {
        onMainChange('');
        onEndingChange('');
    };

    const handleGenerateNow = () => {
        onClose();
        onGenerate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div 
                className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 bg-gray-950/60">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-900/40 text-white shrink-0">
                            <Compass size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base sm:text-lg font-bold text-gray-100">
                                    Chỉ Đạo AI
                                </h2>
                                {chapterTitle && (
                                    <span className="text-xs font-semibold text-pink-300 bg-pink-950/80 border border-pink-700/60 px-2 py-0.5 rounded-lg max-w-[200px] sm:max-w-[260px] truncate" title={chapterTitle}>
                                        {chapterTitle}
                                    </span>
                                )}
                                {hasAnyContent && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-950 text-pink-400 border border-pink-800/60 uppercase">
                                        Đã lưu chỉ đạo
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Dàn ý & chỉ đạo được lưu riêng cho chương này, thoải mái tinh chỉnh lại bất cứ lúc nào.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-xl transition-colors"
                        title="Đóng"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
                    {/* Section 1: CHÍNH */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-pink-400 flex items-center gap-1.5">
                                <Sparkles size={16} />
                                <span>1. Mục Chính (Nội dung cần viết ở chương này)</span>
                            </label>
                            <span className="text-[11px] text-gray-400">Diễn biến & tình tiết cốt lõi</span>
                        </div>
                        <p className="text-xs text-gray-400">
                            Nhập những gì bạn muốn AI triển khai (hành động nhân vật, đối thoại, biến cố, công pháp, cảm xúc...):
                        </p>
                        <textarea
                            value={mainText}
                            onChange={(e) => onMainChange(e.target.value)}
                            disabled={isGenerating}
                            placeholder="Ví dụ: Lâm Phong cùng Sư tôn tiến vào bí cảnh cổ điện, tình cờ phát hiện trận pháp thượng cổ bị kích hoạt. Hai người hợp lực vừa né tránh cạm bẫy vừa đối thoại gắn kết tình cảm, phá vỡ tầng phong ấn thứ nhất..."
                            className="w-full h-32 sm:h-36 bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all resize-none leading-relaxed custom-scrollbar font-sans"
                        />
                    </div>

                    {/* Section 2: KẾT */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                                <AlertOctagon size={16} />
                                <span>2. Mục Kết (Điểm kết thúc & Dừng bút)</span>
                            </label>
                            <span className="text-[11px] text-amber-400/80 font-medium">Ngưng lại, không chế thêm</span>
                        </div>
                        <p className="text-xs text-gray-400">
                            Sau khi AI triển khai ý ở phần này xong, hệ thống sẽ <strong className="text-amber-300">dừng bút ngay lập tức</strong>, tuyệt đối không tự bịa thêm tình tiết mới:
                        </p>
                        <textarea
                            value={endingText}
                            onChange={(e) => onEndingChange(e.target.value)}
                            disabled={isGenerating}
                            placeholder="Ví dụ: Trận pháp vừa vỡ, một bóng đen thần bí lướt qua mang theo tàn quyển cổ thư biến mất vào hư không, để lại Lâm Phong và Sư tôn nhìn nhau ngơ ngác. (Đến đây dừng bút lại, không viết thêm)."
                            className="w-full h-24 sm:h-28 bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none leading-relaxed custom-scrollbar font-sans"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-gray-800 bg-gray-950/70 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={!hasAnyContent || isGenerating}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl border border-gray-700/60 hover:border-rose-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <RotateCcw size={14} />
                        <span>Xóa chỉ đạo</span>
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                        >
                            Đóng & Lưu
                        </button>

                        <button
                            type="button"
                            onClick={handleGenerateNow}
                            disabled={isGenerating}
                            className={`flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-lg transition-all ${
                                isGenerating 
                                    ? 'bg-gray-700 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 shadow-pink-900/30 hover:shadow-pink-900/50'
                            }`}
                        >
                            <Play size={15} fill="currentColor" />
                            <span>{isGenerating ? 'Đang viết...' : 'Viết tiếp ngay'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
