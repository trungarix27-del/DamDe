import React, { useState } from 'react';
import { X, User, Shield, Zap, Heart, Edit3, Save } from 'lucide-react';
import { GameManager } from '../../../infra/gameManager';

export const PlayerProfileSheet: React.FC<{ gameManager: GameManager; onClose: () => void }> = ({ gameManager, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [playerData, setPlayerData] = useState(gameManager.player);

  const handleSave = async () => {
    await gameManager.updatePlayerProfile(playerData);
    setIsEditing(false);
  };

  const updateField = (field: string, value: any) => {
    setPlayerData({ ...playerData, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-950 shrink-0">
          <div className="flex items-center gap-2 text-primary-400">
            <User size={20} />
            <h3 className="text-lg font-bold text-gray-100 uppercase tracking-wider">Hồ sơ người chơi</h3>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button onClick={handleSave} className="p-2 text-green-400 hover:bg-gray-800 rounded-full transition-colors">
                <Save size={20} />
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-gray-50 hover:bg-gray-800 rounded-full transition-colors">
                <Edit3 size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-50 hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tên nhân vật</label>
              {isEditing ? (
                <input
                  type="text"
                  value={playerData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              ) : (
                <div className="text-xl font-bold text-gray-50">{playerData.name || 'Người chơi vô danh'}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Thân phận / Vai trò / Trạng thái</label>
              {isEditing ? (
                <input
                  type="text"
                  value={playerData.identity || playerData.role || playerData.status || ''}
                  onChange={(e) => updateField('identity', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              ) : (
                <div className="text-sm text-gray-300">{playerData.identity || playerData.role || playerData.status || 'Chưa xác định'}</div>
              )}
            </div>
            
            {/* Added Appearance since it's in the payload */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Ngoại hình</label>
              {isEditing ? (
                <input
                  type="text"
                  value={playerData.appearance || ''}
                  onChange={(e) => updateField('appearance', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              ) : (
                <div className="text-sm text-gray-400">{playerData.appearance || 'Chưa xác định'}</div>
              )}
            </div>
          </div>

          {/* Stats / Attributes */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-400 border-b border-gray-800 pb-2 flex items-center gap-2">
              <Shield size={16} /> Thuộc tính
            </h4>
            
            {isEditing ? (
              <textarea
                value={typeof playerData.attributes === 'string' ? playerData.attributes : JSON.stringify(playerData.attributes || {}, null, 2)}
                onChange={(e) => updateField('attributes', e.target.value)}
                rows={4}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none font-mono"
                placeholder='Ví dụ: {"Sức mạnh": 10, "Nhanh nhẹn": 15}'
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(playerData.attributes || {}).map(([key, value]) => (
                  <div key={key} className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400">{key}</span>
                    <span className="text-sm font-bold text-primary-400">{String(value)}</span>
                  </div>
                ))}
                {(!playerData.attributes || Object.keys(playerData.attributes).length === 0) && (
                  <div className="col-span-2 text-sm text-gray-500 italic">Chưa có thuộc tính nào được định nghĩa.</div>
                )}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-400 border-b border-gray-800 pb-2 flex items-center gap-2">
              <Zap size={16} /> Kỹ năng & Năng lực
            </h4>
            
            {isEditing ? (
              <textarea
                value={Array.isArray(playerData.skills) ? playerData.skills.join('\n') : playerData.skills || ''}
                onChange={(e) => updateField('skills', e.target.value.split('\n'))}
                rows={4}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none"
                placeholder="Mỗi kỹ năng trên một dòng..."
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(playerData.skills) ? playerData.skills : []).map((skill: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs font-medium text-gray-300">
                    {skill}
                  </span>
                ))}
                {(!playerData.skills || playerData.skills.length === 0) && (
                  <div className="text-sm text-gray-500 italic">Chưa học kỹ năng nào.</div>
                )}
              </div>
            )}
          </div>

          {/* Inventory */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-400 border-b border-gray-800 pb-2 flex items-center gap-2">
              <Heart size={16} /> Hành trang & Trang bị
            </h4>
            
            {isEditing ? (
              <textarea
                value={
                   Array.isArray(playerData.inventory) 
                     ? playerData.inventory.join('\n') 
                     : [playerData.backpack, playerData.equipment].filter(Boolean).join('\n') || playerData.inventory || ''
                }
                onChange={(e) => updateField('inventory', e.target.value.split('\n'))}
                rows={4}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none"
                placeholder="Mỗi vật phẩm trên một dòng..."
              />
            ) : (
              <ul className="space-y-2">
                {Array.isArray(playerData.inventory) && playerData.inventory.length > 0 ? (
                  playerData.inventory.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-300 before:content-['•'] before:text-primary-500">
                      {item}
                    </li>
                  ))
                ) : (playerData.backpack || playerData.equipment || playerData.inventory) ? (
                  [playerData.backpack, playerData.equipment, typeof playerData.inventory === 'string' ? playerData.inventory : null]
                    .filter(Boolean)
                    .map((item: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-300 before:content-['•'] before:text-primary-500">
                        {item}
                      </li>
                    ))
                ) : (
                  <div className="text-sm text-gray-500 italic">Hành trang trống rỗng.</div>
                )}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
