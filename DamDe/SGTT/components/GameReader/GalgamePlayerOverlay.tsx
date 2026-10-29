import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, History, CheckCircle } from 'lucide-react';
import { GameManager } from '../../infra/gameManager';

export const GalgamePlayerOverlay: React.FC<{
  event: any;
  playerName: string;
  gameManager: GameManager;
  onFinished: () => void;
  onExit: () => void;
}> = ({ event, playerName, gameManager, onFinished, onExit }) => {
  const [dialogues, setDialogues] = useState<any[]>(event.dialogues || []);
  const [currentIndex, setCurrentIndex] = useState(event.breakpoint_index || 0);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [visibleOptions, setVisibleOptions] = useState<string[]>([]);
  const [pendingOptions, setPendingOptions] = useState<string[]>([]);
  const [displayingText, setDisplayingText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load scene resources (background image)
  const sceneId = event.scene_id || event.scene_name;
  const scene = gameManager.scenes.find(s => s.id === sceneId || s.name === sceneId) || {};
  const backgroundImagePath = scene.imagePath;

  useEffect(() => {
    const initialOptions = event.options || [];
    if (dialogues.length > 0 && currentIndex === dialogues.length - 1) {
      setVisibleOptions(initialOptions);
    } else {
      setPendingOptions(initialOptions);
    }
  }, []);

  useEffect(() => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    if (dialogues.length === 0) {
      setDisplayingText('Sự kiện này không có lời thoại nào. Vui lòng nhấn vào bất kì đâu để kết thúc.');
      return;
    }
    if (currentIndex >= dialogues.length) return;

    const fullText = dialogues[currentIndex].message || '...';
    let charIndex = 0;
    setDisplayingText('');

    if (fullText.length < 3) {
      setDisplayingText(fullText);
      return;
    }

    typingTimerRef.current = setInterval(() => {
      if (charIndex < fullText.length) {
        charIndex++;
        setDisplayingText(fullText.substring(0, charIndex));
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      } else {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      }
    }, 30);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [currentIndex, dialogues]);

  const autoSave = (indexToSave: number) => {
    gameManager.saveCurrentEventProgress({ ...event, dialogues }, indexToSave);
  };

  const handleNext = () => {
    if (isFreeMode) {
      return; // Don't advance if in free mode
    }

    if (dialogues.length === 0) {
      handleFinishEvent();
      return;
    }

    if (currentIndex >= dialogues.length) return;

    const currentFullText = dialogues[currentIndex].message || '';
    if (displayingText.length < currentFullText.length) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setDisplayingText(currentFullText);
      return;
    }

    if (isGenerating) return;

    if (currentIndex < dialogues.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setVisibleOptions([]);
      setTimeout(() => {
        autoSave(nextIndex);
      }, 0);
    } else {
      if (pendingOptions.length > 0) {
        setVisibleOptions([...pendingOptions]);
        setPendingOptions([]);
      } else if (visibleOptions.length === 0) {
        handleFinishEvent();
      }
    }
  };

  const handleFinishEvent = async () => {
    await gameManager.completeEvent({ ...event, dialogues }, currentIndex);
    onFinished();
  };

  const handleSendInput = async () => {
    const text = userInput.trim();
    if (!text || isGenerating) return;

    setUserInput('');
    setIsFreeMode(false);

    const newDialogues = [...dialogues, { name: playerName, message: `（${text}）` }];
    setDialogues(newDialogues);
    setCurrentIndex(newDialogues.length - 1);
    setVisibleOptions([]);
    setPendingOptions([]);
    
    setTimeout(() => {
      generatePlot(text, newDialogues);
    }, 0);
  };

  const handleOptionSelect = (option: string) => {
    setVisibleOptions([]);
    setPendingOptions([]);
    
    const newDialogues = [...dialogues, { name: playerName, message: `（Lựa chọn）${option}` }];
    setDialogues(newDialogues);
    setCurrentIndex(newDialogues.length - 1);
    
    setTimeout(() => {
      generatePlot(option, newDialogues);
    }, 0);
  };

  const generatePlot = async (input: string, currentDialogues: any[]) => {
    setIsGenerating(true);
    try {
      const result = await gameManager.generateEventContinuation(currentDialogues, input, sceneId);
      
      const newLines = result.new_dialogues || [];
      const nextOpts = result.options || [];

      // Update Player Profile if needed
      if (result.player_profile_updates) {
         await gameManager.updatePlayerProfile(result.player_profile_updates);
      }

      const updatedDialogues = [...currentDialogues, ...newLines];
      setDialogues(updatedDialogues);
      setPendingOptions(nextOpts);
      
      const newIndex = updatedDialogues.length > currentDialogues.length 
        ? currentDialogues.length 
        : currentDialogues.length - 1;
        
      setCurrentIndex(newIndex);
      
      setTimeout(() => {
        gameManager.saveCurrentEventProgress({ ...event, dialogues: updatedDialogues }, newIndex);
      }, 0);
    } catch (error) {
      console.error('AI generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getCharacterImagePath = (name: string) => {
    const cleanName = name.split('（')[0].split('(')[0].trim();
    const character = gameManager.aiCharacters.find(c => {
      const charName = c.name || '';
      const cardName = c.cardName || '';
      return charName === cleanName || cardName === cleanName || (charName && cleanName.includes(charName));
    });
    return character?.imagePath;
  };

  if (dialogues.length === 0) return null;

  const safeIndex = Math.min(currentIndex, dialogues.length - 1);
  const currentLine = dialogues[safeIndex];
  const name = currentLine?.name || '???';
  const isPlayer = name === playerName || name === 'Người chơi';
  const progress = `${safeIndex + 1}/${dialogues.length}`;
  const showNextIndicator = !isGenerating;

  const imagePath = getCharacterImagePath(name);
  const hasImage = !!imagePath;

  const boxHeight = isFreeMode ? 'h-[280px]' : 'h-[220px]';

  return (
    <div className="absolute inset-0 z-50 flex flex-col font-sans">
      {/* Global Click Layer & Background */}
      <div className="absolute inset-0 cursor-pointer" onClick={handleNext}>
        {backgroundImagePath ? (
          <img src={backgroundImagePath} alt="Background" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-gray-900"></div>
        )}
        <div className={`absolute inset-0 ${backgroundImagePath ? 'bg-black/60' : 'bg-black/75'}`}></div>
      </div>

      {/* Top Left: Exit */}
      <div className="absolute top-4 left-4 z-20">
        <button onClick={onExit} className="flex items-center gap-2 px-3 py-1.5 bg-black/30 hover:bg-black/50 text-white/70 rounded-md transition-colors">
          <X size={18} />
          <span className="text-sm">Rời đi</span>
        </button>
      </div>

      {/* Top Right: History & Finish */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button onClick={() => setShowHistory(true)} className="p-1.5 bg-black/30 hover:bg-black/50 text-white/70 rounded-md transition-colors" title="Lịch sử">
          <History size={18} />
        </button>
        <button onClick={handleFinishEvent} className="flex items-center gap-2 px-3 py-1.5 bg-black/30 hover:bg-black/50 text-white/70 rounded-md transition-colors">
          <CheckCircle size={18} />
          <span className="text-sm">Hoàn thành</span>
        </button>
      </div>

      {/* Options Area */}
      {visibleOptions.length > 0 && !isGenerating && (
        <div className="absolute bottom-[350px] left-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
          {visibleOptions.map((opt, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); handleOptionSelect(opt); }}
              className="pointer-events-auto w-full py-3 px-4 bg-[#2A2A2A]/95 border border-amber-500/50 rounded-xl shadow-lg text-white text-base hover:bg-[#333] transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Dialog Box and Portrait */}
      <div className="absolute bottom-10 left-4 right-4 z-10 flex flex-col justify-end pointer-events-none">
        
        {/* Floating Portrait */}
        {hasImage && name !== 'Hệ thống' && name !== 'Người kể chuyện' && (
          <div className={`absolute -top-[250px] ${isPlayer ? 'right-4' : 'left-4'} w-[180px] h-[240px] rounded-xl border-2 ${isPlayer ? 'border-blue-500/80' : 'border-amber-500/80'} shadow-xl overflow-hidden bg-[#222] transition-opacity duration-300`}>
            <img src={imagePath} alt={name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
          </div>
        )}

        {/* Dialog Container */}
        <div className={`pointer-events-auto ${boxHeight} bg-[#1E1E1E]/95 rounded-2xl border-2 ${isPlayer ? 'border-blue-500/50' : 'border-amber-500/50'} shadow-2xl flex flex-col transition-all duration-300`}>
          
          {/* Top Bar (Name + Progress + AI Status) */}
          <div className="flex items-center">
            <div className={`px-6 py-2 rounded-tl-xl rounded-br-xl ${isPlayer ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'} font-bold text-base`}>
              {name}
            </div>
            <div className="flex-1"></div>
            
            {isGenerating && (
              <div className="flex items-center gap-2 mr-4">
                <Loader2 size={12} className="animate-spin text-cyan-400/50" />
                <span className="text-[11px] text-white/50">AI đang suy nghĩ...</span>
              </div>
            )}
            
            <div className="pr-4 text-xs text-white/30">{progress}</div>
          </div>

          {/* Text Display Area */}
          <div className="flex-1 overflow-hidden px-5 pt-3 pb-2 cursor-pointer" onClick={handleNext}>
            <div className="h-full overflow-y-auto custom-scrollbar" ref={scrollRef}>
              <p className="text-[#E0E0E0] text-lg leading-relaxed font-serif whitespace-pre-wrap">
                {displayingText}
              </p>
            </div>
          </div>

          {/* Bottom Interaction Area */}
          <div className="px-4 pb-3">
            {isFreeMode ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setIsFreeMode(false)} className="p-1 text-white/40 hover:text-white/70" title="Quay lại chế độ đọc">
                  <X size={20} />
                </button>
                <div className="flex-1 h-10 bg-black/25 rounded-full border border-white/10 px-3 flex items-center">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendInput()}
                    placeholder={isGenerating ? 'AI đang suy nghĩ...' : 'Nhập hành động của bạn...'}
                    disabled={isGenerating}
                    className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder-white/20"
                  />
                </div>
                {isGenerating ? (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-cyan-400" />
                  </div>
                ) : (
                  <button onClick={handleSendInput} className="p-1 text-cyan-400 hover:text-cyan-300">
                    <Send size={20} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex justify-end items-center h-10">
                {showNextIndicator && displayingText.length >= (currentLine?.message?.length || 0) && (
                  <div className="pr-3 text-white/30 animate-pulse">▼</div>
                )}
                <button
                  onClick={() => setIsFreeMode(true)}
                  className="px-3 py-1.5 bg-[#2A2A2A] rounded-full border border-cyan-400/30 shadow-[0_0_4px_rgba(34,211,238,0.05)] flex items-center gap-1 hover:bg-[#333] transition-colors"
                >
                  <span className="text-cyan-400/90 text-xs font-medium">Trò chuyện</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 pointer-events-auto">
          <div className="bg-[#1E1E1E] h-[60%] rounded-t-2xl flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full"></div>
            </div>
            <div className="px-4 pb-3 flex justify-between items-center border-b border-white/10">
              <h3 className="text-white text-lg font-bold">Lịch sử hội thoại</h3>
              <button onClick={() => setShowHistory(false)} className="p-1 text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {dialogues.slice(0, safeIndex + 1).map((line, idx) => {
                const lineName = line.name || '???';
                const lineIsPlayer = lineName === playerName || lineName === 'Người chơi';
                return (
                  <div key={idx} className="mb-4 border-b border-white/5 pb-3 last:border-0">
                    <div className={`text-[13px] font-bold mb-1 ${lineIsPlayer ? 'text-blue-400' : 'text-amber-400'}`}>
                      {lineName}
                    </div>
                    <div className="text-white/70 text-[15px] whitespace-pre-wrap">
                      {line.message}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
