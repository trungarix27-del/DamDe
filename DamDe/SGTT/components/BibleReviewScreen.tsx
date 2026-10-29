
import React, { useState } from 'react';
import { Story, Character } from '../types';
import { Globe, ShieldAlert, Users, Target, Save, X, Plus, Trash2, Edit3, CheckCircle2 } from 'lucide-react';

interface BibleReviewScreenProps {
    pendingStory: Story;
    onUpdate: (updatedStory: Story) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const BibleReviewScreen: React.FC<BibleReviewScreenProps> = ({ pendingStory, onUpdate, onConfirm, onCancel }) => {
    const [story, setStory] = useState<Story>(pendingStory);
    const [editingCharId, setEditingCharId] = useState<string | null>(null);

    const bible = story.storyBible || { world: '', rules: '', arc: '', chars: [], chapter_cores: [] };

    const updateBible = (updates: any) => {
        const updatedStory = {
            ...story,
            storyBible: {
                ...bible,
                ...updates
            }
        };
        setStory(updatedStory);
        onUpdate(updatedStory);
    };

    const handleCharUpdate = (id: string, updates: Partial<Character>) => {
        const updatedChars = story.characters.map(c => c.id === id ? { ...c, ...updates } : c);
        const updatedStory = {
            ...story,
            characters: updatedChars,
            storyBible: {
                ...bible,
                chars: bible.chars.map((bc, idx) => {
                    const correspondingChar = story.characters[idx];
                    if (correspondingChar && correspondingChar.id === id) {
                        return { ...bc, name: updates.name || bc.name, role: updates.role || bc.role, core: updates.description || bc.core };
                    }
                    return bc;
                })
            }
        };
        setStory(updatedStory);
        onUpdate(updatedStory);
    };

    const addCharacter = () => {
        const newId = `char_custom_${Date.now()}`;
        const newChar: Character = {
            id: newId,
            name: "Nhân vật mới",
            role: "Vai trò",
            description: "Mô tả tính cách",
            traits: [],
            appearance: { general: "Chưa rõ", face: "", body: "", hair: "", clothing: "" },
            personality: "Mô tả tính cách",
            core_personality: "Mô tả tính cách"
        };
        
        const updatedStory = {
            ...story,
            characters: [...story.characters, newChar],
            storyBible: {
                ...bible,
                chars: [...bible.chars, { name: newChar.name, role: newChar.role, core: newChar.description }]
            }
        };
        setStory(updatedStory);
        onUpdate(updatedStory);
        setEditingCharId(newId);
    };

    const removeCharacter = (id: string) => {
        const charIndex = story.characters.findIndex(c => c.id === id);
        if (charIndex === -1) return;

        const updatedStory = {
            ...story,
            characters: story.characters.filter(c => c.id !== id),
            storyBible: {
                ...bible,
                chars: bible.chars.filter((_, idx) => idx !== charIndex)
            }
        };
        setStory(updatedStory);
        onUpdate(updatedStory);
    };

    return (
        <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col animate-fadeIn overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-500" />
                    <h2 className="text-xl font-bold text-gray-200">Kiểm tra & Tùy chỉnh Thế giới</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex items-center gap-2 px-6 py-2 bg-[#5b639a] hover:bg-[#4a5182] text-white rounded-lg font-bold shadow-lg transition-all"
                    >
                        <Save size={18} />
                        Xác nhận & Bắt đầu
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-8 pb-20">
                    
                    {/* World Setting */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe className="text-[#5b639a]" size={20} />
                            <h3 className="text-lg font-bold text-gray-200">Thiết lập Thế giới (World Setting)</h3>
                        </div>
                        <textarea 
                            value={bible.world}
                            onChange={(e) => updateBible({ world: e.target.value })}
                            className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none focus:border-[#5b639a] transition-all text-sm leading-relaxed"
                        />
                    </section>

                    {/* Rules & Taboos */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert className="text-[#5b639a]" size={20} />
                            <h3 className="text-lg font-bold text-gray-200">Quy tắc & Điều cấm kỵ</h3>
                        </div>
                        <textarea 
                            value={bible.rules}
                            onChange={(e) => updateBible({ rules: e.target.value })}
                            className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none focus:border-[#5b639a] transition-all text-sm leading-relaxed"
                        />
                    </section>

                    {/* Current Arc/Goal */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="text-[#5b639a]" size={20} />
                            <h3 className="text-lg font-bold text-gray-200">Mục tiêu / Trạng thái Arc hiện tại</h3>
                        </div>
                        <textarea 
                            value={bible.arc}
                            onChange={(e) => updateBible({ arc: e.target.value })}
                            className="w-full h-24 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none focus:border-[#5b639a] transition-all text-sm leading-relaxed"
                        />
                    </section>

                    {/* Characters List */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Users className="text-[#5b639a]" size={20} />
                                <h3 className="text-lg font-bold text-gray-200">Danh sách Nhân vật</h3>
                            </div>
                            <button 
                                onClick={addCharacter}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-[#5b639a] rounded-lg text-sm font-medium border border-gray-700 transition-all"
                            >
                                <Plus size={16} />
                                Thêm nhân vật
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {story.characters.map((char) => (
                                <div key={char.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 group relative">
                                    {editingCharId === char.id ? (
                                        <div className="space-y-3">
                                            <input 
                                                value={char.name}
                                                onChange={(e) => handleCharUpdate(char.id, { name: e.target.value })}
                                                className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm font-bold text-gray-100"
                                                placeholder="Tên nhân vật"
                                            />
                                            <input 
                                                value={char.role}
                                                onChange={(e) => handleCharUpdate(char.id, { role: e.target.value })}
                                                className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-[#5b639a]"
                                                placeholder="Vai trò"
                                            />
                                            <textarea 
                                                value={char.description}
                                                onChange={(e) => handleCharUpdate(char.id, { description: e.target.value, personality: e.target.value, core_personality: e.target.value })}
                                                className="w-full h-20 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 outline-none"
                                                placeholder="Mô tả tính cách/đặc điểm"
                                            />
                                            <button 
                                                onClick={() => setEditingCharId(null)}
                                                className="w-full py-1 bg-[#5b639a]/20 text-[#5b639a] text-xs font-bold rounded"
                                            >
                                                Xong
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-gray-200">{char.name}</h4>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingCharId(char.id)} className="p-1 hover:bg-gray-700 rounded text-gray-400">
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button onClick={() => removeCharacter(char.id)} className="p-1 hover:bg-gray-700 rounded text-red-400">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-[#5b639a] mb-2 font-medium">{char.role}</p>
                                            <p className="text-xs text-gray-400 line-clamp-3">{char.description}</p>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
