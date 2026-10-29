import React, { useEffect, useState } from 'react';
import { BookOpen, PenTool, Settings, Sun, Moon, Sparkles } from 'lucide-react';

interface GlobalNavProps {
    currentView: 'library' | 'create' | 'settings';
    onNavigate: (view: 'library' | 'create' | 'settings') => void;
}

export const GlobalNav: React.FC<GlobalNavProps> = ({ currentView, onNavigate }) => {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        setIsDark(isDarkMode);
    }, []);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    const navItems = [
        { id: 'library' as const, label: 'Tủ Truyện', icon: BookOpen },
        { id: 'create' as const, label: 'Sáng Tác', icon: Sparkles },
        { id: 'settings' as const, label: 'Cài Đặt AI', icon: Settings },
    ];

    return (
        <>
            {/* Desktop Sidebar (Narrow, Elegant) */}
            <div className="hidden md:flex flex-col w-20 bg-gray-900 border-r border-gray-800 h-full shrink-0 items-center py-6 justify-between select-none">
                <div className="flex flex-col items-center w-full">
                    {/* App Logo */}
                    <div 
                        onClick={() => onNavigate('library')}
                        className="w-11 h-11 bg-gradient-to-br from-pink-600 via-rose-600 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-900/30 mb-8 cursor-pointer hover:scale-105 transition-transform"
                        title="Dâm Tu Thần Bút - AI Sáng Tạo Tiểu Thuyết"
                    >
                        <PenTool className="text-white w-5 h-5" />
                    </div>

                    {/* Nav Items */}
                    <nav className="w-full px-2 space-y-3 flex flex-col items-center">
                        {navItems.map(item => {
                            const Icon = item.icon;
                            const isActive = currentView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    className={`w-full flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${
                                        isActive 
                                            ? 'bg-pink-600/15 text-pink-400 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)] font-semibold' 
                                            : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                                    }`}
                                    title={item.label}
                                >
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-[10px] tracking-tight">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Theme Toggle Button */}
                <div className="px-2 w-full pt-4 border-t border-gray-800">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                        title={isDark ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
                    >
                        {isDark ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
                        <span className="text-[9px]">Giao diện</span>
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 z-50 pb-safe">
                <nav className="flex justify-around items-center p-2">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
                                    isActive 
                                        ? 'text-pink-400 font-bold bg-pink-500/10' 
                                        : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px]">{item.label}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={toggleTheme}
                        className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all text-gray-400 hover:text-gray-200"
                    >
                        {isDark ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
                        <span className="text-[10px]">Chế độ</span>
                    </button>
                </nav>
            </div>
        </>
    );
};
