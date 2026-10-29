

import React, { useState, useEffect } from 'react';
import { useSachHiep } from '../state/SachHiepContext';
import { motion, AnimatePresence } from 'motion/react';
import { AIDirectorModal } from './AIDirectorModal';
import { Compass, Sparkles } from 'lucide-react';

export const SachHiepEditor: React.FC = () => {
  const { 
    story, 
    activeChapterId, 
    updateChapterContent, 
    isGenerating,
    isSyncingBible,
    generationStatus,
    generationThought,
    generationProgress,
    generationPreview,
    updateStorySettings,
    generateRewrite,
    generateIllustrations,
    generateContinue,
    instructionMain,
    setInstructionMain,
    instructionEnding,
    setInstructionEnding
  } = useSachHiep();

  const [isDirectorModalOpen, setIsDirectorModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const [showAiEdit, setShowAiEdit] = useState(false);
  const [showThought, setShowThought] = useState(false);
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [showIllModal, setShowIllModal] = useState(false);
  const [illCount, setIllCount] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) {
        setIsMobileExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const activeChapter = story?.chapters.find(c => c.id === activeChapterId);

  if (!activeChapter) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-950">
            <p>Chọn một chương từ thanh bên để bắt đầu viết.</p>
        </div>
    );
  }

  const toggleNsfw = () => {
    if (story) {
        updateStorySettings({ nsfw: !story.nsfw });
    }
  };

  const handleRewrite = async () => {
      if (!rewriteInstruction.trim()) return;
      setShowAiEdit(false);
      await generateRewrite(rewriteInstruction);
      setRewriteInstruction('');
  };

  const renderContentWithIllustrations = () => {
    if (!activeChapter) return null;
    let content = activeChapter.content || '';
    
    // Đảm bảo thay thế các chuỗi \n được sinh ra thành ký tự xuống dòng thật
    content = content.replace(/\\n/g, '\n');

    const illustrations = activeChapter.illustrations || [];
    
    if (illustrations.length === 0) return content + '\u200b';

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    const renderedIllIds = new Set<string>();

    lines.forEach((line, index) => {
      elements.push(<span key={`line-${index}`}>{line}</span>);
      elements.push(<br key={`br-${index}`} />);
      
      const lineIllustrations = illustrations.filter(ill => ill.position === index + 1);
      lineIllustrations.forEach(ill => {
        renderedIllIds.add(ill.id);
        elements.push(
          <div key={ill.id} className="my-4 flex flex-col items-center">
            <img src={ill.imageUrl} alt={ill.prompt} className="max-w-full h-auto rounded-lg shadow-lg" referrerPolicy="no-referrer" />
            <span className="text-xs text-gray-500 mt-2 italic">{ill.prompt}</span>
          </div>
        );
      });
    });

    // Render any illustrations that were out of bounds
    const unrenderedIllustrations = illustrations.filter(ill => !renderedIllIds.has(ill.id));
    unrenderedIllustrations.forEach(ill => {
      elements.push(
        <div key={ill.id} className="my-4 flex flex-col items-center">
          <img src={ill.imageUrl} alt={ill.prompt} className="max-w-full h-auto rounded-lg shadow-lg" referrerPolicy="no-referrer" />
          <span className="text-xs text-gray-500 mt-2 italic">{ill.prompt}</span>
        </div>
      );
    });

    return elements;
  };

  return (
    <div className="flex-1 overflow-y-auto relative bg-gray-950 scroll-smooth">
      
      {/* --- FLOATING TOOLBAR --- */}
      <div className="sticky top-4 right-4 z-40 flex justify-end px-4 md:px-8 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1.5 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg p-1.5 shadow-xl transition-all relative">
             
             {/* Mobile Toggle Button */}
             <button 
                onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-all border ${
                    isMobileExpanded 
                    ? 'bg-gray-800 text-gray-400 border-gray-700' 
                    : 'bg-primary-900/20 text-primary-400 border-primary-900/50'
                }`}
             >
                {isMobileExpanded ? (
                    <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Đóng</span>
                    </>
                ) : (
                    <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Sửa</span>
                    </>
                )}
             </button>

             {/* Sync Indicator */}
             {isSyncingBible && (
                 <div className={`flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold animate-pulse ${isMobileExpanded ? 'hidden md:flex' : 'flex'}`} title="Đang đồng bộ Story Bible ngầm">
                     <svg className="animate-spin h-3 w-3 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span className="hidden sm:inline">Đang đồng bộ</span>
                 </div>
             )}

             <AnimatePresence>
                {(isMobileExpanded || isDesktop) && (
                    <motion.div 
                        initial={!isDesktop ? { opacity: 0, scale: 0.95, x: 10 } : false}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 10 }}
                        className={`${isMobileExpanded ? 'flex' : 'hidden'} md:flex items-center gap-2`}
                    >
                        {/* Mode Toggle (Sửa thủ công / Chế độ Đọc) */}
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                                isEditMode 
                                ? 'bg-primary-900/20 text-primary-400 border-primary-900/50 shadow-inner' 
                                : 'text-gray-400 hover:text-gray-50 hover:bg-gray-800 border-transparent'
                            }`}
                        >
                            {isEditMode ? (
                                <span>Sửa thủ công</span>
                            ) : (
                                <span>Chế độ Đọc</span>
                            )}
                        </button>

                        {/* Compact AI Director Node - right next to Sửa thủ công */}
                        <button 
                            onClick={() => setIsDirectorModalOpen(true)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                                (instructionMain.trim() || instructionEnding.trim())
                                ? 'bg-pink-950/60 text-pink-300 border-pink-700/80 shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                                : 'bg-gray-800/60 text-gray-300 border-gray-700 hover:text-white hover:border-gray-600'
                            }`}
                            title="Chỉ đạo nội dung Chính và điểm Kết thúc cho AI"
                        >
                            <Compass size={14} className={(instructionMain.trim() || instructionEnding.trim()) ? "text-pink-400" : "text-gray-400"} />
                            <span>Chỉ đạo AI</span>
                            {(instructionMain.trim() || instructionEnding.trim()) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse ml-0.5" />
                            )}
                        </button>

                        <div className="w-px h-4 bg-gray-700 mx-0.5"></div>

                        {/* NSFW Toggle shortcut */}
                        <button 
                            onClick={toggleNsfw}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded transition-all border ${
                                story?.nsfw 
                                ? 'bg-pink-900/40 text-pink-400 border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                                : 'bg-gray-800/50 text-gray-600 border-transparent hover:text-gray-400'
                            }`}
                            title={story?.nsfw ? "Dâm Tu Thần Bút đang KÍCH HOẠT" : "Kích hoạt Dâm Tu Thần Bút"}
                        >
                            69+
                        </button>
                    </motion.div>
                )}
             </AnimatePresence>
          </div>
      </div>

      <div className="max-w-3xl mx-auto py-10 px-4 md:py-16 md:px-8 min-h-screen">
        {/* Title Input */}
        {isEditMode ? (
            <input 
                type="text" 
                value={activeChapter.title} 
                onChange={(e) => {
                    // Direct title editing is not yet fully linked in this version
                }} 
                className="w-full bg-transparent text-3xl md:text-4xl font-serif font-bold text-gray-100 mb-8 focus:outline-none border-b border-transparent focus:border-gray-800 transition-colors mt-4 md:mt-0"
                placeholder="Tiêu đề chương"
            />
        ) : (
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-50 mb-8 mt-4 md:mt-0 pb-1 border-b border-transparent">
                {activeChapter.title}
            </h1>
        )}
        
        {/* Content Area */}
        <div className="grid relative text-base md:text-lg leading-relaxed font-serif pb-32">
            
            <div 
                className={`col-start-1 row-start-1 whitespace-pre-wrap p-0 border-none m-0 w-full overflow-hidden break-words
                ${isEditMode 
                    ? 'invisible pointer-events-none' // Ghost mode
                    : 'visible text-gray-300'         // Read mode
                }`}
            >
                {renderContentWithIllustrations()}
            </div>

            <textarea
                value={(activeChapter.content || '').replace(/\\n/g, '\n')}
                onChange={(e) => updateChapterContent(activeChapter.id, e.target.value)}
                placeholder="Bắt đầu viết kiệt tác của bạn..."
                className={`col-start-1 row-start-1 w-full h-full bg-transparent text-gray-300 focus:outline-none resize-none overflow-hidden placeholder-gray-700 transition-opacity p-0 border-none m-0 break-words
                ${isGenerating ? 'opacity-80' : 'opacity-100'}
                ${!isEditMode ? 'hidden' : 'block'} 
                `}
                spellCheck={false}
                readOnly={isGenerating || !isEditMode} 
            />
            
            {isGenerating && (
                <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none z-10" />
            )}
        </div>
        
        {/* Show illustrations below the editor in edit mode */}
        {isEditMode && activeChapter?.illustrations && activeChapter.illustrations.length > 0 && (
            <div className="mt-8 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-medium text-gray-300 mb-4">Ảnh minh họa trong chương:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeChapter.illustrations.map(ill => (
                        <div key={ill.id} className="flex flex-col items-center bg-gray-900/50 p-2 rounded-lg border border-gray-800">
                            <img src={ill.imageUrl} alt={ill.prompt} className="max-w-full h-auto rounded shadow-sm" referrerPolicy="no-referrer" />
                            <span className="text-xs text-gray-500 mt-2 italic text-center">{ill.prompt}</span>
                            <span className="text-xs text-primary-500 mt-1">Vị trí: Dòng {ill.position}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {isGenerating && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur border border-primary-500/30 text-primary-400 px-4 py-2 rounded-2xl shadow-2xl flex flex-col items-center gap-2 z-50 animate-bounce-slight max-w-[90vw] min-w-[200px]">
            {generationPreview && (
              <div className="w-full mb-2 flex justify-center">
                <img src={generationPreview} alt="Preview" className="max-h-48 rounded-lg shadow-md object-contain" />
              </div>
            )}
            <div className="flex items-center justify-between w-full gap-3">
              <span className="text-sm font-medium tracking-wide whitespace-nowrap">{generationStatus || 'AI đang viết...'}</span>
              {generationThought && (
                <button 
                  onClick={() => setShowThought(!showThought)}
                  className="p-1 hover:bg-gray-800 rounded-full transition-colors"
                  title="Xem suy nghĩ của AI"
                >
                  <svg className={`w-4 h-4 transition-transform ${showThought ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
            {generationProgress > 0 && (
              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div className="bg-primary-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${generationProgress * 100}%` }}></div>
              </div>
            )}
            {showThought && generationThought && (
              <div className="w-full max-h-32 overflow-y-auto text-[10px] text-gray-400 font-mono bg-black/40 p-2 rounded border border-gray-800 break-words mt-2">
                {generationThought}
              </div>
            )}
          </div>
        )}

        {/* AI Director Modal */}
        <AIDirectorModal 
            isOpen={isDirectorModalOpen}
            onClose={() => setIsDirectorModalOpen(false)}
            chapterTitle={activeChapter?.title}
            mainText={instructionMain}
            onMainChange={setInstructionMain}
            endingText={instructionEnding}
            onEndingChange={setInstructionEnding}
            onGenerate={() => generateContinue()}
            isGenerating={isGenerating}
        />
      </div>
    </div>
  );
};