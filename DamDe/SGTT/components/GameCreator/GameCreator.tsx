import React, { useState } from 'react';
import { Globe, User, Route, Play, Map as MapIcon, Users, Edit3, Loader2 } from 'lucide-react';
import { GameStageWorkbench } from './GameStageWorkbench';
import { gameAiService } from '../../infra/gameAiService';

interface GameCreatorProps {
  onCancel: () => void;
}

export const GameCreator: React.FC<GameCreatorProps> = ({ onCancel }) => {
  const [worldRequirements, setWorldRequirements] = useState('');
  const [playerCharacterRequirements, setPlayerCharacterRequirements] = useState('');
  const [destinyAiRequirements, setDestinyAiRequirements] = useState('');
  const [firstDayRequirements, setFirstDayRequirements] = useState('');
  
  const [generateCharImages, setGenerateCharImages] = useState(false);
  const [useAiCharacterCount, setUseAiCharacterCount] = useState(true);
  const [aiCharacterCount, setAiCharacterCount] = useState(3);
  const [characterSource, setCharacterSource] = useState<'manual' | 'ai'>('ai');
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [allCharacterCards, setAllCharacterCards] = useState<any[]>([]);
  
  const [useAiScenes, setUseAiScenes] = useState(true);
  const [sceneCount, setSceneCount] = useState(5);
  const [generateSceneImages, setGenerateSceneImages] = useState(false);
  const [generateSceneMusic, setGenerateSceneMusic] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{step: number, total: number, message: string, isStepDone: boolean} | null>(null);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    // Load default character cards
    setAllCharacterCards([]);
  }, []);

  const handleGenerate = async () => {
    setErrorMessage(null);
    if (!worldRequirements.trim()) {
      setErrorMessage('Vui lòng ít nhất điền yêu cầu thế giới game');
      return;
    }

    if (characterSource === 'manual' && selectedCharacterIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một nhân vật');
      return;
    }

    setIsLoading(true);
    setGenerationProgress({ step: 1, total: 4, message: 'Chuẩn bị tạo...', isStepDone: false });
    try {
      const selectedChars = allCharacterCards.filter(c => selectedCharacterIds.includes(c.id));
      const data = await gameAiService.generateGameStage({
        worldRequirements,
        playerCharacterRequirements,
        destinyAiRequirements,
        firstDayRequirements,
        characterSource,
        useAiCharacterCount,
        aiCharacterCount,
        selectedCharacters: selectedChars,
        useAiScenes,
        sceneCount,
        generateCharImages,
        generateSceneImages,
        generateSceneMusic,
        onProgress: (step, total, message, isStepDone) => {
          setGenerationProgress({ step, total, message, isStepDone: isStepDone ?? false });
        }
      });
      setGeneratedData(data);
    } catch (error) {
      console.error('Failed to generate game stage:', error);
      setErrorMessage('Tạo thất bại: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCharacterSelection = (id: string) => {
    setSelectedCharacterIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (generatedData) {
    return <GameStageWorkbench initialData={generatedData} onBack={() => setGeneratedData(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 font-sans flex flex-col relative">
      {/* Loading Overlay */}
      {isLoading && generationProgress && (
        <div className="fixed inset-0 z-[100] bg-gray-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-center text-gray-100 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin text-primary-500" size={24} />
              Đang xây dựng thế giới game
            </h2>
            
            <div className="space-y-4">
              {[
                { step: 1, label: 'Tạo bối cảnh thế giới & Nhân vật' },
                { step: 2, label: 'Tạo sự kiện Ngày 1' },
                { step: 3, label: 'Tạo prompt đa phương tiện' },
                { step: 4, label: 'Đóng gói dữ liệu' }
              ].map((item) => {
                const isActive = generationProgress.step === item.step;
                const isPassed = generationProgress.step > item.step || (generationProgress.step === item.step && generationProgress.isStepDone);
                
                return (
                  <div key={item.step} className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${isActive ? 'bg-primary-900/20 border-primary-800' : isPassed ? 'bg-green-900/10 border-green-900/50' : 'bg-gray-950 border-gray-800'}`}>
                    <div className="shrink-0 mt-0.5">
                      {isPassed ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                      ) : isActive ? (
                        <div className="w-6 h-6 flex items-center justify-center text-primary-500">
                          <Loader2 className="animate-spin" size={20} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
                          {item.step}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className={`font-semibold text-sm ${isPassed ? 'text-green-400' : isActive ? 'text-primary-400' : 'text-gray-500'}`}>
                        {item.label}
                      </h3>
                      {isActive && generationProgress.message && (
                        <p className="text-xs text-gray-400 mt-1 animate-pulse">
                          {generationProgress.message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-500">
              Quá trình này có thể mất một vài phút. Vui lòng không đóng trang.
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn">
          <span className="text-sm font-medium">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-red-600 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}

      {/* AppBar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900 shadow-sm shrink-0">
        <div className="flex items-center">
          <button
            onClick={onCancel}
            className="p-2 mr-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-xl font-medium">Tạo thế giới game</h1>
        </div>
        <button 
          className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary-900/20 transition-colors"
          onClick={() => {/* Navigate to workbench if data exists */}}
        >
          <Edit3 size={16} />
          Chỉnh sửa sân khấu
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6 pb-24">
          
          {/* Requirements Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
            
            {/* World Requirements */}
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-2">
                <Globe className="text-gray-400 mt-1" size={20} />
                <div>
                  <h3 className="font-bold text-gray-100">Mô tả thế giới game</h3>
                  <p className="text-sm text-gray-400">Mô tả thế giới quan, các yếu tố cốt lõi, v.v.</p>
                </div>
              </div>
              <textarea
                value={worldRequirements}
                onChange={(e) => setWorldRequirements(e.target.value)}
                placeholder="Ví dụ:&#10;- Một thế giới giả tưởng nơi phép thuật và công nghệ cùng tồn tại&#10;- Phong cách tăm tối, giống game Souls&#10;- Yếu tố cốt lõi là những con rồng cổ đại và nền văn minh đã mất"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 min-h-[120px]"
              />
            </div>

            {/* Player Character Requirements */}
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-2">
                <User className="text-gray-400 mt-1" size={20} />
                <div>
                  <h3 className="font-bold text-gray-100">Thiết lập nhân vật người chơi</h3>
                  <p className="text-sm text-gray-400">Thiết lập danh tính, bối cảnh hoặc đặc điểm của nhân vật chính</p>
                </div>
              </div>
              <textarea
                value={playerCharacterRequirements}
                onChange={(e) => setPlayerCharacterRequirements(e.target.value)}
                placeholder="Ví dụ:&#10;- Nhân vật chính là một người máy sinh học bị mất trí nhớ"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 min-h-[80px]"
              />
            </div>

            {/* Story Direction */}
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-2">
                <Route className="text-gray-400 mt-1" size={20} />
                <div>
                  <h3 className="font-bold text-gray-100">Hướng phát triển câu chuyện</h3>
                  <p className="text-sm text-gray-400">Thiết lập hướng đi của câu chuyện thế giới</p>
                </div>
              </div>
              <textarea
                value={destinyAiRequirements}
                onChange={(e) => setDestinyAiRequirements(e.target.value)}
                placeholder="Ví dụ: Xoay quanh một lời tiên tri cổ xưa"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 min-h-[80px]"
              />
            </div>

            {/* First Day Events */}
            <div>
              <div className="flex items-start gap-3 mb-2">
                <Play className="text-orange-500 mt-1" size={20} />
                <div>
                  <h3 className="font-bold text-gray-100">Nội dung sự kiện ngày đầu tiên</h3>
                  <p className="text-sm text-gray-400">Thiết lập cốt truyện cụ thể hoặc cách mở đầu diễn ra vào ngày đầu tiên của trò chơi</p>
                </div>
              </div>
              <textarea
                value={firstDayRequirements}
                onChange={(e) => setFirstDayRequirements(e.target.value)}
                placeholder="Ví dụ: Nhân vật chính tỉnh dậy trong một khoang ngủ đông bị bỏ hoang, gặp một người hướng dẫn bí ẩn, và sau đó buộc phải tham gia vào một trận chiến."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 min-h-[80px]"
              />
            </div>
          </div>

          {/* Character Settings Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-800 flex items-center gap-3">
              <Users className="text-gray-400" size={20} />
              <h2 className="font-bold text-gray-100">Nhân vật AI</h2>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Generate Character Images */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-semibold text-gray-200">Tạo ảnh đại diện nhân vật</h3>
                  <p className="text-sm text-gray-500">Gọi API vẽ để tạo hình ảnh cho các nhân vật được tạo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={generateCharImages} onChange={(e) => setGenerateCharImages(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Character Count */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-semibold text-gray-200">Số lượng nhân vật</h3>
                  <p className="text-sm text-gray-500">Thiết lập số lượng nhân vật chính trong thế giới game</p>
                </div>
                <div className="flex items-center gap-2">
                  {!useAiCharacterCount && (
                    <input 
                      type="number" 
                      value={aiCharacterCount} 
                      onChange={(e) => setAiCharacterCount(parseInt(e.target.value) || 0)}
                      className="w-16 bg-gray-950 border border-gray-800 rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:border-primary-500"
                    />
                  )}
                  <div className="flex bg-gray-950 border border-gray-800 rounded-lg p-0.5">
                    <button 
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${!useAiCharacterCount ? 'bg-gray-800 text-gray-50' : 'text-gray-400 hover:text-gray-200'}`}
                      onClick={() => setUseAiCharacterCount(false)}
                    >
                      Thủ công
                    </button>
                    <button 
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${useAiCharacterCount ? 'bg-gray-800 text-gray-50' : 'text-gray-400 hover:text-gray-200'}`}
                      onClick={() => setUseAiCharacterCount(true)}
                    >
                      Tự động
                    </button>
                  </div>
                </div>
              </div>

              {/* Character Source */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-semibold text-gray-200">Thiết lập nhân vật</h3>
                  <p className="text-sm text-gray-500">Chọn thẻ hiện có theo cách thủ công hoặc do AI tạo</p>
                </div>
                <div className="flex bg-gray-950 border border-gray-800 rounded-lg p-0.5">
                  <button 
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${characterSource === 'manual' ? 'bg-gray-800 text-gray-50' : 'text-gray-400 hover:text-gray-200'}`}
                    onClick={() => setCharacterSource('manual')}
                  >
                    Thủ công
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${characterSource === 'ai' ? 'bg-gray-800 text-gray-50' : 'text-gray-400 hover:text-gray-200'}`}
                    onClick={() => setCharacterSource('ai')}
                  >
                    Tự động
                  </button>
                </div>
              </div>

              {/* Character Source Details */}
              <div className="mt-4 p-4 bg-gray-950/50 rounded-lg border border-gray-800/50">
                {characterSource === 'manual' ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chọn nhân vật từ thư viện</h4>
                    {allCharacterCards.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {allCharacterCards.map(card => (
                          <button
                            key={card.id}
                            onClick={() => toggleCharacterSelection(card.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              selectedCharacterIds.includes(card.id)
                                ? 'bg-primary-600 text-white border-primary-500 shadow-lg shadow-primary-900/20'
                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200'
                            } border`}
                          >
                            {card.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 text-sm py-2">
                        Không có thẻ nhân vật cài sẵn, vui lòng tạo trước.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-sm py-2">
                    AI sẽ tự động phân tích và tạo nhân vật AI dựa trên yêu cầu của thế giới.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scene Structure Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-800 flex items-center gap-3">
              <MapIcon className="text-gray-400" size={20} />
              <h2 className="font-bold text-gray-100">Cảnh game</h2>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Scene Count */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-semibold text-gray-200">Số lượng cảnh game</h3>
                  <p className="text-sm text-gray-500">Thiết lập số lượng cảnh hoặc để AI tự động quyết định</p>
                </div>
                <div className="flex items-center gap-2">
                  {!useAiScenes && (
                    <input 
                      type="number" 
                      value={sceneCount} 
                      onChange={(e) => setSceneCount(parseInt(e.target.value) || 0)}
                      className="w-16 bg-gray-950 border border-gray-800 rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:border-primary-500"
                    />
                  )}
                  <div className="flex bg-gray-950 border border-gray-800 rounded-lg p-0.5">
                    <button 
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${!useAiScenes ? 'bg-gray-800 text-gray-50' : 'text-gray-400 hover:text-gray-200'}`}
                      onClick={() => setUseAiScenes(false)}
                    >
                      Thủ công
                    </button>
                    <button 
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${useAiScenes ? 'bg-gray-800 text-gray-50' : 'text-gray-400 hover:text-gray-200'}`}
                      onClick={() => setUseAiScenes(true)}
                    >
                      Tự động
                    </button>
                  </div>
                </div>
              </div>

              {/* Generate Scene Images */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-semibold text-gray-200">Tạo hình minh họa cảnh</h3>
                  <p className="text-sm text-gray-500">Gọi API vẽ để tạo hình ảnh bầu không khí môi trường</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={generateSceneImages} onChange={(e) => setGenerateSceneImages(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Generate Scene Music */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-semibold text-gray-200">Tạo nhạc nền cảnh</h3>
                  <p className="text-sm text-gray-500">Gọi API âm nhạc để tạo nhạc nền (BGM)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={generateSceneMusic} onChange={(e) => setGenerateSceneMusic(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-gray-900 border-t border-gray-800 p-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Đang xây dựng thế giới...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                Tạo sân khấu game
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
