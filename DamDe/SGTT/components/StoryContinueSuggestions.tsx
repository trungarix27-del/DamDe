
import React, { useState } from 'react';
import { StoryContinuePlan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, User, Heart, Skull, Zap } from 'lucide-react';

interface StoryContinueSuggestionsProps {
    plan: StoryContinuePlan | null;
    onSelect: (text: string) => void;
    isGenerating: boolean;
}

export const StoryContinueSuggestions: React.FC<StoryContinueSuggestionsProps> = ({ plan, onSelect, isGenerating }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!plan || isGenerating) return null;

    const options = [
        { 
            key: 'LoveOrGoodRoute', 
            name: 'Tiểu Vũ Tỷ Tỷ', 
            icon: <Heart className="w-3 h-3 mr-1" />,
            color: 'text-pink-400 border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/20', 
            route: plan.LoveOrGoodRoute 
        },
        { 
            key: 'NtrOrBadRoute', 
            name: 'Hắc Bì Đấu La', 
            icon: <Skull className="w-3 h-3 mr-1" />,
            color: 'text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/20', 
            route: plan.NtrOrBadRoute 
        },
        { 
            key: 'SupriseOrNeutralRoute', 
            name: 'Đường Tam', 
            icon: <Zap className="w-3 h-3 mr-1" />,
            color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/20', 
            route: plan.SupriseOrNeutralRoute 
        },
    ];

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-col gap-1 mb-1.5"
            >
                <div 
                    className="flex items-center justify-between px-1 cursor-pointer hover:bg-white/5 rounded py-0.5 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                        <User className="w-2.5 h-2.5 mr-1" />
                        Đề xuất hướng đi
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-gray-500" />
                    ) : (
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                    )}
                </div>
                
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex gap-1.5 pb-1 overflow-x-auto custom-scrollbar snap-x">
                                {options.map((opt) => (
                                    <div 
                                        key={opt.key} 
                                        onClick={() => onSelect(opt.route?.ContinuePlan || '')}
                                        className={`flex flex-col p-1.5 rounded border ${opt.color} transition-all min-w-[110px] max-w-[140px] flex-1 snap-start cursor-pointer hover:brightness-110`}
                                    >
                                        <div className="flex items-center mb-0.5 border-b border-current pb-0.5 opacity-80">
                                            {React.cloneElement(opt.icon, { className: "w-2 h-2 mr-1" })}
                                            <span className="text-[8px] font-bold uppercase tracking-wider truncate">{opt.name}</span>
                                        </div>
                                        <p className="text-[9px] leading-tight opacity-90 line-clamp-2" title={opt.route?.ContinuePlan}>{opt.route?.ContinuePlan}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
};
