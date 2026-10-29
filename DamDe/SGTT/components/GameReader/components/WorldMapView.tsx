import React from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { GameManager } from '../../../infra/gameManager';

export const WorldMapView: React.FC<{ gameManager: GameManager; onSceneTap: (scene: any) => void }> = ({ gameManager, onSceneTap }) => {
  const scenes = gameManager.scenes || [];

  return (
    <div className="h-full w-full bg-gray-950 relative overflow-hidden flex flex-col">
      {/* Background Map Placeholder */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, #3a1510 0%, transparent 60%)',
        filter: 'blur(60px)'
      }}></div>
      
      <div className="relative z-10 w-full flex-1 overflow-y-auto p-6">
        <h2 className="text-2xl font-serif italic text-gray-400 mb-8 tracking-wider uppercase">Bản đồ thế giới</h2>
        
        {scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-900/50 rounded-2xl border border-gray-800 p-8 text-center space-y-4">
            <MapPin size={48} className="opacity-20" />
            <p className="text-xl font-bold">Chưa có địa điểm nào được khám phá.</p>
            <p className="text-sm opacity-60">Thế giới đang được kiến tạo...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene, index) => {
              const events = gameManager.getEventsForScene(scene) || [];
              const hasEvents = events.length > 0;
              
              return (
                <button
                  key={scene.id || index}
                  onClick={() => onSceneTap(scene)}
                  className={`relative overflow-hidden group text-left transition-all duration-300 ${
                    hasEvents 
                      ? 'bg-gray-900 border border-primary-500/50 shadow-[0_0_15px_rgba(242,125,38,0.15)] hover:shadow-[0_0_25px_rgba(242,125,38,0.3)]' 
                      : 'bg-gray-900/50 border border-gray-800 hover:bg-gray-800'
                  } rounded-2xl p-6`}
                >
                  {/* Scene Image Placeholder */}
                  {scene.imagePath && (
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                      <img src={scene.imagePath} alt={scene.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={20} className={hasEvents ? 'text-primary-500' : 'text-gray-500'} />
                        <h3 className="text-lg font-bold text-gray-100">{scene.name || 'Khu vực bí ẩn'}</h3>
                      </div>
                      {hasEvents && (
                        <span className="flex items-center justify-center w-6 h-6 bg-primary-600 rounded-full text-xs font-bold text-gray-50 shadow-lg shadow-primary-900/50 animate-pulse">
                          {events.length}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">
                      {scene.description || 'Không có mô tả.'}
                    </p>
                    
                    {hasEvents && (
                      <div className="flex items-center gap-2 text-xs font-medium text-primary-400 mt-auto bg-primary-900/30 w-fit px-3 py-1.5 rounded-lg border border-primary-800/50">
                        <AlertCircle size={14} />
                        <span>Có sự kiện đang chờ</span>
                      </div>
                    )}
                    {!hasEvents && (
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Khu vực an toàn (Bấm để xem)</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
