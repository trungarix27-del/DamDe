

import React, { useState } from 'react';
import { X, Save, Wand2, BookOpen, User, Settings, FileText, Upload } from 'lucide-react';
import { Character } from './types';
import { v4 as uuidv4 } from 'uuid';
import { scenario_db } from '../../constants/scenarioDB';

interface CharacterCreatorProps {
  onClose: () => void;
  onSave: (character: Character) => void;
  initialCharacter?: Character | null;
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({
  onClose,
  onSave,
  initialCharacter,
}) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'advanced' | 'worldinfo'>('identity');
  
  // Identity
  const [name, setName] = useState(initialCharacter?.name || '');
  const [persona, setPersona] = useState(initialCharacter?.description || '');
  const [scenario, setScenario] = useState(initialCharacter?.scenario || '');
  const [firstMes, setFirstMes] = useState(initialCharacter?.firstMes || '');
  const [avatarUrl, setAvatarUrl] = useState(initialCharacter?.avatarUrl || '');
  const [tags, setTags] = useState<string[]>(initialCharacter?.tags || []);
  const [newTag, setNewTag] = useState('');
  
  // Advanced
  const [mesExample, setMesExample] = useState(initialCharacter?.mesExample || '');
  const [systemPrompt, setSystemPrompt] = useState(initialCharacter?.systemPrompt || '');
  const [postHistoryInstructions, setPostHistoryInstructions] = useState(initialCharacter?.postHistoryInstructions || '');
  const [creatorNotes, setCreatorNotes] = useState(initialCharacter?.creatorNotes || '');

  // World Info
  const [worldInfo, setWorldInfo] = useState<any[]>(initialCharacter?.worldInfo || []);

  const [showPresets, setShowPresets] = useState(false);

  const handleAddWI = () => {
    setWorldInfo([...worldInfo, { key: '', content: '', constant: false }]);
  };

  const handleUpdateWI = (index: number, field: string, value: any) => {
    const updated = [...worldInfo];
    updated[index] = { ...updated[index], [field]: value };
    setWorldInfo(updated);
  };

  const handleRemoveWI = (index: number) => {
    setWorldInfo(worldInfo.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
        alert('Vui lòng nhập tên nhân vật.');
        return;
    }

    const newCharacter: Character = {
      id: initialCharacter?.id || uuidv4(),
      name: name.trim(),
      description: persona,
      personality: '', 
      scenario: scenario,
      firstMes: firstMes || 'Hello there!',
      mesExample: mesExample,
      creatorNotes: creatorNotes,
      systemPrompt: systemPrompt,
      postHistoryInstructions: postHistoryInstructions,
      tags: tags,
      creator: initialCharacter?.creator || 'User',
      characterVersion: '1.0',
      alternateGreetings: [],
      avatarUrl: avatarUrl,
      createdAt: initialCharacter?.createdAt || Date.now(),
      updatedAt: Date.now(),
      worldInfo: worldInfo,
    };

    onSave(newCharacter);
    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-800 bg-gray-900 sticky top-0 z-10 shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-gray-50 flex items-center gap-2">
            {initialCharacter ? 'Chỉnh sửa nhân vật' : 'Tạo nhân vật mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 md:p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-gray-50"
          >
            <X size={20} className="md:w-5 md:h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900/50 overflow-x-auto scrollbar-hide shrink-0">
            <button
                onClick={() => setActiveTab('identity')}
                className={`flex-1 py-2.5 md:py-3 px-3 md:px-0 text-[11px] md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap ${
                    activeTab === 'identity' 
                    ? 'border-purple-500 text-purple-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
                <User size={14} className="md:w-4 md:h-4" />
                Danh tính
            </button>
            <button
                onClick={() => setActiveTab('advanced')}
                className={`flex-1 py-2.5 md:py-3 px-3 md:px-0 text-[11px] md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap ${
                    activeTab === 'advanced' 
                    ? 'border-purple-500 text-purple-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
                <Settings size={14} className="md:w-4 md:h-4" />
                Nâng cao
            </button>
            <button
                onClick={() => setActiveTab('worldinfo')}
                className={`flex-1 py-2.5 md:py-3 px-3 md:px-0 text-[11px] md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap ${
                    activeTab === 'worldinfo' 
                    ? 'border-purple-500 text-purple-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
                <BookOpen size={14} className="md:w-4 md:h-4" />
                Thông tin thế giới
            </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto">
          {activeTab === 'identity' ? (
              <>
                {/* Avatar URL & Upload */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                        Ảnh đại diện
                        </label>
                        <div className="flex gap-2">
                            <input
                            type="text"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="URL ảnh hoặc tải lên..."
                            className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                            />
                            <input 
                                type="file" 
                                id="avatar-upload" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            setAvatarUrl(event.target?.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <label 
                                htmlFor="avatar-upload"
                                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                            >
                                <Upload size={14} />
                                <span>Tải lên</span>
                            </label>
                        </div>
                    </div>
                    {avatarUrl && (
                        <div className="shrink-0 flex items-end">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-700">
                                <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => setAvatarUrl('')}
                                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tên <span className="text-red-500">*</span>
                    </label>
                    <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Seraphina"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    required
                    />
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Thẻ (Tags)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-purple-900/30 text-purple-400 border border-purple-500/30 rounded-full text-xs flex items-center gap-1">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-white">
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            placeholder="Thêm thẻ mới..."
                            className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button 
                            onClick={handleAddTag}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition-colors"
                        >
                            Thêm
                        </button>
                    </div>
                </div>

                {/* Template Button */}
                <div className="flex justify-end gap-2">
                    <button
                    onClick={() => setShowPresets(true)}
                    className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                    <BookOpen size={12} />
                    Tải thiết lập sẵn
                    </button>
                    <button
                    onClick={() => {
                        if (confirm('Hành động này sẽ ghi đè các trường hiện tại bằng một mẫu có sẵn. Tiếp tục?')) {
                        const charName = name || 'Bot';
                        const template = `[Tổng quan: <hãy cho AI biết tổng quan về ý định của bạn ở đây trong một câu>]

[Định nghĩa nhân vật của ${charName}:
Giới tính: <nữ, nam, không rõ>
Chủng tộc: <người, tiên, người ngoài hành tinh>
Tuổi:
Chiều cao:
Cân nặng:
Thể hình:
Tóc:
Mắt:
Lông mày:
Sở thích trang phục:
Tính cách:
Tâm trí:
Cách nói chuyện:
Giọng điệu:
Cử chỉ:
Thích:
Ghét:
Sở thích:
Mục tiêu ngắn hạn:
Mục tiêu dài hạn:
Mục tiêu chính của ${charName} là:
Ký ức tuổi thơ của ${charName}:
Ký ức dài hạn của ${charName}: <thêm mô tả về bạn bè và những người tương tự trong cuộc đời của ${charName} tại đây>
Ký ức ngắn hạn liên quan đến bối cảnh: ]

[Thể loại: <thêm một hoặc nhiều định nghĩa thể loại cho bối cảnh của bạn tại đây>]

[Thẻ: <thêm một hoặc nhiều thẻ mô tả cuộc nhập vai của bạn cho AI tại đây>]`;
                        
                        setPersona(template);
                        setScenario(`[Bối cảnh: <thêm bối cảnh của bạn tại đây>]`);
                        setFirstMes(`${charName}: <thêm một số tin nhắn mẫu (ẩn) cho ${charName} tại đây>`);
                        }
                    }}
                    className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                    <Wand2 size={12} />
                    Tải mẫu nhân vật
                    </button>
                </div>

                {/* Presets Modal */}
                {showPresets && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                        <h3 className="text-lg font-bold text-gray-50">Chọn một thiết lập sẵn</h3>
                        <button onClick={() => setShowPresets(false)} className="text-gray-400 hover:text-gray-50">
                            <X size={20} />
                        </button>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1">
                        {scenario_db.map((preset, idx) => (
                            <button
                            key={idx}
                            onClick={() => {
                                if (confirm(`Tải thiết lập sẵn "${preset.title}"? Hành động này sẽ ghi đè các trường hiện tại.`)) {
                                    setName(preset.chatopponent || preset.title);
                                    setPersona(preset.memory || '');
                                    setScenario(preset.prompt || '');
                                    setShowPresets(false);
                                }
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors group"
                            >
                            <div className="font-medium text-gray-50 group-hover:text-purple-400 transition-colors">{preset.title}</div>
                            <div className="text-xs text-gray-500 line-clamp-1">{preset.desc}</div>
                            </button>
                        ))}
                        </div>
                    </div>
                    </div>
                )}

                {/* Persona / Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tính cách / Mô tả
                    </label>
                    <textarea
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    placeholder="Mô tả tính cách, ngoại hình và tiểu sử của nhân vật..."
                    rows={12}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y font-mono text-sm"
                    />
                </div>

                {/* Scenario */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bối cảnh (Tùy chọn)
                    </label>
                    <textarea
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    placeholder="Mô tả tình huống hoặc bối cảnh hiện tại..."
                    rows={3}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y"
                    />
                </div>

                {/* First Message */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tin nhắn đầu tiên / Lời chào
                    </label>
                    <textarea
                    value={firstMes}
                    onChange={(e) => setFirstMes(e.target.value)}
                    placeholder="Nhân vật sẽ nói gì đầu tiên?"
                    rows={3}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y"
                    />
                </div>
              </>
          ) : activeTab === 'advanced' ? (
              <>
                {/* Example Dialogue */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hội thoại mẫu (mes_example)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                        Ví dụ về cách nhân vật nói chuyện. Sử dụng &lt;START&gt; để phân tách các ví dụ.
                    </p>
                    <textarea
                    value={mesExample}
                    onChange={(e) => setMesExample(e.target.value)}
                    placeholder={`<START>\n{{user}}: Xin chào\n{{char}}: Chào bạn!`}
                    rows={8}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y font-mono text-sm"
                    />
                </div>

                {/* System Prompt */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ghi đè System Prompt (Tùy chọn)
                    </label>
                    <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Ghi đè system prompt chính..."
                    rows={4}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y font-mono text-sm"
                    />
                </div>

                {/* Post History Instructions */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chỉ dẫn sau lịch sử (Tùy chọn)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                        Các chỉ dẫn được chèn vào cuối prompt (ví dụ: "Viết phản hồi ngắn").
                    </p>
                    <textarea
                    value={postHistoryInstructions}
                    onChange={(e) => setPostHistoryInstructions(e.target.value)}
                    placeholder="Chỉ dẫn cho AI..."
                    rows={2}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y"
                    />
                </div>

                {/* Creator Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ghi chú của người tạo (Riêng tư)
                    </label>
                    <textarea
                    value={creatorNotes}
                    onChange={(e) => setCreatorNotes(e.target.value)}
                    placeholder="Ghi chú về nhân vật này..."
                    rows={2}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y"
                    />
                </div>
              </>
          ) : (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Các mục thông tin thế giới</h3>
                      <button 
                        onClick={handleAddWI}
                        className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-gray-50 transition-colors"
                      >
                          + Thêm mục
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      {worldInfo.map((wi, idx) => (
                          <div key={idx} className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-3 relative group">
                              <button 
                                onClick={() => handleRemoveWI(idx)}
                                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                  <X size={14} />
                              </button>
                              
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Từ khóa (cách nhau bằng dấu phẩy)</label>
                                      <input 
                                        type="text" 
                                        value={wi.key}
                                        onChange={(e) => handleUpdateWI(idx, 'key', e.target.value)}
                                        placeholder="rồng, lửa, lâu đài"
                                        className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-sm text-gray-100 focus:border-indigo-500 outline-none"
                                      />
                                  </div>
                                  <div className="flex items-end pb-1">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                          <input 
                                            type="checkbox" 
                                            checked={wi.constant}
                                            onChange={(e) => handleUpdateWI(idx, 'constant', e.target.checked)}
                                            className="rounded border-gray-800 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
                                          />
                                          <span className="text-xs text-gray-400">Cố định (Luôn kích hoạt)</span>
                                      </label>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nội dung</label>
                                  <textarea 
                                    value={wi.content}
                                    onChange={(e) => handleUpdateWI(idx, 'content', e.target.value)}
                                    placeholder="Mô tả về yếu tố thế giới..."
                                    rows={3}
                                    className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-sm text-gray-100 focus:border-indigo-500 outline-none resize-y"
                                  />
                              </div>
                          </div>
                      ))}
                      
                      {worldInfo.length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-xl text-gray-600">
                              Chưa có mục thông tin thế giới nào.
                          </div>
                      )}
                  </div>
              </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 md:p-4 border-t border-gray-800 bg-gray-900 sticky bottom-0 flex justify-end gap-2 md:gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-3 md:px-4 py-2 rounded-lg text-sm md:text-base text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-4 md:px-6 py-2 bg-purple-600 hover:bg-purple-700 text-gray-50 text-sm md:text-base rounded-lg font-medium transition-colors flex items-center gap-1.5 md:gap-2"
          >
            <Save size={16} className="md:w-[18px] md:h-[18px]" />
            Lưu nhân vật
          </button>
        </div>
      </div>
    </div>
  );
};
