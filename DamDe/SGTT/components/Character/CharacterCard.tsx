
import React from 'react';
import { MessageSquare, Edit, Trash2, User, Copy, Download, CheckCircle2, Circle } from 'lucide-react';
import { Character } from './types';

interface CharacterCardProps {
  character: Character;
  onChat: (character: Character) => void;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
  onClone: (character: Character) => void;
  onExport: (character: Character) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  isSelectionMode?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onChat,
  onEdit,
  onDelete,
  onClone,
  onExport,
  isSelected = false,
  onToggleSelect,
  isSelectionMode = false,
}) => {
  return (
    <div 
        onClick={onToggleSelect}
        className={`bg-gray-800/50 border rounded-xl overflow-hidden transition-all group relative flex flex-col h-full shadow-lg hover:shadow-purple-500/10 ${
            isSelected ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-gray-700/50 hover:border-purple-500/50'
        } ${isSelectionMode ? 'cursor-pointer' : ''}`}
    >
      {/* Selection Indicator */}
      {isSelectionMode && (
          <div className="absolute top-2 left-2 z-20">
              {isSelected ? (
                  <CheckCircle2 className="text-purple-500 fill-gray-900" size={24} />
              ) : (
                  <Circle className="text-gray-400 fill-gray-900/50" size={24} />
              )}
          </div>
      )}

      {/* Image Area */}
      <div className="aspect-[3/4] relative overflow-hidden bg-gray-900">
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* Fallback Icon (shown if no avatar or error) */}
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-600 ${character.avatarUrl ? 'hidden' : ''}`}>
          <User size={64} />
        </div>

        {/* Overlay Actions */}
        {!isSelectionMode && (
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm p-2">
            <button
                onClick={(e) => {
                e.stopPropagation();
                onChat(character);
                }}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-gray-50 rounded-lg transition-all flex items-center justify-center gap-2 font-bold text-sm shadow-lg"
            >
                <MessageSquare size={16} />
                <span>Trò chuyện</span>
            </button>
            
            <div className="grid grid-cols-2 gap-2 w-full">
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    onEdit(character);
                    }}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-50 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs"
                    title="Chỉnh sửa"
                >
                    <Edit size={14} />
                    <span>Sửa</span>
                </button>
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    onClone(character);
                    }}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-50 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs"
                    title="Nhân bản"
                >
                    <Copy size={14} />
                    <span>Chép</span>
                </button>
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    onExport(character);
                    }}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-50 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs"
                    title="Xuất JSON"
                >
                    <Download size={14} />
                    <span>Xuất</span>
                </button>
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    onDelete(character);
                    }}
                    className="p-2 bg-red-900/80 hover:bg-red-700 text-gray-50 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs"
                    title="Xóa"
                >
                    <Trash2 size={14} />
                    <span>Xóa</span>
                </button>
            </div>
            </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-3 md:p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-50 text-sm md:text-lg truncate mb-1" title={character.name}>
          {character.name}
        </h3>
        <p className="text-[10px] md:text-xs text-gray-400 line-clamp-2 md:line-clamp-3 mb-3 flex-1">
          {character.description || character.creatorNotes || 'Không có mô tả.'}
        </p>
        
        <div className="flex items-center justify-between text-[8px] md:text-[10px] text-gray-500 mt-auto pt-2 border-t border-gray-700/50">
           <span className="truncate">{character.worldInfo?.length ? `${character.worldInfo.length} WI` : 'No WI'}</span>
           <span className="shrink-0 ml-1">{new Date(character.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
