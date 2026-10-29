import React from 'react';
import { BookOpen, Globe, ChevronRight, MessageCircle, Palette, Film, Heart } from 'lucide-react';

interface FeatureListProps {
  onSelectCreateSachHiep: () => void;
  onSelectCreateGame: () => void;
  onSelectCharacterChat: () => void;
  onBack: () => void;
}

export const FeatureList: React.FC<FeatureListProps> = ({
  onSelectCreateSachHiep,
  onSelectCreateGame,
  onSelectCharacterChat,
  onBack,
}) => {
  return (
    <div className="min-h-full bg-gray-950 text-gray-50 font-sans">
      {/* Header */}
      <div className="flex items-center p-6">
        <h1 className="text-2xl font-medium text-gray-200">Trung tâm sáng tạo AI</h1>
      </div>

      {/* Body */}
      <div className="px-6 pb-8 max-w-6xl mx-auto space-y-5">
        
        {/* Tạo Truyện Sắc Hiệp Card */}
        <div
          onClick={onSelectCreateSachHiep}
          className="relative overflow-hidden rounded-xl md:rounded-2xl shadow-sm cursor-pointer transition-transform hover:-translate-y-1 h-[100px] md:h-[140px]"
          style={{
            background: 'linear-gradient(to right, #8a1a4c, #b32d66)',
          }}
        >
          {/* Background Icon */}
          <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 opacity-10">
            <Heart className="w-24 h-24 md:w-40 md:h-40" />
          </div>

          <div className="relative h-full px-4 md:px-8 flex items-center">
            {/* Left Icon */}
            <div className="w-[40px] h-[40px] md:w-[60px] md:h-[60px] rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Heart className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>

            {/* Content */}
            <div className="ml-4 md:ml-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 md:gap-3">
                <h2 className="text-base md:text-xl font-bold text-white tracking-wide">AI Sáng tạo Truyện Sắc Hiệp</h2>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-[9px] md:text-[11px] text-white font-medium">18+</span>
              </div>
              <p className="text-[11px] md:text-sm text-white/80 mt-1 md:mt-2 line-clamp-2 font-medium">
                Tạo ra những câu chuyện tình cảm mãnh liệt và đầy đam mê với sự hỗ trợ của AI
              </p>
            </div>

            {/* Right Arrow */}
            <div className="ml-2 md:ml-4 shrink-0">
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
            </div>
          </div>
        </div>

        {/* Chat với Nhân vật Card */}
        <div
          onClick={onSelectCharacterChat}
          className="relative overflow-hidden rounded-xl md:rounded-2xl shadow-sm cursor-pointer transition-transform hover:-translate-y-1 h-[100px] md:h-[140px]"
          style={{
            background: 'linear-gradient(to right, #c06c84, #d98093)',
          }}
        >
          {/* Background Icon */}
          <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 opacity-10">
            <MessageCircle className="w-24 h-24 md:w-40 md:h-40" />
          </div>

          <div className="relative h-full px-4 md:px-8 flex items-center">
            {/* Left Icon */}
            <div className="w-[40px] h-[40px] md:w-[60px] md:h-[60px] rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <MessageCircle className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>

            {/* Content */}
            <div className="ml-4 md:ml-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 md:gap-3">
                <h2 className="text-base md:text-xl font-bold text-white tracking-wide">Role Play Chat</h2>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-[9px] md:text-[11px] text-white font-medium">beta</span>
              </div>
              <p className="text-[11px] md:text-sm text-white/80 mt-1 md:mt-2 line-clamp-2 font-medium">
                Trò chuyện với các nhân vật AI yêu thích của bạn, nhập vai và khám phá câu chuyện
              </p>
            </div>

            {/* Right Arrow */}
            <div className="ml-2 md:ml-4 shrink-0">
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
            </div>
          </div>
        </div>

        {/* Tạo Game Card */}
        <div
          onClick={onSelectCreateGame}
          className="relative overflow-hidden rounded-xl md:rounded-2xl shadow-sm cursor-pointer transition-transform hover:-translate-y-1 h-[100px] md:h-[140px]"
          style={{
            background: 'linear-gradient(to right, #3b6b4c, #4a7c59)',
          }}
        >
          {/* Background Icon */}
          <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 opacity-10">
            <Globe className="w-24 h-24 md:w-40 md:h-40" />
          </div>

          <div className="relative h-full px-4 md:px-8 flex items-center">
            {/* Left Icon */}
            <div className="w-[40px] h-[40px] md:w-[60px] md:h-[60px] rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Globe className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>

            {/* Content */}
            <div className="ml-4 md:ml-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 md:gap-3">
                <h2 className="text-base md:text-xl font-bold text-white tracking-wide">Sáng tạo Thế giới Game</h2>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-[9px] md:text-[11px] text-white font-medium">beta</span>
              </div>
              <p className="text-[11px] md:text-sm text-white/80 mt-1 md:mt-2 line-clamp-2 font-medium">
                Xây dựng thế giới quan và cốt truyện game hấp dẫn, sắp xếp câu chuyện game của bạn
              </p>
            </div>

            {/* Right Arrow */}
            <div className="ml-2 md:ml-4 shrink-0">
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
