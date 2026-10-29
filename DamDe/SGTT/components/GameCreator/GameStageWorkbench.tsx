import React, { useState, useEffect } from 'react';
import { Save, Edit3, Image as ImageIcon, Music, Trash2, Plus, Play, Pause, ChevronLeft, X, Loader2, RefreshCw } from 'lucide-react';
import { useStory } from '../../state/StoryContext';
import { ProviderFactory } from '../../infra/providers/ProviderFactory';

interface GameStageWorkbenchProps {
  initialData: any;
  onBack: () => void;
}

export const GameStageWorkbench: React.FC<GameStageWorkbenchProps> = ({ initialData, onBack }) => {
  const [data, setData] = useState<any>(initialData || {});
  const [activeTab, setActiveTab] = useState<'overview' | 'player' | 'ai_chars' | 'scenes' | 'events'>('overview');
  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [bookTitleInput, setBookTitleInput] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState<string | null>(null); // ID of the item being generated
  const { createStory } = useStory();

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = () => {
    // In a real app, this would save to local storage or backend
    showToast('Đã lưu dữ liệu sân khấu game!');
  };

  const handleCreateGameBookClick = () => {
    setBookTitleInput(data.book_title || 'Game Mới');
    setShowTitleDialog(true);
  };

  const handleConfirmCreateGameBook = async () => {
    if (!bookTitleInput.trim()) return;
    
    setShowTitleDialog(false);
    
    try {
      // Integrate with StoryContext to create a new story
      await createStory(
        bookTitleInput.trim(),
        'Game Book', // genre
        data.story_direction || '', // synopsis
        data.world_background || '', // setting
        '', // writingStyle
        'Góc nhìn thứ ba', // pov
        'Hắn/Y', // pronounStyle
        '', // negativePrompt
        false, // nsfw
        undefined, // fandomName
        undefined, // sourceUrl
        'gameBook', // storyType
        undefined, // sourceFileContent
        {
          worldConfig: {
            world_background: data.world_background,
            story_direction: data.story_direction,
            total_days: 1
          },
          player: data.player_character || { name: 'Người chơi', role: 'Kẻ lang thang' },
          aiCharacters: data.ai_characters || [],
          scenes: data.game_scenes || [],
          todayEvents: data.first_day_events?.map((e: any, i: number) => ({
            id: `evt_init_${i}`,
            name: e.title,
            description: e.dialogues?.map((d: any) => `${d.name}: ${d.message}`).join('\n') || '',
            scene_id: e.scene_id,
            status: 'pending',
            dialogues: e.dialogues || []
          })) || [],
          eventLogbook: { history_events: [], logs: [] },
          gameBible: data.gameTheme_gameBible || { world_rules: "Chưa thiết lập", current_arc: "Chưa thiết lập", day_cores: [], character_states: {} }
        }
      );
      
      showToast('Đã tạo game book thành công!');
      
    } catch (error) {
      console.error('Failed to create game book:', error);
      showToast('Có lỗi xảy ra khi tạo game book.', 'error');
    }
  };

  const updateField = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleGenerateCharImage = async (charId: string) => {
    const char = data.ai_characters.find((c: any) => c.id === charId);
    if (!char) return;

    setIsGeneratingMedia(charId);
    try {
      const provider = ProviderFactory.getInstance();
      const prompt = char.imagePrompt || `A character portrait of ${char.name}, ${char.identity}, ${char.appearance}. High quality, detailed, anime style.`;
      const imagePath = await provider.generateImage(prompt, "3:4");
      
      if (imagePath) {
        const updatedChars = data.ai_characters.map((c: any) => 
          c.id === charId ? { ...c, imagePath } : c
        );
        updateField('ai_characters', updatedChars);
        showToast(`Đã tạo ảnh cho ${char.name}`);
      }
    } catch (error) {
      console.error('Failed to generate character image:', error);
      showToast('Lỗi khi tạo ảnh nhân vật', 'error');
    } finally {
      setIsGeneratingMedia(null);
    }
  };

  const handleGenerateSceneImage = async (sceneId: string) => {
    const scene = data.game_scenes.find((s: any) => s.id === sceneId);
    if (!scene) return;

    setIsGeneratingMedia(sceneId);
    try {
      const provider = ProviderFactory.getInstance();
      const prompt = scene.imagePrompt || `A beautiful environment scene of ${scene.name}, ${scene.description}. High quality, detailed, landscape, anime style.`;
      const imagePath = await provider.generateImage(prompt, "16:9");
      
      if (imagePath) {
        const updatedScenes = data.game_scenes.map((s: any) => 
          s.id === sceneId ? { ...s, imagePath } : s
        );
        updateField('game_scenes', updatedScenes);
        showToast(`Đã tạo ảnh cho cảnh ${scene.name}`);
      }
    } catch (error) {
      console.error('Failed to generate scene image:', error);
      showToast('Lỗi khi tạo ảnh cảnh', 'error');
    } finally {
      setIsGeneratingMedia(null);
    }
  };

  const handleAddCharacter = () => {
    const newChar = {
      id: Math.random().toString(36).substring(2, 15),
      name: 'Nhân vật mới',
      identity: 'Thân phận bí ẩn',
      appearance: 'Ngoại hình chưa rõ',
      personality: 'Tính cách chưa rõ',
      motivation: 'Động cơ chưa rõ',
      status: 'Bình thường'
    };
    updateField('ai_characters', [...(data.ai_characters || []), newChar]);
  };

  const handleDeleteCharacter = (id: string) => {
    updateField('ai_characters', data.ai_characters.filter((c: any) => c.id !== id));
  };

  const handleAddScene = () => {
    const newScene = {
      id: Math.random().toString(36).substring(2, 15),
      name: 'Cảnh mới',
      description: 'Mô tả cảnh mới',
      status: 'Bình thường'
    };
    updateField('game_scenes', [...(data.game_scenes || []), newScene]);
  };

  const handleDeleteScene = (id: string) => {
    updateField('game_scenes', data.game_scenes.filter((s: any) => s.id !== id));
  };

  const updateCharacterField = (id: string, field: string, value: string) => {
    const updatedChars = data.ai_characters.map((c: any) => 
      c.id === id ? { ...c, [field]: value } : c
    );
    updateField('ai_characters', updatedChars);
  };

  const updateSceneField = (id: string, field: string, value: string) => {
    const updatedScenes = data.game_scenes.map((s: any) => 
      s.id === id ? { ...s, [field]: value } : s
    );
    updateField('game_scenes', updatedScenes);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 font-sans flex flex-col relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn ${toastMessage.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
          <span className="text-sm font-medium text-gray-50">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className={`p-1 rounded-full transition-colors ${toastMessage.type === 'success' ? 'hover:bg-green-600' : 'hover:bg-red-600'}`}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Title Dialog Modal */}
      {showTitleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h3 className="text-lg font-bold text-gray-100">Lưu thành Game Book</h3>
              <button onClick={() => setShowTitleDialog(false)} className="text-gray-400 hover:text-gray-50 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400">
                Đóng gói thế giới, nhân vật và cảnh hiện tại thành một cuốn game book có thể chơi được.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tiêu đề Game Book</label>
                <input
                  type="text"
                  value={bookTitleInput}
                  onChange={(e) => setBookTitleInput(e.target.value)}
                  placeholder="Ví dụ: Hành trình Eridu"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-800 bg-gray-900/50">
              <button 
                onClick={() => setShowTitleDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleConfirmCreateGameBook}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-primary-900/20"
              >
                Tạo mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AppBar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900 shadow-sm shrink-0">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-gray-800 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-medium">Bàn làm việc sân khấu</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">
            <Save size={16} />
            Lưu
          </button>
          <button onClick={handleCreateGameBookClick} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium transition-colors">
            <Play size={16} />
            Tạo Game Book
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900 overflow-x-auto shrink-0">
        {[
          { id: 'overview', label: 'Tổng quan' },
          { id: 'player', label: 'Người chơi' },
          { id: 'ai_chars', label: 'Nhân vật AI' },
          { id: 'scenes', label: 'Cảnh game' },
          { id: 'events', label: 'Sự kiện ngày 1' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-primary-500 text-primary-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-100">Thông tin cơ bản</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Tên sách / Thế giới</label>
                    <input 
                      type="text" 
                      value={data.book_title || ''} 
                      onChange={(e) => updateField('book_title', e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Bối cảnh thế giới</label>
                    <textarea 
                      value={data.world_background || ''} 
                      onChange={(e) => updateField('world_background', e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none min-h-[120px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Hướng phát triển cốt truyện</label>
                    <textarea 
                      value={data.story_direction || ''} 
                      onChange={(e) => updateField('story_direction', e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'player' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-100">Nhân vật người chơi</h3>
                </div>
                {data.player_character ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(data.player_character).map(([key, value]) => (
                      <div key={key} className="bg-gray-950 p-4 rounded-lg border border-gray-800">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-bold">{key}</div>
                        <div className="text-sm text-gray-200">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">Chưa có dữ liệu nhân vật người chơi</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ai_chars' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-100">Danh sách nhân vật AI</h3>
                <button 
                  onClick={handleAddCharacter}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                >
                  <Plus size={16} /> Thêm nhân vật
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(data.ai_characters || []).map((char: any, idx: number) => (
                  <div key={char.id || idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
                      <input 
                        type="text" 
                        value={char.name || ''} 
                        onChange={(e) => updateCharacterField(char.id, 'name', e.target.value)}
                        className="font-bold text-primary-400 bg-transparent border-none focus:ring-0 p-0 w-full"
                        placeholder="Tên nhân vật"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDeleteCharacter(char.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 flex-1 space-y-3">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center shrink-0 border border-gray-700 relative group overflow-hidden">
                          {char.imagePath ? (
                            <img src={char.imagePath} alt={char.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={32} className="text-gray-600" />
                          )}
                          <div 
                            onClick={() => handleGenerateCharImage(char.id)}
                            className={`absolute inset-0 bg-black/60 ${isGeneratingMedia === char.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center justify-center transition-opacity cursor-pointer`}
                          >
                            {isGeneratingMedia === char.id ? (
                              <Loader2 className="animate-spin text-white" size={20} />
                            ) : (
                              <span className="text-xs font-medium text-white">Tạo ảnh</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Thân phận</label>
                            <input 
                              type="text" 
                              value={char.identity || ''} 
                              onChange={(e) => updateCharacterField(char.id, 'identity', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-300"
                              placeholder="Thân phận"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Ngoại hình</label>
                            <textarea 
                              value={char.appearance || ''} 
                              onChange={(e) => updateCharacterField(char.id, 'appearance', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-300 resize-none min-h-[40px]"
                              placeholder="Ngoại hình"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase font-bold">Tính cách & Động cơ</label>
                        <textarea 
                          value={char.personality || ''} 
                          onChange={(e) => updateCharacterField(char.id, 'personality', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-300 resize-none min-h-[40px]"
                          placeholder="Tính cách"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'scenes' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-100">Danh sách cảnh game</h3>
                <button 
                  onClick={handleAddScene}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                >
                  <Plus size={16} /> Thêm cảnh
                </button>
              </div>
              
              <div className="space-y-4">
                {(data.game_scenes || []).map((scene: any, idx: number) => (
                  <div key={scene.id || idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
                      <input 
                        type="text" 
                        value={scene.name || ''} 
                        onChange={(e) => updateSceneField(scene.id, 'name', e.target.value)}
                        className="font-bold text-green-400 bg-transparent border-none focus:ring-0 p-0 w-full"
                        placeholder="Tên cảnh"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDeleteScene(scene.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <textarea 
                        value={scene.description || ''} 
                        onChange={(e) => updateSceneField(scene.id, 'description', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-300 resize-none min-h-[60px] mb-4"
                        placeholder="Mô tả cảnh"
                      />
                      
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-3 bg-gray-950 p-3 rounded-lg border border-gray-800 flex-1 min-w-[200px]">
                          <div className="w-16 h-12 bg-gray-800 rounded flex items-center justify-center shrink-0 overflow-hidden relative group">
                            {scene.imagePath ? (
                              <img src={scene.imagePath} alt={scene.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={20} className="text-gray-500" />
                            )}
                            <div 
                              onClick={() => handleGenerateSceneImage(scene.id)}
                              className={`absolute inset-0 bg-black/60 ${isGeneratingMedia === scene.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center justify-center transition-opacity cursor-pointer`}
                            >
                              {isGeneratingMedia === scene.id ? (
                                <Loader2 className="animate-spin text-white" size={16} />
                              ) : (
                                <RefreshCw className="text-white" size={16} />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">Hình nền</div>
                            <button 
                              onClick={() => handleGenerateSceneImage(scene.id)}
                              className="text-xs text-primary-400 hover:text-primary-300"
                            >
                              {scene.imagePath ? 'Tạo lại' : 'Tạo hình ảnh'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-gray-950 p-3 rounded-lg border border-gray-800 flex-1 min-w-[200px]">
                          <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center shrink-0">
                            <Music size={20} className="text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">Nhạc nền</div>
                            <button className="text-xs text-primary-400 hover:text-primary-300">Tạo âm nhạc</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-100">Sự kiện ngày đầu tiên</h3>
              </div>
              
              <div className="space-y-4">
                {(data.first_day_events || []).map((event: any, idx: number) => (
                  <div key={event.id || idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-800 bg-gray-800/30">
                      <h4 className="font-bold text-orange-400">{event.title || 'Sự kiện chưa đặt tên'}</h4>
                      <div className="text-xs text-gray-500 mt-1">Scene ID: {event.scene_id}</div>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        {(event.dialogues || []).map((dialogue: any, dIdx: number) => (
                          <div key={dIdx} className="flex gap-3">
                            <div className="font-bold text-sm text-gray-400 shrink-0 w-24 text-right">{dialogue.name}:</div>
                            <div className="text-sm text-gray-200 bg-gray-950 p-2 rounded-lg border border-gray-800 flex-1">{dialogue.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {(!data.first_day_events || data.first_day_events.length === 0) && (
                  <div className="text-center py-12 text-gray-500 bg-gray-900 rounded-xl border border-gray-800 border-dashed">
                    Không có sự kiện nào được tạo
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
