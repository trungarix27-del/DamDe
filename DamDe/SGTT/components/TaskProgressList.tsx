import React from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2, Sparkles } from 'lucide-react';

export const TaskProgressList: React.FC = () => {
    // Mock data for now, as there is no global task manager state yet
    const tasks = [
        { id: 1, title: 'Tinh linh bí mật hoa viên', type: 'Sinh hình ảnh', status: 'completed', time: '2026-02-19 17:11:10' },
        { id: 2, title: 'Chương 1: Khởi đầu', type: 'Sinh văn bản', status: 'in_progress', time: 'Đang xử lý...' },
        { id: 3, title: 'Cập nhật logic Game: Màn 2', type: 'Sinh logic', status: 'completed', time: '2026-02-18 10:00:00' },
        { id: 4, title: 'Tạo giọng nói TTS nhân vật', type: 'Sinh giọng nói', status: 'failed', time: '2026-02-17 15:30:00' },
    ];

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'completed': 
                return (
                    <div className="flex items-center gap-1.5 bg-[#4caf50] text-white px-3 py-1 rounded-md text-xs font-medium">
                        <CheckCircle2 size={14} />
                        Đã hoàn thành
                    </div>
                );
            case 'in_progress': 
                return (
                    <div className="flex items-center gap-1.5 bg-[#ff9800] text-white px-3 py-1 rounded-md text-xs font-medium">
                        <Clock size={14} className="animate-spin-slow" />
                        Đang xử lý
                    </div>
                );
            case 'failed': 
                return (
                    <div className="flex items-center gap-1.5 bg-[#f44336] text-white px-3 py-1 rounded-md text-xs font-medium">
                        <AlertCircle size={14} />
                        Thất bại
                    </div>
                );
            default: 
                return (
                    <div className="flex items-center gap-1.5 bg-gray-500 text-white px-3 py-1 rounded-md text-xs font-medium">
                        <Circle size={14} />
                        Chờ xử lý
                    </div>
                );
        }
    };

    return (
        <div className="min-h-full bg-gray-950 text-gray-50 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
                <h1 className="text-2xl font-medium text-gray-200">Quản lý tác vụ</h1>
                <button className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-8 max-w-6xl mx-auto space-y-4">
                {tasks.map(task => (
                    <div key={task.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col relative group">
                        <h3 className="text-lg font-bold text-gray-200 mb-2">{task.title}</h3>
                        
                        <div className="flex items-center gap-2 text-gray-400 mb-4">
                            <Sparkles size={16} />
                            <span className="text-sm font-medium">{task.type}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            {getStatusDisplay(task.status)}
                            <span className="text-xs text-gray-400">Cập nhật: {task.time}</span>
                        </div>

                        {/* Delete Button */}
                        <button className="absolute bottom-5 right-5 flex items-center gap-1.5 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                            <Trash2 size={16} />
                            Xóa
                        </button>
                    </div>
                ))}

                {tasks.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        Không có tác vụ nào gần đây.
                    </div>
                )}
            </div>
        </div>
    );
};
