import React from 'react';
import { X } from 'lucide-react';
import { GameManager } from '../../../infra/gameManager';

interface GameDebugUIProps {
  gameManager: GameManager;
  onClose: () => void;
}

export const GameDebugUI: React.FC<GameDebugUIProps> = ({ gameManager, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 bg-gray-950 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom flex">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
        <h2 className="text-xl font-bold font-serif text-gray-50 flex items-center gap-2">
          Debug Console
        </h2>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-200 mb-2">GameBible (Continuity Core)</h3>
          <pre className="p-3 bg-gray-900 rounded border border-gray-800 text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(gameManager.gameBible, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-gray-200 mb-2">Latest Debug Logs</h3>
          <div className="space-y-4">
            {gameManager.debugLogs.length === 0 ? (
              <p className="text-gray-500 text-sm">No debug logs available.</p>
            ) : (
              [...gameManager.debugLogs].reverse().map((log: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-900 rounded border border-gray-800 text-xs">
                  <h4 className="font-bold text-blue-400 border-b border-gray-700 pb-1 mb-2">{log.time} - {log.action}</h4>
                  <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
