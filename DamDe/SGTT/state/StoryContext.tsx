
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Story, Chapter, Character, VectorData, BackupData, EntityRegistry } from '../types';
import { storageService } from '../infra/storage';
// import { geminiService } from '../infra/aiService'; // Replaced by ProviderFactory
import { chunkingService } from '../narrative/memory/chunking';
import { narrativeMemoryService, getMagnitude } from '../narrative/memory/narrativeMemoryService';
import { ProviderFactory } from '../infra/providers/ProviderFactory';
import { getModelLimit } from '../constants/modelLimits';

interface StoryContextType {
  story: Story | null;
  storiesList: Story[];
  isStoriesLoaded: boolean;
  activeChapterId: string | null;
  characters: Character[];
  isGenerating: boolean;
  generationStatus: string; // New field for status text
  generationProgress: number;
  generationSteps: { id: string; label: string; status: 'pending' | 'processing' | 'completed' | 'failed' }[];
  generationLogs: string[];
  tokenStats: { previous: number; current: number };
  userInstruction: string;
  setUserInstruction: (text: string) => void;
  loadStories: () => Promise<void>;
  createStory: (
    title: string, 
    genre: string, 
    synopsis: string, 
    setting: string,
    writingStyle: string,
    pov: string,
    pronounStyle: string,
    negativePrompt: string,
    nsfw: boolean,
    fandomName?: string,
    sourceUrl?: string,
    storyType?: 'original' | 'fanfic' | 'gameBook',
    sourceFileContent?: string,
    gameData?: any
  ) => Promise<void>;
  openStory: (id: string) => Promise<void>;
  closeStory: () => void;
  deleteStory: (id: string) => Promise<void>;
  updateStorySettings: (settings: Partial<Story>) => Promise<void>;
  selectChapter: (id: string) => void;
  addChapter: () => Promise<void>;
  updateChapterContent: (id: string, content: string) => void;
  generateContinue: (instructionOverride?: string) => Promise<void>;
  generateRewrite: (instruction: string) => Promise<void>;
  extractAndSyncCharacters: (silent?: boolean, storyOverride?: Story) => Promise<void>;
  addCharacter: (char: Character) => void;
  reindexCurrentChapter: (silent?: boolean, storyOverride?: Story) => Promise<void>; 
  updateWorldLore: (lore: string[]) => Promise<void>;
  saveProgress: () => Promise<void>;
  exportStory: (id?: string) => Promise<void>;
  importStory: (file: File) => Promise<void>;
}

const StoryContext = (window as any).StoryContext || ((window as any).StoryContext = createContext<StoryContextType | undefined>(undefined));

const identifyCharactersInText = (text: string, characters: Character[]): string[] => {
    const foundIds: string[] = [];
    const lowerText = text.toLowerCase();
    characters.forEach(c => {
        if (lowerText.includes(c.name.toLowerCase())) foundIds.push(c.id);
    });
    return foundIds;
};

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [story, setStory] = useState<Story | null>(null);
  const [storiesList, setStoriesList] = useState<Story[]>([]);
  const [isStoriesLoaded, setIsStoriesLoaded] = useState(false); 
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>(''); // Init status
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationSteps, setGenerationSteps] = useState<{ id: string; label: string; status: 'pending' | 'processing' | 'completed' | 'failed' }[]>([]);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [vectors, setVectors] = useState<VectorData[]>([]); 
  const [tokenStats, setTokenStats] = useState({ previous: 0, current: 0 });
  const [userInstruction, setUserInstruction] = useState('');
  
  const storyRef = useRef<Story | null>(null);
  useEffect(() => { storyRef.current = story; }, [story]);

  useEffect(() => { loadStories(); }, []);

  const loadStories = async () => {
    try {
        const list = await storageService.getAllStories();
        list.sort((a, b) => (b.chapters[0]?.lastUpdated || b.createdAt) - (a.chapters[0]?.lastUpdated || a.createdAt));
        setStoriesList(list);
    } catch (e) { console.error(e); } finally { setIsStoriesLoaded(true); }
  };

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setGenerationLogs(prev => [...prev, `[${time}] ${msg}`]);
  }, []);

  const updateStep = useCallback((id: string, status: 'pending' | 'processing' | 'completed' | 'failed') => {
    setGenerationSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }, []);

  const createStory = async (
    title: string, 
    genre: string, 
    synopsis: string, 
    setting: string, 
    writingStyle: string, 
    pov: string, 
    pronounStyle: string, 
    negativePrompt: string, 
    nsfw: boolean,
    fandomName?: string,
    sourceUrl?: string,
    storyType: 'original' | 'fanfic' | 'gameBook' = 'original',
    sourceFileContent?: string,
    gameData?: any
  ) => {
    setIsGenerating(true); 
    setGenerationProgress(0);
    setGenerationLogs([]);
    
    const steps = [
        { id: 'init', label: 'Khởi tạo dữ liệu cơ sở', status: 'processing' as const },
        { id: 'extract', label: 'Phân tích & Trích xuất dữ liệu', status: 'pending' as const },
        { id: 'vectorize', label: 'Vector hóa & Xây dựng bộ nhớ', status: 'pending' as const },
        { id: 'finish', label: 'Hoàn tất thiết lập', status: 'pending' as const }
    ];
    setGenerationSteps(steps);


    addLog('Bắt đầu tiến trình khởi tạo thế giới...');
    setGenerationStatus('Đang khởi tạo thế giới...');
    setGenerationProgress(5);
    const storyId = crypto.randomUUID();
    const newStory: Story = {
      id: storyId, title, genre, synopsis, setting, writingStyle, pov, pronounStyle, negativePrompt, nsfw,
      worldLore: [],
      characters: [], createdAt: Date.now(),
      chapters: [{ id: crypto.randomUUID(), title: 'Chương 1: Khởi đầu', content: '', summary: '', order: 1, lastUpdated: Date.now() }],
      sourceUrl,
      storyType,
      gameData
    };
    
    // Preliminary save
    await storageService.saveStory(newStory);
    addLog('Đã tạo cấu trúc truyện cơ bản.');
    updateStep('init', 'completed');
    updateStep('extract', 'processing');
    setGenerationProgress(10);
    const initialVectors: VectorData[] = [];
    
    const provider = ProviderFactory.getInstance();

    // FANFIC MODE: CANON EXTRACTION PIPELINE
    if (storyType === 'fanfic') {
        // 1. Process uploaded TXT file -> Canon Extraction
        if (sourceFileContent) {
            try {
                addLog('Phát hiện dữ liệu nguyên tác (TXT). Bắt đầu trích xuất Canon...');
                setGenerationStatus('Đang trích xuất Canon (Locking Existence)...');
                
                // Chunk text
                const largeChunks = chunkingService.chunkTextByParagraph(sourceFileContent, { target: 12000, max: 15000, min: 8000 });
                
                const setupChunks = largeChunks.slice(0, 5);
                const middleChunks = largeChunks.length > 10 ? [largeChunks[Math.floor(largeChunks.length/2)], largeChunks[Math.floor(largeChunks.length * 0.75)]] : [];
                const extractionTargets = [...setupChunks, ...middleChunks];

                addLog(`Đã chia nguyên tác thành ${extractionTargets.length} phần để phân tích.`);
                let processed = 0;
                const extractedFacts = new Set<string>(); // Tránh trùng lặp vector
                
                // Registry accumulators
                const allCharacters = new Set<string>();
                const allLocations = new Set<string>();
                const allFactions = new Set<string>();

                for (let i = 0; i < extractionTargets.length; i++) {
                    const chunk = extractionTargets[i];
                    const progressPct = Math.round((processed / extractionTargets.length) * 100);
                    setGenerationStatus(`Đang đọc hiểu tác phẩm: ${progressPct}%`);
                    setGenerationProgress(10 + Math.round(progressPct * 0.4));
                    addLog(`Đang phân tích phần ${i + 1}/${extractionTargets.length}...`);
                    
                    // Gọi API trích xuất dữ liệu cấu trúc
                    const canonData = await provider.extractCanonData(chunk);
                    addLog(`Đã trích xuất ${canonData.character_profiles.length} nhân vật, ${canonData.rules.length} quy tắc từ phần ${i + 1}.`);
                    
                    if (i === extractionTargets.length - 1) {
                        updateStep('extract', 'completed');
                        updateStep('vectorize', 'processing');
                        addLog('Bắt đầu Vector hóa dữ liệu Canon...');
                    }

                    // Add to Whitelist Registry
                    canonData.character_profiles.forEach(c => allCharacters.add(c.name));
                    canonData.locations.forEach(l => allLocations.add(l));
                    canonData.factions.forEach(f => allFactions.add(f));

                    // A. Vector hóa Character Core
                    for (const charProfile of canonData.character_profiles) {
                        const factText = `[Hồ sơ Canon] ${charProfile.name}: ${charProfile.core}`;
                        if (!extractedFacts.has(factText)) {
                            const embedding = await provider.embedText(factText);
                            if (embedding.length > 0) {
                                initialVectors.push({
                                    id: crypto.randomUUID(), storyId, text: factText,
                                    embedding, magnitude: getMagnitude(embedding), createdAt: Date.now(),
                                    metadata: { 
                                        type: 'canon_core', // High Priority
                                        referenceId: 'canon_bible', 
                                        importance: 5, // Tối thượng
                                        characterIds: [charProfile.name], // Simple name match logic
                                        provider: provider.getConfig().activeProvider
                                    }
                                });
                                extractedFacts.add(factText);
                            }
                        }
                    }

                    // B. Vector hóa Rules
                    for (const rule of canonData.rules) {
                        const ruleText = `[Luật Canon]: ${rule}`;
                         if (!extractedFacts.has(ruleText)) {
                            const embedding = await provider.embedText(ruleText);
                             if (embedding.length > 0) {
                                initialVectors.push({
                                    id: crypto.randomUUID(), storyId, text: ruleText,
                                    embedding, magnitude: getMagnitude(embedding), createdAt: Date.now(),
                                    metadata: { 
                                        type: 'canon_rule', 
                                        referenceId: 'canon_bible', 
                                        importance: 5,
                                        provider: provider.getConfig().activeProvider
                                    }
                                });
                                extractedFacts.add(ruleText);
                            }
                         }
                    }

                    // C. Vector hóa Relationships
                    for (const rel of canonData.relationships) {
                         if (!extractedFacts.has(rel)) {
                            const embedding = await provider.embedText(rel);
                             if (embedding.length > 0) {
                                initialVectors.push({
                                    id: crypto.randomUUID(), storyId, text: `[Quan hệ Canon]: ${rel}`,
                                    embedding, magnitude: getMagnitude(embedding), createdAt: Date.now(),
                                    metadata: { 
                                        type: 'canon_rel', 
                                        referenceId: 'canon_bible', 
                                        importance: 4,
                                        provider: provider.getConfig().activeProvider
                                    }
                                });
                                extractedFacts.add(rel);
                            }
                         }
                    }
                    
                    // D. Vector hóa Raw Text (Style Reference)
                    const styleSnippet = chunk.slice(0, 4000); 
                    const rawEmbedding = await provider.embedText(styleSnippet);
                    if (rawEmbedding.length > 0) {
                        initialVectors.push({
                            id: crypto.randomUUID(), storyId, text: `[Trích đoạn Nguyên tác]: ${styleSnippet}`,
                            embedding: rawEmbedding, magnitude: getMagnitude(rawEmbedding), createdAt: Date.now(),
                            metadata: { 
                                type: 'source_material', 
                                referenceId: 'canon_source', 
                                importance: 3,
                                provider: provider.getConfig().activeProvider
                            }
                        });
                    }

                    processed++;
                    addLog(`Đã vector hóa dữ liệu phần ${i + 1}.`);
                }
                setGenerationProgress(60);

                // SAVE ENTITY REGISTRY (WHITELIST)
                newStory.entityRegistry = {
                    characters: Array.from(allCharacters),
                    locations: Array.from(allLocations),
                    factions: Array.from(allFactions)
                };

                // Tự động tạo Setting từ dữ liệu trích xuất nếu chưa có
                if (!newStory.setting && initialVectors.length > 0) {
                     const rules = initialVectors.filter(v => v.metadata.type === 'canon_rule').slice(0, 10).map(v => v.text).join('\n');
                     newStory.setting = `[DỮ LIỆU CANON ĐÃ TRÍCH XUẤT]\n${rules}`;
                }
            } catch (e) {
                console.error("Failed to extract canon", e);
                addLog(`Lỗi trích xuất Canon: ${e}`);
            }
        }

        // 2. Ingest Wiki Data via Google Search
        if (sourceUrl || fandomName) {
            try {
                updateStep('extract', 'processing');
                addLog(`Bắt đầu tra cứu Wiki cho fandom: ${fandomName || sourceUrl}...`);
                setGenerationStatus('Đang tra cứu dữ liệu Wiki (Bổ sung)...');
                setGenerationProgress(65);
                const fanficData = await provider.ingestFanficData(fandomName || "", sourceUrl || "");
                
                if (fanficData.setting && fanficData.setting.length > 50) {
                    newStory.setting = (newStory.setting ? newStory.setting + "\n\n" : "") + `[NGUỒN WIKI: ${fandomName} | ${sourceUrl}]\n` + fanficData.setting;
                }
                
                addLog(`Đã lấy dữ liệu Wiki. Tìm thấy ${fanficData.characters.length} nhân vật.`);
                updateStep('extract', 'completed');
                updateStep('vectorize', 'processing');
                setGenerationProgress(75);

                if (fanficData.characters.length > 0) {
                    newStory.characters = fanficData.characters;
                    for (const char of fanficData.characters) {
                         const text = `[Hồ sơ Wiki] ${char.name}: ${char.core_personality}. ${char.description}`;
                         const embedding = await provider.embedText(text);
                         if (embedding.length > 0) {
                             initialVectors.push({
                                 id: crypto.randomUUID(), storyId, text,
                                 embedding, magnitude: getMagnitude(embedding), createdAt: Date.now(),
                                 metadata: { type: 'canon_core', referenceId: char.id, characterIds: [char.id], importance: 5, provider: provider.getConfig().activeProvider }
                             });
                         }
                    }
                }
                await storageService.saveStory(newStory);
                addLog('Đã vector hóa dữ liệu Wiki.');
                setGenerationProgress(85);
            } catch (e) {
                console.error("Fanfic auto-ingest failed", e);
                addLog(`Lỗi tra cứu Wiki: ${e}`);
            }
        }
    } 
    // ORIGINAL MODE
    else if (storyType !== 'gameBook' && (setting.length > 10 || synopsis.length > 10)) {
        try {
            addLog('Bắt đầu phân tích bối cảnh và dàn ý...');
            setGenerationStatus('Đang phân tích bối cảnh...');
            setGenerationProgress(30);
            const combinedContext = `[Bối cảnh Thế giới]: ${setting}\n\n[Cốt truyện/Dàn ý]: ${synopsis}`;
            const extractedChars = await provider.extractCharacters(combinedContext, pronounStyle);
            if (extractedChars.length > 0) {
                const validChars = extractedChars.map((c, idx) => ({ ...c, id: `char_${storyId}_init_${idx}` }));
                newStory.characters = validChars;
                addLog(`Đã trích xuất ${extractedChars.length} nhân vật từ bối cảnh.`);
                updateStep('extract', 'completed');
                updateStep('vectorize', 'processing');
                setGenerationProgress(60);

                for (const char of validChars) {
                     const text = `${char.name} là ${char.role}. ${char.description} Đặc điểm: ${char.traits.join(', ')}.`;
                     const embedding = await provider.embedText(text);
                     if (embedding.length > 0) {
                         initialVectors.push({
                             id: crypto.randomUUID(), storyId, text,
                             embedding, magnitude: getMagnitude(embedding), createdAt: Date.now(),
                             metadata: { type: 'character', referenceId: char.id, characterIds: [char.id], importance: 4, provider: provider.getConfig().activeProvider }
                         });
                     }
                }
                await storageService.saveStory(newStory);
                addLog('Đã vector hóa hồ sơ nhân vật.');
                setGenerationProgress(85);
            } else {
                updateStep('extract', 'completed');
                updateStep('vectorize', 'completed');
                setGenerationProgress(85);
            }
        } catch (e) { 
            console.warn(e); 
            addLog(`Lỗi phân tích bối cảnh: ${e}`);
        }
    } else {
        updateStep('extract', 'completed');
        updateStep('vectorize', 'completed');
        setGenerationProgress(85);
    }

    updateStep('vectorize', 'completed');
    updateStep('finish', 'processing');
    setGenerationProgress(90);
    addLog('Đang lưu trữ toàn bộ dữ liệu vào bộ nhớ cục bộ...');

    if (initialVectors.length > 0) {
        await storageService.saveVectors(initialVectors);
        setVectors(initialVectors);
        addLog(`Đã lưu ${initialVectors.length} vectors vào cơ sở dữ liệu.`);
    }
    await loadStories();
    
    addLog('Hoàn tất khởi tạo thế giới! Đang chuyển hướng...');
    
    setTimeout(() => {
        setStory(newStory);
        setActiveChapterId(newStory.chapters[0].id);
        setIsGenerating(false);
        setGenerationStatus('');
        setGenerationProgress(0);
        setGenerationSteps([]);
        setGenerationLogs([]);
    }, 1500);
  };

  const openStory = async (id: string) => {
    setIsGenerating(true);
    setGenerationStatus('Đang tải truyện...');
    const found = await storageService.getStory(id);
    if (found) {
        if (!found.worldLore) found.worldLore = [];
        setStory(found);
        const storyVectors = await storageService.getVectorsByStory(id);
        setVectors(storyVectors);
        if (found.chapters.length > 0) {
            const lastChapter = found.chapters.reduce((prev, current) => (prev.order > current.order) ? prev : current);
            setActiveChapterId(lastChapter.id);
        }
    }
    setIsGenerating(false);
    setGenerationStatus('');
  };

  const closeStory = () => { setStory(null); setActiveChapterId(null); setVectors([]); loadStories(); };

  const deleteStory = async (id: string) => {
    await storageService.deleteStory(id);
    await storageService.deleteVectorsByStory(id); 
    if (story?.id === id) closeStory(); else await loadStories();
  };

  const updateStorySettings = async (settings: Partial<Story>) => {
    if (!story) return;
    const updatedStory = { ...story, ...settings };
    setStory(updatedStory);
    await storageService.saveStory(updatedStory);
  };
  
  const updateWorldLore = async (lore: string[]) => {
      if (!story) return;
      const updatedStory = { ...story, worldLore: lore };
      setStory(updatedStory);
      await storageService.saveStory(updatedStory);
  };
  
  const selectChapter = (id: string) => setActiveChapterId(id);

  const addChapter = async () => {
    if (!story) return;
    const nextOrder = story.chapters.length + 1;
    const newChapter: Chapter = { id: crypto.randomUUID(), title: `Chương ${nextOrder}`, content: '', summary: '', order: nextOrder, lastUpdated: Date.now() };
    const updatedStory = { ...story, chapters: [...story.chapters, newChapter] };
    setStory(updatedStory);
    await storageService.saveStory(updatedStory);
    setActiveChapterId(newChapter.id);
  };

  const updateChapterContent = useCallback((id: string, content: string) => {
    setStory(prev => {
      if (!prev) return null;
      return { ...prev, chapters: prev.chapters.map(c => c.id === id ? { ...c, content, lastUpdated: Date.now() } : c) };
    });
  }, []);

  const saveProgress = async () => { if (story) await storageService.saveStory(story); };

  const reindexCurrentChapter = async (silent: boolean = false, storyOverride?: Story) => {
      const targetStory = storyOverride || storyRef.current;
      if (!targetStory || !activeChapterId) return;
      
      if (!silent) {
           setIsGenerating(true);
           setGenerationStatus('Đang lưu vào bộ nhớ...');
      }
      try {
          await storageService.deleteVectorsByReference(targetStory.id, activeChapterId);
          const chapter = targetStory.chapters.find(c => c.id === activeChapterId);
          if (!chapter || !chapter.content.trim()) {
              setVectors(prev => prev.filter(v => v.metadata.referenceId !== activeChapterId));
              if (!silent) {
                   setIsGenerating(false);
                   setGenerationStatus('');
              }
              return;
          }
          const chunks = chunkingService.chunkTextByParagraph(chapter.content, { target: 850, max: 1200 });
          const newVectors: VectorData[] = [];
          for (const chunk of chunks) {
               const chunkEmbedding = await ProviderFactory.getInstance().embedText(chunk);
               if (chunkEmbedding.length > 0) {
                   const presentCharIds = identifyCharactersInText(chunk, targetStory.characters);
                   newVectors.push({
                        id: crypto.randomUUID(), storyId: targetStory.id, text: `[Trích đoạn ${chapter.title}]: ${chunk}`,
                        embedding: chunkEmbedding, magnitude: getMagnitude(chunkEmbedding), createdAt: Date.now(),
                        metadata: { 
                            type: 'chapter', 
                            referenceId: activeChapterId, 
                            chapterIndex: chapter.order, 
                            characterIds: presentCharIds, 
                            importance: 1,
                            pov: targetStory.pov,
                            provider: ProviderFactory.getInstance().getConfig().activeProvider
                        }
                   });
               }
          }
          if (newVectors.length > 0) {
              await storageService.saveVectors(newVectors);
              setVectors(prev => {
                  const others = prev.filter(v => v.metadata.referenceId !== activeChapterId);
                  return [...others, ...newVectors];
              });
          }
      } catch (e) { console.error(e); } finally { 
          if (!silent) {
               setIsGenerating(false);
               setGenerationStatus('');
          }
      }
  };

  const extractAndSyncCharacters = async (silent: boolean = false, storyOverride?: Story) => {
    const targetStory = storyOverride || storyRef.current;
    if (!targetStory || !activeChapterId) return;
    
    if (!silent) {
        setIsGenerating(true);
        setGenerationStatus('Đang phân tích nhân vật...');
    }
    try {
        const currentChapter = targetStory.chapters.find(c => c.id === activeChapterId);
        const textToAnalyze = currentChapter && currentChapter.content.length > 50 ? currentChapter.content : targetStory.setting + "\n" + targetStory.synopsis;
        if(!textToAnalyze || textToAnalyze.length < 10) { 
            if (!silent) {
                setIsGenerating(false);
                setGenerationStatus('');
            }
            return; 
        }
        
        const newChars = await ProviderFactory.getInstance().extractCharacters(textToAnalyze, targetStory.pronounStyle);
        setStory(prev => {
            if(!prev) return null;
            const existingNames = new Set(prev.characters.map(c => c.name.toLowerCase().trim()));
            const uniqueNewChars = newChars.filter(c => !existingNames.has(c.name.toLowerCase().trim()));
            return { ...prev, characters: [...prev.characters, ...uniqueNewChars] };
        });
        const newVectors: VectorData[] = [];
        for (const char of newChars) {
            const text = `${char.name} là ${char.role}. ${char.description} Đặc điểm: ${char.traits.join(', ')}.`;
            const embedding = await ProviderFactory.getInstance().embedText(text);
            if (embedding.length > 0) {
                newVectors.push({
                    id: crypto.randomUUID(), storyId: targetStory.id, text,
                    embedding, magnitude: getMagnitude(embedding), createdAt: Date.now(),
                    metadata: { type: 'character', referenceId: char.id, characterIds: [char.id], importance: 4, provider: ProviderFactory.getInstance().getConfig().activeProvider }
                });
            }
        }
        if (newVectors.length > 0) { setVectors(prev => [...prev, ...newVectors]); await storageService.saveVectors(newVectors); }
        if (targetStory) await storageService.saveStory(targetStory);
    } catch(e) { console.error(e); } finally { 
        if (!silent) {
            setIsGenerating(false);
            setGenerationStatus('');
        }
    }
  };

  const generateContinue = async (instructionOverride?: string) => {
    if (!storyRef.current || !activeChapterId) return;
    const finalInstruction = instructionOverride !== undefined ? instructionOverride : userInstruction;
    const currentStory = storyRef.current;
    const sortedChapters = [...currentStory.chapters].sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);
    if (currentIndex === -1) return;
    const currentChapter = sortedChapters.findIndex(c => c.id === activeChapterId) !== -1 ? sortedChapters.find(c => c.id === activeChapterId)! : sortedChapters[0];
    
    setIsGenerating(true);
    setGenerationStatus('AI đang viết...');
    setTokenStats(prev => ({ previous: prev.current, current: 0 }));
    setUserInstruction('');

    try {
      const startIdx = Math.max(0, currentIndex - 2);
      const immediateChapters = sortedChapters.slice(startIdx, currentIndex + 1);
      
      const modelName = ProviderFactory.getInstance().getConfig().geminiModel || '';
      const { promptLimit } = getModelLimit(modelName);

      const immediateContext = immediateChapters.map(c => {
          let truncatedContent = c.content || "";
          if (truncatedContent.length > promptLimit) {
              truncatedContent = "..." + truncatedContent.substring(truncatedContent.length - promptLimit);
          }
          return `### ${c.title}\n${truncatedContent}`;
      }).join('\n\n');
      const olderChapters = sortedChapters.slice(0, startIdx);
      const rollingSummaries = olderChapters.filter(c => c.summary).map(c => `[Tóm tắt ${c.title}]: ${c.summary}`).join('\n\n');

      let contextTextForQuery = (currentChapter.content || "").slice(-1000); 
      if (contextTextForQuery.length < 50) {
          if (currentIndex > 0) {
              const prevChapter = sortedChapters[currentIndex - 1];
              contextTextForQuery = prevChapter.summary || prevChapter.content.slice(-500);
          } else {
              contextTextForQuery = currentStory.synopsis || currentStory.setting.slice(0, 300);
          }
      }

      const queryEmbedding = await ProviderFactory.getInstance().embedText(`Truy xuất: ${finalInstruction} ${contextTextForQuery}`);
      const activeCharIds = identifyCharactersInText(contextTextForQuery, currentStory.characters);
      const activeProvider = ProviderFactory.getInstance().getConfig().activeProvider;
      // Isolate context by dropping vectors from different dimension providers
      const candidates = vectors.filter(v => !(v.metadata.type === 'chapter' && v.metadata.referenceId === activeChapterId) && (!v.metadata.provider || v.metadata.provider === activeProvider));
      
      const relevantDocs = narrativeMemoryService.search(queryEmbedding, candidates, {
          topK: 8, focusCharacterIds: activeCharIds, minScore: 0.50, 
          currentPov: currentStory.pov, maxChunksPerSource: 3 
      }); 
      
      // Update Context Labeling for Prompt
      const augmentedContext = relevantDocs.map(d => {
          let label = "KÝ ỨC";
          if (d.metadata.type === 'canon_core') label = "HỒ SƠ CANON (TÍNH CÁCH)";
          else if (d.metadata.type === 'canon_rule') label = "LUẬT CANON (THẾ GIỚI)";
          else if (d.metadata.type === 'canon_rel') label = "QUAN HỆ CANON";
          else if (d.metadata.type === 'source_material') label = "NGUYÊN TÁC (THAM KHẢO VĂN PHONG)";
          return `- [${label}]: ${d.text}`;
      }).join('\n');

      const stream = ProviderFactory.getInstance().generateStoryStream(
        immediateContext, rollingSummaries, currentStory.setting, augmentedContext,
        currentStory.synopsis, currentStory.characters, currentStory.worldLore || [],
        currentStory.genre, currentStory.writingStyle || "", currentStory.pov,
        currentStory.pronounStyle, currentStory.negativePrompt, currentStory.nsfw || false, finalInstruction,
        currentStory.sourceUrl, // Pass source URL to prompt logic
        currentStory.entityRegistry, // PASS REGISTRY FOR WHITELISTING
        currentChapter.title // Pass current chapter title to anchor the AI
      );

      let accumulatedNewText = "";
      let lastUpdateTime = 0;
      const separator = (currentChapter.content.length > 0 && !/\s$/.test(currentChapter.content)) ? ' ' : '';
      
      for await (const chunk of stream) {
        if (chunk.thought) {
            // Silently log thinking process but don't show in final content
            addLog(`[AI Thinking]: ${chunk.thought.substring(0, 50)}...`);
        }
        if (chunk.text) accumulatedNewText += chunk.text;
        if (chunk.usageMetadata?.totalTokenCount) setTokenStats(prev => ({ ...prev, current: chunk.usageMetadata.totalTokenCount || 0 }));
        const now = Date.now();
        if (now - lastUpdateTime > 200 && chunk.text) { 
            setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, content: currentChapter.content + separator + accumulatedNewText } : c) }) : null);
            lastUpdateTime = now;
        }
      }
      
      const finalContent = currentChapter.content + separator + accumulatedNewText;
      
      // Update State with full final text
      setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, content: finalContent } : c) }) : null);

      // --- SWITCH STATUS TO DATA UPDATE ---
      setGenerationStatus('Đang cập nhật dữ liệu...');

      // Create a temporary Updated Story Object for post-processing so we don't rely on stale Ref
      const updatedStory: Story = {
          ...currentStory,
          chapters: currentStory.chapters.map(c => c.id === activeChapterId ? { ...c, content: finalContent } : c)
      };

      if (accumulatedNewText.length > 50) {
        if (finalContent.length > 2500 && (!currentChapter.summary || finalContent.length - (currentChapter.summary.length * 10) > 3500)) {
            const summary = await ProviderFactory.getInstance().summarize(finalContent, currentStory.pronounStyle);
            if (summary) {
                // Update local obj
                updatedStory.chapters = updatedStory.chapters.map(c => c.id === activeChapterId ? { ...c, summary } : c);
                // Update State
                setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, summary } : c) }) : null);
                
                const summaryEmbedding = await ProviderFactory.getInstance().embedText(summary);
                if (summaryEmbedding.length > 0) {
                     const summaryVector: VectorData = {
                        id: crypto.randomUUID(), storyId: currentStory.id, text: `[Tóm tắt ${currentChapter.title}]: ${summary}`,
                        embedding: summaryEmbedding, magnitude: getMagnitude(summaryEmbedding), createdAt: Date.now(),
                        metadata: { type: 'summary', referenceId: activeChapterId, chapterIndex: currentChapter.order, importance: 3, provider: ProviderFactory.getInstance().getConfig().activeProvider }
                    };
                    await storageService.saveVectors([summaryVector]);
                    setVectors(prev => [...prev, summaryVector]);
                }
            }
        }
      }
      
      // Save final state
      await storageService.saveStory(updatedStory);
      
      // Manual ref update to ensure subsequent async calls see the latest data
      storyRef.current = updatedStory;

      // AUTO MAINTENANCE: Re-index vector database and Scan for new characters
      await reindexCurrentChapter(true, updatedStory);
      await extractAndSyncCharacters(true, updatedStory);

    } catch (e) { console.error(e); } finally { 
        setIsGenerating(false); 
        setGenerationStatus('');
    }
  };

  const generateRewrite = async (instruction: string) => {
    if (!storyRef.current || !activeChapterId) return;
    const currentStory = storyRef.current;
    const currentChapter = currentStory.chapters.find(c => c.id === activeChapterId);
    if (!currentChapter) return;

    setIsGenerating(true);
    setGenerationStatus('AI đang sửa văn bản...');

    try {
        const stream = ProviderFactory.getInstance().rewriteContentStream(
            currentChapter.content || "",
            instruction,
            {
                worldBible: currentStory.setting,
                synopsis: currentStory.synopsis,
                characters: currentStory.characters,
                worldLore: currentStory.worldLore || [],
                genre: currentStory.genre,
                writingStyle: currentStory.writingStyle || "",
                pov: currentStory.pov,
                pronounStyle: currentStory.pronounStyle,
                negativePrompt: currentStory.negativePrompt,
                nsfw: currentStory.nsfw || false,
                sourceUrl: currentStory.sourceUrl,
                entityRegistry: currentStory.entityRegistry // Pass registry
            }
        );

        let accumulatedNewText = "";
        let lastUpdateTime = 0;
        
        // Clear content to show rewrite process
        setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, content: "" } : c) }) : null);

        for await (const chunk of stream) {
            if (chunk.text) {
                accumulatedNewText += chunk.text;
                 const now = Date.now();
                if (now - lastUpdateTime > 100) {
                     setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, content: accumulatedNewText } : c) }) : null);
                     lastUpdateTime = now;
                }
            }
        }
        
        // Final update
        setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, content: accumulatedNewText } : c) }) : null);

        // Save
        const updatedStory = { ...currentStory, chapters: currentStory.chapters.map(c => c.id === activeChapterId ? { ...c, content: accumulatedNewText } : c) };
        await storageService.saveStory(updatedStory);
        storyRef.current = updatedStory;

        // Post-processing
        await reindexCurrentChapter(true, updatedStory);
        await extractAndSyncCharacters(true, updatedStory);

    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
        setGenerationStatus('');
    }
  }

  const addCharacter = (char: Character) => setStory(prev => prev ? ({ ...prev, characters: [...prev.characters, char] }) : null);
  
  const exportStory = async (id?: string) => {
    const targetStory = id ? storiesList.find(s => s.id === id) : story;
    if (!targetStory) return;
    try {
        // FIX: Fetch fresh vectors directly from IndexedDB instead of relying on state (which is empty in Library view)
        const relatedVectors = await storageService.getVectorsByStory(targetStory.id);
        
        const backupData: BackupData = { 
            version: 1, 
            story: targetStory, 
            vectors: relatedVectors, 
            exportedAt: Date.now() 
        };
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${targetStory.title.replace(/[^a-zA-Z0-9]/g, '_')}_v1.0.2.json`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const importStory = async (file: File) => {
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      let importedStory = 'version' in jsonData ? jsonData.story : jsonData;
      let importedVectors = 'version' in jsonData ? jsonData.vectors : [];
      importedVectors = importedVectors.map((v: any) => ({ ...v, storyId: v.storyId || importedStory.id, createdAt: v.createdAt || Date.now() }));
      const existing = await storageService.getStory(importedStory.id);
      if (existing && !window.confirm("Truyện này đã tồn tại. Bạn có muốn ghi đè?")) return;
      if (existing) await storageService.deleteVectorsByStory(importedStory.id);
      await storageService.saveStory(importedStory);
      if (importedVectors.length > 0) await storageService.saveVectors(importedVectors);
      await loadStories();
    } catch (e) { console.error(e); }
  };

  return (
    <StoryContext.Provider value={{
      story, storiesList, isStoriesLoaded, activeChapterId, characters: story?.characters || [],
      isGenerating, generationStatus, generationProgress, generationSteps, generationLogs, tokenStats, userInstruction, setUserInstruction, loadStories, createStory,
      openStory, closeStory, deleteStory, updateStorySettings, selectChapter, addChapter,
      updateChapterContent, generateContinue, generateRewrite, extractAndSyncCharacters, addCharacter,
      reindexCurrentChapter, updateWorldLore, saveProgress,
      exportStory, importStory
    }}>
      {children}
    </StoryContext.Provider>
  );
};

export const useStory = () => {
  const context = useContext(StoryContext);
  if (!context) throw new Error("useStory must be used within StoryProvider");
  return context;
};
