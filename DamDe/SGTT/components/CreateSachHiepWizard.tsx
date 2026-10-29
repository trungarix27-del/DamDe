import React, { useState } from 'react';
import { useSachHiep } from '../state/SachHiepContext';
import { SACH_HIEP_PRONOUN_STYLES, compileSachHiepPronounStyle } from '../sachHiepConstants';
import { ArrowLeft, User, Globe, PenTool, Flame, Settings2, Sparkles, Loader2, HeartHandshake } from 'lucide-react';

interface Props {
  onCancel: () => void;
}

export const CreateSachHiepWizard: React.FC<Props> = ({ onCancel }) => {
  const { createStory, isGenerating, generationStatus } = useSachHiep();
  
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Dâm 18+ Đô Thị Hiện Đại");
  const [writingStyle, setWritingStyle] = useState(
    "Gợi cảm, táo bạo, miêu tả chi tiết đường cong thể xác, cảm giác da thịt và khoái cảm hoan lạc, tả chi tiết cơ thể phụ nữ và các hành vi dâm dục gợi cảm"
  );
  const [pov, setPov] = useState("Ngôi thứ 3 (Toàn tri - Hắn & Nàng)");
  const [pronounStyleId, setPronounStyleId] = useState("do_thi_sac");
  const [customPronounPrompt, setCustomPronounPrompt] = useState("");

  // Protagonist (Mục nhân vật chính do người dùng yêu cầu)
  const [protagonistName, setProtagonistName] = useState("");
  const [protagonistDesc, setProtagonistDesc] = useState("");

  // Setting & Synopsis (Để trống hoàn toàn để người dùng tự ghi)
  const [setting, setSetting] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  const quickGenres = [
    'Dâm 18+ Đô Thị Hiện Đại',
    'Nữ Tổng Tài & Phi Công',
    'Chị Dâu & Em Chồng',
    'Mỹ Phụ Hàng Xóm',
    'Học Đường 18+'
  ];

  const getFinalPronounPrompt = () => {
    if (pronounStyleId === 'custom') return customPronounPrompt;
    const style = SACH_HIEP_PRONOUN_STYLES.find(s => s.id === pronounStyleId);
    return style ? compileSachHiepPronounStyle(style.label, style.config) : "";
  };

  const handleCreate = async () => {
    const finalTitle = title.trim() || "Tiểu Thuyết Đô Thị 18+";
    await createStory(
      finalTitle,
      genre.trim() || "Dâm 18+ Đô Thị Hiện Đại",
      synopsis.trim(),
      setting.trim() || "Đô thị hiện đại",
      writingStyle.trim(),
      pov,
      getFinalPronounPrompt(),
      negativePrompt.trim(),
      true, // nsfw always enabled
      undefined,
      undefined,
      'original',
      undefined,
      undefined,
      protagonistName.trim(),
      protagonistDesc.trim()
    );
  };

  return (
    <div className="min-h-full bg-gray-950 text-gray-50 font-sans relative pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel} 
            className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-white"
            disabled={isGenerating}
            title="Quay lại tủ sách"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <span>Khởi Tạo Tiểu Thuyết 18+ Đô Thị</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-rose-400 border border-rose-800/80 uppercase">
                18+
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Thiết lập phong cách gợi cảm, nhục dục và nhân vật chính cho tác phẩm của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* 18+ Badge Banner */}
        <div className="bg-gradient-to-r from-rose-950/40 via-pink-950/30 to-gray-900 rounded-2xl p-4 border border-rose-800/50 flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-md">
            <Flame size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-300">Chế độ Dâm 18+ Đô Thị Hiện Đại (Đang kích hoạt)</h3>
            <p className="text-xs text-rose-200/70 mt-0.5">
              Tối ưu cho văn phong gợi cảm, miêu tả đường cong, da thịt, khoái cảm và các hành vi ân ái nồng nhiệt.
            </p>
          </div>
        </div>

        {/* Section 1: Thông tin cơ bản */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="text-pink-400" size={18} />
            <h2 className="text-base font-bold text-gray-200">Thông tin tiểu thuyết</h2>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Tiêu đề truyện
            </label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-pink-500 focus:outline-none transition-colors" 
              placeholder="VD: Cám Dỗ Nơi Công Sở, Hàng Xóm Kiều Diễm, Nữ Tổng Tài & Chàng Phi Công..." 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Thể loại
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickGenres.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(g)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    genre === g 
                      ? 'bg-pink-600/30 border-pink-500 text-pink-300 font-bold' 
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              value={genre} 
              onChange={(e) => setGenre(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-pink-500 focus:outline-none transition-colors" 
              placeholder="Nhập thể loại..." 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Góc nhìn người kể chuyện
            </label>
            <select 
              value={pov} 
              onChange={(e) => setPov(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:border-pink-500 focus:outline-none transition-colors"
            >
              <option value="Ngôi thứ 3 (Toàn tri - Hắn & Nàng)">Ngôi thứ 3 (Toàn tri - Hắn, Nàng, Mỹ phụ, Kiều thê)</option>
              <option value="Ngôi thứ 1 (Tôi - Trực tiếp cảm nhận)">Ngôi thứ 1 (Tôi - Trải nghiệm trực quan góc nhìn người trong cuộc)</option>
            </select>
          </div>
        </div>

        {/* Section 2: Nhân vật chính (Dedicated Section) */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="text-pink-400" size={18} />
              <h2 className="text-base font-bold text-gray-200">Nhân vật chính</h2>
            </div>
            <span className="text-[11px] text-pink-400 bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-800/60 font-semibold">
              Thiết lập khởi đầu
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Tên nhân vật chính
            </label>
            <input 
              type="text" 
              value={protagonistName} 
              onChange={(e) => setProtagonistName(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-pink-500 focus:outline-none transition-colors" 
              placeholder="VD: Trần Phong, Hoàng Nam, Quân..." 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Đặc điểm, thân phận & ngoại hình
            </label>
            <textarea 
              value={protagonistDesc} 
              onChange={(e) => setProtagonistDesc(e.target.value)} 
              className="w-full h-28 bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-sm text-gray-100 placeholder-gray-600 focus:border-pink-500 focus:outline-none resize-none leading-relaxed custom-scrollbar transition-colors" 
              placeholder="VD: Chàng thanh niên 24 tuổi, thể lực dồi dào, cơ bắp cuồn cuộn, ánh mắt tự tin cuốn hút; là huấn luyện viên thể hình / chàng sinh viên thuê trọ cùng cô chủ nhà quyến rũ và cô em gái nóng bỏng..." 
            />
          </div>

          <div className="p-3 bg-gray-950/80 rounded-xl border border-gray-800/80 text-xs text-gray-400 flex items-start gap-2">
            <HeartHandshake size={15} className="text-pink-400 shrink-0 mt-0.5" />
            <span>
              <strong>Lưu ý:</strong> Dàn nhân vật nữ (mỹ phụ, nữ tổng tài, bạn gái, hàng xóm...) bạn sẽ từ từ thiết lập và bổ sung dần trong quá trình sáng tác truyện, không cần tạo ngay từ đầu.
            </span>
          </div>
        </div>

        {/* Section 3: Bối cảnh thế giới đô thị */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="text-pink-400" size={18} />
            <h2 className="text-base font-bold text-gray-200">Bối cảnh đô thị</h2>
          </div>
          <p className="text-xs text-gray-400">
            Mô tả môi trường sống, địa điểm diễn ra các câu chuyện và tình huống (để trống nếu muốn dùng bối cảnh đô thị hiện đại chung).
          </p>
          <textarea 
            value={setting} 
            onChange={(e) => setSetting(e.target.value)} 
            className="w-full h-24 bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-sm text-gray-100 placeholder-gray-600 focus:border-pink-500 focus:outline-none resize-none leading-relaxed custom-scrollbar transition-colors" 
            placeholder="VD: Thành phố lớn hiện đại, các khu chung cư cao cấp, phòng tập gym, công sở văn phòng, khách sạn sang trọng..." 
          />
        </div>

        {/* Section 4: Cảm hứng & Dàn ý cốt truyện (Synopsis) */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-pink-400" size={18} />
            <h2 className="text-base font-bold text-gray-200">Ý tưởng cốt truyện</h2>
          </div>
          <p className="text-xs text-gray-400">
            Nhập mở đầu, tình huống nảy sinh hoặc các biến cố bạn mong muốn (tự do ghi chép theo ý thích):
          </p>
          <textarea 
            value={synopsis} 
            onChange={(e) => setSynopsis(e.target.value)} 
            className="w-full h-32 bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-sm text-gray-100 placeholder-gray-600 focus:border-pink-500 focus:outline-none resize-none leading-relaxed custom-scrollbar transition-colors" 
            placeholder="VD: Nam chính dọn đến thuê một căn hộ chung cư cao cấp. Tại đây anh tình cờ làm quen với người phụ nữ hàng xóm xinh đẹp, quý phái nhưng hôn nhân đang rạn nứt. Những lần chạm mặt tình cờ dần biến thành những tiếp xúc da thịt đầy đam mê..." 
          />
        </div>

        {/* Section 5: Văn phong gợi cảm & Xưng hô */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <PenTool className="text-pink-400" size={18} />
            <h2 className="text-base font-bold text-gray-200">Văn phong & Xưng hô</h2>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Văn phong miêu tả
            </label>
            <textarea 
              value={writingStyle} 
              onChange={(e) => setWritingStyle(e.target.value)} 
              className="w-full h-20 bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-xs sm:text-sm text-gray-100 placeholder-gray-600 focus:border-pink-500 focus:outline-none resize-none leading-relaxed custom-scrollbar transition-colors" 
              placeholder="Gợi cảm, táo bạo, miêu tả chi tiết đường cong thể xác..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Hệ thống xưng hô
            </label>
            <select 
              value={pronounStyleId} 
              onChange={(e) => setPronounStyleId(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:border-pink-500 focus:outline-none transition-colors"
            >
              {SACH_HIEP_PRONOUN_STYLES.map(style => (
                <option key={style.id} value={style.id}>{style.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              {SACH_HIEP_PRONOUN_STYLES.find(s => s.id === pronounStyleId)?.description}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Điều cấm kỵ (Negative Prompt - tùy chọn)
            </label>
            <input 
              type="text" 
              value={negativePrompt} 
              onChange={(e) => setNegativePrompt(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-100 placeholder-gray-600 focus:border-pink-500 focus:outline-none transition-colors" 
              placeholder="VD: Cấm NTR, cấm bê đê, tránh các từ ngữ quá thô tục phản cảm..." 
            />
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <button 
            onClick={handleCreate} 
            disabled={isGenerating} 
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base text-white shadow-xl transition-all flex items-center justify-center gap-2.5 ${
              isGenerating
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 shadow-pink-950/50 hover:shadow-pink-900/60 hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{generationStatus || 'Đang khởi tạo truyện...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Khởi Tạo Truyện & Bắt Đầu Viết</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
