import React, { useState } from 'react';
import { AlertCircle, Calendar, Check, X } from 'lucide-react';

export const EndDayConfirmDialog: React.FC<{
  hasPendingEvents: boolean;
  onConfirm: (customEventPrompt?: string) => void;
  onCancel: () => void;
}> = ({ hasPendingEvents, onConfirm, onCancel }) => {
  const [customPrompt, setCustomPrompt] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-slideUp" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {hasPendingEvents ? (
              <AlertCircle size={32} className="text-amber-500" />
            ) : (
              <Calendar size={32} className="text-primary-500" />
            )}
          </div>
          
          <h3 className="text-xl font-bold text-gray-100 mb-2">
            Kết thúc ngày
          </h3>
          
          {hasPendingEvents ? (
            <>
              <p className="text-gray-400 text-sm mb-6">
                Vẫn còn sự kiện đang chờ. Vui lòng hoàn thành trước khi kết thúc ngày.
              </p>
              <button 
                onClick={onCancel}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} /> Đóng
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-4">
                Bạn đã hoàn thành tất cả sự kiện. Bạn muốn kết thúc ngày hôm nay chứ?
              </p>
              
              <div className="text-left mb-6">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Nhập sự kiện ngày tiếp theo (Tùy chọn)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Để trống để AI tự quyết định..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-primary-500 focus:outline-none min-h-[80px]"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={onCancel}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <X size={18} /> Hủy
                </button>
                <button 
                  onClick={() => onConfirm(customPrompt)}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-900/20"
                >
                  <Check size={18} /> Xác nhận
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
