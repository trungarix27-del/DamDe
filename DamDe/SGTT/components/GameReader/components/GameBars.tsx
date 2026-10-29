import React from 'react';
import { ChevronLeft, Settings, User, Users, Calendar, Clock, Bug } from 'lucide-react';
import { GameManager } from '../../../infra/gameManager';

export const GameTopBar: React.FC<{ gameManager: GameManager; onBackTap: () => void; onSettingsTap: () => void; onDebugTap?: () => void }> = ({ gameManager, onBackTap, onSettingsTap, onDebugTap }) => {
  const week = gameManager.currentWeek;
  const dayOfWeek = gameManager.currentDayOfWeek;
  const eventStats = gameManager.getEventStats();

  return (
    <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onBackTap} className="p-2 -ml-2 rounded-full hover:bg-gray-800 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-200">Tuần {week} Ngày {dayOfWeek}</span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={12} /> Còn {eventStats.total} sự kiện
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onDebugTap && (
          <button onClick={onDebugTap} className="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400" title="Debug Console">
            <Bug size={20} />
          </button>
        )}
        <button onClick={onSettingsTap} className="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400" title="Settings">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};

export const GameBottomBar: React.FC<{ gameManager: GameManager; onPlayerTap: () => void; onCharactersTap: () => void; onSettlementTap: () => void }> = ({ gameManager, onPlayerTap, onCharactersTap, onSettlementTap }) => {
  const aiCount = gameManager.aiCharacters.length;

  return (
    <div className="flex items-center justify-around p-3 bg-gray-900 border-t border-gray-800 shrink-0 pb-safe">
      <button onClick={onPlayerTap} className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-gray-50 transition-colors">
        <User size={24} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Hồ sơ</span>
      </button>
      
      <button onClick={onSettlementTap} className="flex items-center justify-center w-14 h-14 bg-primary-600 hover:bg-primary-500 rounded-full shadow-lg shadow-primary-900/20 text-gray-50 transition-transform active:scale-95 -mt-6 border-4 border-gray-950">
        <Calendar size={24} />
      </button>

      <button onClick={onCharactersTap} className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-gray-50 transition-colors relative">
        <Users size={24} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Nhân vật</span>
        {aiCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-gray-50 font-bold border-2 border-gray-900">
            {aiCount}
          </span>
        )}
      </button>
    </div>
  );
};
