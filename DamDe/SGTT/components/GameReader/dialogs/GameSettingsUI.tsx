import React, { useState } from 'react';
import { X, Settings, History, MapPin, Edit3, Save, Calendar } from 'lucide-react';
import { GameManager } from '../../../infra/gameManager';

export const GameSettingsUI: React.FC<{ gameManager: GameManager; onClose: () => void }> = ({ gameManager, onClose }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'today' | 'config'>('history');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-950 shrink-0">
          <div className="flex items-center gap-3 text-primary-400">
            <Settings size={24} />
            <h3 className="text-xl font-bold text-gray-100 uppercase tracking-wider">Cài đặt Game</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-50 hover:bg-gray-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-950 shrink-0">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'history' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Lịch sử
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'today' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'config' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Cấu hình
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-900">
          {activeTab === 'history' && <HistoryPanel gameManager={gameManager} />}
          {activeTab === 'today' && <TodayPanel gameManager={gameManager} />}
          {activeTab === 'config' && <ConfigPanel gameManager={gameManager} />}
        </div>
      </div>
    </div>
  );
};

const HistoryPanel: React.FC<{ gameManager: GameManager }> = ({ gameManager }) => {
  const history = gameManager.historyEvents;

  return (
    <div className="space-y-4">
      {history.map((event, idx) => (
        <div key={idx} className="bg-gray-950 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
          <div className="flex justify-between items-start mb-2">
            <h5 className="font-bold text-gray-100">{event.name}</h5>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-gray-800 text-gray-400 rounded-md">
              {event.game_time || 'Chưa rõ'}
            </span>
          </div>
          <p className="text-sm text-gray-400">{event.description}</p>
        </div>
      ))}
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <History size={48} className="mb-4 opacity-20" />
          <p>Chưa có lịch sử sự kiện.</p>
        </div>
      )}
    </div>
  );
};

const TodayPanel: React.FC<{ gameManager: GameManager }> = ({ gameManager }) => {
  const events = gameManager.todayEvents;

  return (
    <div className="space-y-4">
      {events.map((event, idx) => (
        <div key={idx} className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <h5 className="font-bold text-gray-100 mb-1">{event.name}</h5>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <MapPin size={12} />
                <span>{event.scene_id}</span>
              </div>
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${
              event.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              event.status === 'playing' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' :
              'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              {event.status === 'completed' ? 'Hoàn thành' : event.status === 'playing' ? 'Đang chơi' : 'Chờ xử lý'}
            </span>
          </div>
          <p className="text-sm text-gray-400">{event.description}</p>
          
          {event.status === 'completed' && (
            <button 
              onClick={() => gameManager.reactivateEvent(event.id)}
              className="self-end px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Chơi lại
            </button>
          )}
        </div>
      ))}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <Calendar size={48} className="mb-4 opacity-20" />
          <p>Không có sự kiện nào hôm nay.</p>
        </div>
      )}
    </div>
  );
};

const ConfigPanel: React.FC<{ gameManager: GameManager }> = ({ gameManager }) => {
  return (
    <div className="space-y-6">
      <ConfigEditor gameManager={gameManager} title="Bối cảnh thế giới" configKey="world_background" />
      <ConfigEditor gameManager={gameManager} title="Định hướng cốt truyện" configKey="story_direction" />
    </div>
  );
};

const ConfigEditor: React.FC<{ gameManager: GameManager; title: string; configKey: string }> = ({ gameManager, title, configKey }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(gameManager.worldConfig[configKey] || '');

  const handleSave = async () => {
    await gameManager.updateWorldSetting(configKey, value);
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{title}</h4>
        {isEditing ? (
          <button onClick={handleSave} className="p-1.5 text-green-400 hover:bg-gray-800 rounded-full transition-colors">
            <Save size={16} />
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-400 hover:text-gray-50 hover:bg-gray-800 rounded-full transition-colors">
            <Edit3 size={16} />
          </button>
        )}
      </div>
      
      {isEditing ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      ) : (
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {value || <span className="text-gray-500 italic">Chưa có thông tin.</span>}
        </div>
      )}
    </div>
  );
};
