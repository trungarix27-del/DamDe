import React, { useState } from 'react';
import { SachHiepSidebar } from './SachHiepSidebar';
import { SachHiepEditor } from './SachHiepEditor';
import { SachHiepSettingsModal } from './SachHiepSettingsModal';
import { Menu } from 'lucide-react';

export const SachHiepWorkspace: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSachHiepSidebarOpen, setIsSachHiepSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-950 text-slate-200 selection:bg-pink-500/30 selection:text-gray-50">
            {/* Mobile Overlay Backdrop */}
            {isSachHiepSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity animate-fadeIn"
                    onClick={() => setIsSachHiepSidebarOpen(false)}
                />
            )}

            <SachHiepSidebar 
                onOpenSettings={() => setIsSettingsOpen(true)} 
                isOpen={isSachHiepSidebarOpen}
                onClose={() => setIsSachHiepSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col relative z-0 w-full overflow-hidden">
                {/* Mobile Top Controls (Menu Hamburger) */}
                <div className="md:hidden fixed top-4 left-4 z-30 flex items-center gap-2">
                    <button 
                        onClick={() => setIsSachHiepSidebarOpen(true)}
                        className="px-3 py-2 bg-gray-900/80 backdrop-blur-md border border-gray-700/80 rounded-xl text-gray-300 hover:text-white hover:border-pink-500 transition-all shadow-xl text-xs font-bold flex items-center gap-1.5"
                    >
                        <Menu size={16} />
                        <span>Mục lục</span>
                    </button>
                </div>

                {/* Editor Content Area (contains the sole toolbar with Chỉ đạo AI, Viết tiếp, 69+, Sửa thủ công) */}
                <SachHiepEditor />
            </main>

            <SachHiepSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};
