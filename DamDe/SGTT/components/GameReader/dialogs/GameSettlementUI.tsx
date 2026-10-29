import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, X, Loader2, Calendar, ArrowRight } from 'lucide-react';
import { GameManager } from '../../../infra/gameManager';
import { gameSettlementService } from '../../../infra/gameSettlementService';

export const GameSettlementUI: React.FC<{ gameManager: GameManager; isNextWeek: boolean; customEventPrompt?: string; onClose: () => void }> = ({ gameManager, isNextWeek, customEventPrompt, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [settlementData, setSettlementData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{step: number, total: number, message: string, isStepDone: boolean} | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const runSettlement = async () => {
      try {
        const data = await gameSettlementService.processSettlement(
          gameManager, 
          isNextWeek, 
          customEventPrompt,
          (step, total, message, isStepDone) => {
             setLoadingProgress({ step, total, message, isStepDone: isStepDone ?? false });
          }
        );
        setSettlementData(data);
        await gameManager.applySettlementResult(data, isNextWeek);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tổng kết');
      } finally {
        setIsLoading(false);
      }
    };

    runSettlement();
  }, [gameManager, isNextWeek]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn" onClick={!isLoading ? onClose : undefined}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-950 shrink-0">
          <div className="flex items-center gap-3 text-primary-400">
            <Calendar size={24} />
            <h3 className="text-xl font-bold text-gray-100 uppercase tracking-wider">
              {isNextWeek ? 'Tổng kết Tuần' : 'Tổng kết Ngày'}
            </h3>
          </div>
          {!isLoading && (
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-50 hover:bg-gray-800 rounded-full transition-colors">
              <X size={24} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-900">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              
              <div className="w-full space-y-3">
                {[
                  { step: 1, label: 'Lưu trữ & Sắp xếp sự kiện' },
                  { step: 2, label: 'Cập nhật ký ức nhân vật' },
                  { step: 3, label: 'Đồng bộ thế giới' },
                  { step: 4, label: 'Kiến tạo sự kiện ngày mới' },
                  { step: 5, label: 'Đồng bộ GameBible' }
                ].map((item) => {
                  const isActive = loadingProgress?.step === item.step;
                  const isPassed = loadingProgress && (loadingProgress.step > item.step || (loadingProgress.step === item.step && loadingProgress.isStepDone));
                  
                  return (
                    <div key={item.step} className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${isActive ? 'bg-primary-900/20 border-primary-800' : isPassed ? 'bg-green-900/10 border-green-900/50' : 'bg-gray-950 border-gray-800'}`}>
                      <div className="shrink-0 mt-0.5">
                        {isPassed ? (
                          <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                            <CheckCircle size={14} />
                          </div>
                        ) : isActive ? (
                          <div className="w-6 h-6 flex items-center justify-center text-primary-500">
                            <Loader2 className="animate-spin" size={20} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
                            {item.step}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-sm ${isPassed ? 'text-green-400' : isActive ? 'text-primary-400' : 'text-gray-500'}`}>
                          {item.label}
                        </h3>
                        {isActive && loadingProgress.message && (
                          <p className="text-xs text-gray-400 mt-1 animate-pulse">
                            {loadingProgress.message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-red-400">
              <X size={48} />
              <p className="font-medium">{error}</p>
            </div>
          ) : (
            <div className="space-y-8 animate-slideUp">
              
              {/* Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Tóm tắt
                </h4>
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-300 text-sm leading-relaxed">
                  {settlementData.summary}
                </div>
              </div>

              {/* New Events */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <ArrowRight size={16} className="text-primary-500" /> Sự kiện mới
                </h4>
                <div className="space-y-3">
                  {settlementData.newEvents.map((event: any, idx: number) => (
                    <div key={idx} className="bg-gray-950 border border-gray-800 rounded-xl p-4 hover:border-primary-500/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-gray-100">{event.name}</h5>
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-gray-800 text-gray-400 rounded-md">
                          {event.scene_id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{event.description}</p>
                    </div>
                  ))}
                  {settlementData.newEvents.length === 0 && (
                    <p className="text-sm text-gray-500 italic">Không có sự kiện mới nào được tạo ra.</p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && (
          <div className="p-4 border-t border-gray-800 bg-gray-950 shrink-0">
            <button 
              onClick={onClose}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-gray-50 rounded-xl font-bold uppercase tracking-wider transition-colors shadow-lg shadow-primary-900/20"
            >
              Tiếp tục hành trình
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
