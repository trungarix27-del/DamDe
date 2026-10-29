
import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, Upload, Link as LinkIcon, ArrowLeft, Search, Download, Copy, Trash2, CheckSquare, Square, SortAsc, SortDesc } from 'lucide-react';
import { Character } from './types';
import { CharacterOnlineImport } from './CharacterOnlineImport';
import { CharacterCard } from './CharacterCard';
import { CharacterCreator } from './CharacterCreator';
import { ConfirmModal } from '../ConfirmModal';
import { readTavernPngFromBlob, load_tavern_wi } from '../../utils/tavernCardUtils';
import { scenario_db } from '../../constants/scenarioDB';
import { v4 as uuidv4 } from 'uuid';

interface CharacterLibraryProps {
  onSelectCharacter: (character: Character) => void;
  onBack: () => void;
}

type SortOption = 'name' | 'newest' | 'oldest' | 'updated';

export const CharacterLibrary: React.FC<CharacterLibraryProps> = ({
  onSelectCharacter,
  onBack,
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showOnlineImport, setShowOnlineImport] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; character: Character | null }>({ isOpen: false, character: null });
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('damtuthanbut_characters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
            setCharacters(parsed);
            return;
        }
      } catch (e) {
        console.error('Failed to load characters', e);
      }
    }
    
    // If no characters, populate from scenario_db
    const builtIns = scenario_db
        .filter(s => s.opmode === 3 && s.chatopponent) // Filter for chat characters
        .map(s => {
            // Simple mapping
            const charName = s.chatopponent || s.title;
            return {
                id: uuidv4(),
                name: charName,
                description: s.memory || s.desc, // Use memory as description/persona
                personality: '',
                scenario: '',
                firstMes: s.prompt,
                mesExample: '',
                creatorNotes: `Built-in character: ${s.title}`,
                systemPrompt: '',
                postHistoryInstructions: '',
                tags: ['Built-in'],
                creator: s.author || 'System',
                characterVersion: '1.0',
                alternateGreetings: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                worldInfo: [],
                source: 'builtin'
            } as Character;
        });
    
    if (builtIns.length > 0) {
        setCharacters(builtIns);
        localStorage.setItem('damtuthanbut_characters', JSON.stringify(builtIns));
    }

  }, []);

  const saveCharacters = (updated: Character[]) => {
    setCharacters(updated);
    localStorage.setItem('damtuthanbut_characters', JSON.stringify(updated));
  };

  const handleCharacterLoaded = (character: Character) => {
    saveCharacters([...characters, character]);
    setShowOnlineImport(false);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.png,.webp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        let charData: any = null;
        let avatarUrl: string | undefined = undefined;

        if (file.name.endsWith('.json')) {
          const text = await file.text();
          charData = JSON.parse(text);
        } else if (file.name.endsWith('.png') || file.name.endsWith('.webp')) {
          // Parse PNG/WEBP using utility
          const tavernCard = await readTavernPngFromBlob(file);
          if (tavernCard) {
             charData = tavernCard;
             avatarUrl = URL.createObjectURL(file);
          } else {
             alert('Không tìm thấy dữ liệu nhân vật trong hình ảnh.');
             return;
          }
        }

        if (!charData) return;

        // Handle V2 spec
        const data = charData.data || charData; // Handle both wrapped and unwrapped

        const newChar: Character = {
          id: uuidv4(),
          name: data.name || file.name.replace(/\.[^/.]+$/, ""),
          avatarUrl: avatarUrl,
          description: data.description || '',
          personality: data.personality || '',
          scenario: data.scenario || '',
          firstMes: data.first_mes || '',
          mesExample: data.mes_example || '',
          creatorNotes: data.creator_notes || '',
          systemPrompt: data.system_prompt || '',
          postHistoryInstructions: data.post_history_instructions || '',
          tags: data.tags || [],
          creator: data.creator || 'Unknown',
          characterVersion: data.character_version || '1.0',
          alternateGreetings: data.alternate_greetings || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          worldInfo: load_tavern_wi(data.character_book),
        };

        saveCharacters([...characters, newChar]);
      } catch (error) {
        console.error('Import failed', error);
        alert('Không thể nhập thẻ nhân vật.');
      }
    };
    input.click();
  };

  const handleDelete = (character: Character) => {
    setConfirmDelete({ isOpen: true, character });
  };

  const performDelete = () => {
    if (confirmDelete.character) {
        const updated = characters.filter(c => c.id !== confirmDelete.character!.id);
        saveCharacters(updated);
        setConfirmDelete({ isOpen: false, character: null });
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmBatchDelete(true);
  };

  const performBatchDelete = () => {
    const updated = characters.filter(c => !selectedIds.has(c.id));
    saveCharacters(updated);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setConfirmBatchDelete(false);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredCharacters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCharacters.map(c => c.id)));
    }
  };

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedCharacters = [...filteredCharacters].sort((a, b) => {
    switch (sortOption) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'oldest':
        return a.createdAt - b.createdAt;
      case 'updated':
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      default:
        return 0;
    }
  });

  const handleEdit = (character: Character) => {
    setEditingCharacter(character);
    setShowCreator(true);
  };

  const handleClone = (character: Character) => {
    const cloned: Character = {
      ...character,
      id: uuidv4(),
      name: `${character.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveCharacters([...characters, cloned]);
  };

  const handleExport = (character: Character) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(character, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${character.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSaveCharacter = (character: Character) => {
    if (editingCharacter) {
      // Update existing
      const updated = characters.map(c => c.id === character.id ? character : c);
      saveCharacters(updated);
    } else {
      // Create new
      saveCharacters([...characters, character]);
    }
    setEditingCharacter(null);
    setShowCreator(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.name.endsWith('.json') || file.name.endsWith('.png') || file.name.endsWith('.webp')) {
        // Reuse the logic from handleImport but for a single file
        try {
            let charData: any = null;
            let avatarUrl: string | undefined = undefined;

            if (file.name.endsWith('.json')) {
              const text = await file.text();
              charData = JSON.parse(text);
            } else {
              const tavernCard = await readTavernPngFromBlob(file);
              if (tavernCard) {
                 charData = tavernCard;
                 avatarUrl = URL.createObjectURL(file);
              }
            }

            if (charData) {
                const data = charData.data || charData;
                const newChar: Character = {
                  id: uuidv4(),
                  name: data.name || file.name.replace(/\.[^/.]+$/, ""),
                  avatarUrl: avatarUrl,
                  description: data.description || '',
                  personality: data.personality || '',
                  scenario: data.scenario || '',
                  firstMes: data.first_mes || '',
                  mesExample: data.mes_example || '',
                  creatorNotes: data.creator_notes || '',
                  systemPrompt: data.system_prompt || '',
                  postHistoryInstructions: data.post_history_instructions || '',
                  tags: data.tags || [],
                  creator: data.creator || 'Unknown',
                  characterVersion: data.character_version || '1.0',
                  alternateGreetings: data.alternate_greetings || [],
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  worldInfo: load_tavern_wi(data.character_book),
                };
                saveCharacters([...characters, newChar]);
            }
        } catch (error) {
            console.error('Drop import failed', error);
        }
    }
  };

  return (
    <div 
        className="min-h-screen bg-gray-950 text-gray-50 font-sans flex flex-col"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
    >
      {/* AppBar */}
      <div className="flex flex-col md:flex-row items-start md:items-center p-3 md:p-4 border-b border-gray-800 bg-gray-900 shadow-sm sticky top-0 z-10 gap-3 md:gap-0">
        <div className="flex items-center w-full md:w-auto">
            <button
            onClick={onBack}
            className="p-1.5 md:p-2 mr-2 rounded-full hover:bg-gray-800 transition-colors"
            >
            <ArrowLeft size={20} className="md:w-6 md:h-6" />
            </button>
            <h1 className="text-base md:text-xl font-medium truncate">Thư viện Nhân vật</h1>
            <span className="ml-2 px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400 font-mono">
                {characters.length}
            </span>
        </div>
        
        <div className="flex gap-1.5 md:gap-2 w-full md:w-auto md:ml-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide items-center">
            {isSelectionMode ? (
                <>
                    <button
                        onClick={selectAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition-colors whitespace-nowrap"
                    >
                        {selectedIds.size === filteredCharacters.length ? <CheckSquare size={14} /> : <Square size={14} />}
                        <span>{selectedIds.size === filteredCharacters.length ? 'Bỏ chọn hết' : 'Chọn hết'}</span>
                    </button>
                    <button
                        onClick={handleBatchDelete}
                        disabled={selectedIds.size === 0}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                            selectedIds.size > 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                    >
                        <Trash2 size={14} />
                        <span>Xóa ({selectedIds.size})</span>
                    </button>
                    <button
                        onClick={() => {
                            setIsSelectionMode(false);
                            setSelectedIds(new Set());
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition-colors whitespace-nowrap"
                    >
                        <span>Hủy</span>
                    </button>
                </>
            ) : (
                <>
                    <button
                        onClick={() => setIsSelectionMode(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition-colors whitespace-nowrap"
                    >
                        <CheckSquare size={14} />
                        <span>Chọn nhiều</span>
                    </button>
                    <button
                        onClick={() => {
                        setEditingCharacter(null);
                        setShowCreator(true);
                        }}
                        className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-[11px] md:text-sm transition-colors text-gray-50 font-medium whitespace-nowrap shrink-0"
                    >
                        <Plus size={14} className="md:w-4 md:h-4" />
                        <span>Tạo mới</span>
                    </button>
                    <button
                        onClick={() => setShowOnlineImport(true)}
                        className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg text-[11px] md:text-sm transition-colors bg-gray-800 hover:bg-gray-700 whitespace-nowrap shrink-0`}
                    >
                        <LinkIcon size={14} className="md:w-4 md:h-4" />
                        <span>Online Import</span>
                    </button>
                    <button
                        onClick={handleImport}
                        className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-[11px] md:text-sm transition-colors whitespace-nowrap shrink-0"
                    >
                        <Upload size={14} className="md:w-4 md:h-4" />
                        <span>Import File</span>
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Search & Sort Bar */}
      <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-800 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm nhân vật..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 uppercase font-bold">Sắp xếp:</span>
            <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 outline-none focus:ring-1 focus:ring-purple-500"
            >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="name">Tên (A-Z)</option>
                <option value="updated">Cập nhật</option>
            </select>
        </div>
      </div>

      {showOnlineImport && (
        <CharacterOnlineImport 
          onClose={() => setShowOnlineImport(false)}
          onImport={handleCharacterLoaded}
        />
      )}

      {showCreator && (
        <CharacterCreator
          onClose={() => {
            setShowCreator(false);
            setEditingCharacter(null);
          }}
          onSave={handleSaveCharacter}
          initialCharacter={editingCharacter}
        />
      )}

      {/* Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {sortedCharacters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle size={48} className="mb-4 opacity-20" />
            <p>Chưa có nhân vật nào.</p>
            <div className="flex gap-4 mt-4">
                <button
                    onClick={() => {
                      setEditingCharacter(null);
                      setShowCreator(true);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-gray-50 text-sm font-medium transition-colors"
                >
                    Tạo mới
                </button>
                <button
                    onClick={() => setShowOnlineImport(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-gray-50 text-sm font-medium transition-colors"
                >
                    Online Import
                </button>
                <button
                    onClick={handleImport}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-50 text-sm font-medium transition-colors"
                >
                    Import File
                </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 pb-20">
            {sortedCharacters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onChat={onSelectCharacter}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClone={handleClone}
                onExport={handleExport}
                isSelected={selectedIds.has(char.id)}
                onToggleSelect={isSelectionMode ? () => toggleSelection(char.id) : undefined}
                isSelectionMode={isSelectionMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, character: null })}
        onConfirm={performDelete}
        title="Xóa nhân vật"
        message={`Bạn có chắc chắn muốn xóa nhân vật "${confirmDelete.character?.name}" không? Hành động này không thể hoàn tác.`}
      />

      <ConfirmModal 
        isOpen={confirmBatchDelete}
        onClose={() => setConfirmBatchDelete(false)}
        onConfirm={performBatchDelete}
        title="Xóa nhiều nhân vật"
        message={`Bạn có chắc chắn muốn xóa ${selectedIds.size} nhân vật đã chọn không? Hành động này không thể hoàn tác.`}
      />
    </div>
  );
};

