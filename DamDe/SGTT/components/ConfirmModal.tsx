
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-lg font-bold text-gray-50 flex items-center gap-2">
            <AlertTriangle size={20} className={variant === 'danger' ? 'text-red-500' : 'text-yellow-500'} />
            {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-50 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-300 leading-relaxed">{message}</p>
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-50 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-6 py-2 rounded-lg font-bold transition-all shadow-lg ${variantClasses[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
