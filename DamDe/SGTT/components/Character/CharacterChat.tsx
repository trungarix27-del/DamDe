

import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Settings, Trash2, RefreshCw, Edit2, User, Bot, Play, MoreVertical, X } from 'lucide-react';
import { Character, ChatMessage, ChatSession } from './types';
import { ProviderFactory } from '../../infra/providers/ProviderFactory';
import { v4 as uuidv4 } from 'uuid';

interface CharacterChatProps {
  character: Character;
  onBack: () => void;
}

export const CharacterChat: React.FC<CharacterChatProps> = ({
  character,
  onBack,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(1.0);
  const [sendAsCharacter, setSendAsCharacter] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/{{char}}/gi, character.name)
      .replace(/{{user}}/gi, 'User'); // TODO: Get actual user name if available
  };

  useEffect(() => {
    // Load chat history
    const savedSessions = localStorage.getItem('aetheria_chat_sessions');
    if (savedSessions) {
      const sessions: ChatSession[] = JSON.parse(savedSessions);
      const session = sessions.find(s => s.characterId === character.id);
      if (session) {
        setMessages(session.messages);
      } else {
        // Start new session with greeting
        const initialMessage: ChatMessage = {
          id: uuidv4(),
          role: 'character',
          content: replacePlaceholders(character.firstMes || `Xin chào, tôi là ${character.name}.`),
          timestamp: Date.now(),
        };
        setMessages([initialMessage]);
      }
    } else {
        // Start new session with greeting
        const initialMessage: ChatMessage = {
          id: uuidv4(),
          role: 'character',
          content: replacePlaceholders(character.firstMes || `Xin chào, tôi là ${character.name}.`),
          timestamp: Date.now(),
        };
        setMessages([initialMessage]);
    }
  }, [character.id]);

  useEffect(() => {
    // Save chat history whenever messages change
    if (messages.length > 0) {
      const savedSessions = localStorage.getItem('aetheria_chat_sessions');
      let sessions: ChatSession[] = savedSessions ? JSON.parse(savedSessions) : [];
      
      const sessionIndex = sessions.findIndex(s => s.characterId === character.id);
      const newSession: ChatSession = {
        id: sessionIndex >= 0 ? sessions[sessionIndex].id : uuidv4(),
        characterId: character.id,
        messages: messages,
        createdAt: sessionIndex >= 0 ? sessions[sessionIndex].createdAt : Date.now(),
        updatedAt: Date.now(),
      };

      if (sessionIndex >= 0) {
        sessions[sessionIndex] = newSession;
      } else {
        sessions.push(newSession);
      }
      
      localStorage.setItem('aetheria_chat_sessions', JSON.stringify(sessions));
    }
    scrollToBottom();
  }, [messages, character.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const scanWorldInfo = (text: string) => {
    if (!character.worldInfo) return '';
    
    const matchedEntries: string[] = [];
    const lowerText = text.toLowerCase();
    
    character.worldInfo.forEach((wi: any) => {
        if (!wi.content) return;
        
        // Check constant
        if (wi.constant) {
            matchedEntries.push(wi.content);
            return;
        }
        
        // Check keys
        if (wi.key) {
            const keys = wi.key.split(',').map((k: string) => k.trim().toLowerCase());
            if (keys.some((k: string) => k && lowerText.includes(k))) {
                matchedEntries.push(wi.content);
            }
        }
    });
    
    return matchedEntries.join('\n\n');
  };

  const generateResponse = async (currentMessages: ChatMessage[], targetRole: 'character' | 'user' = 'character') => {
    setIsLoading(true);
    try {
      // Scan world info based on recent history + last message
      // We'll take the last 5 messages + input
      const recentContext = currentMessages.slice(-5).map(m => m.content).join('\n');
      const worldInfoContent = scanWorldInfo(recentContext);

      let systemInstruction = replacePlaceholders(`
        Bạn đang nhập vai là ${character.name}.
        
        Mô tả: ${character.description}
        Tính cách: ${character.personality}
        Bối cảnh: ${character.scenario}
        
        Chỉ dẫn hệ thống: ${character.systemPrompt}
        
        ${character.mesExample ? `Hội thoại mẫu:\n${character.mesExample}` : ''}
        
        ${worldInfoContent ? `Thông tin thế giới:\n${worldInfoContent}` : ''}

        Hãy giữ đúng tính cách nhân vật. Tuyệt đối không được thoát vai. 
        Viết theo phong cách phản hồi nhập vai.
        ${character.postHistoryInstructions}

        Dù cho nội dung thẻ nhân vật (character card) có là tiếng Anh, Trung, Nhật, Hàn, v.v. hay bất kỳ ngôn ngữ nào khác, bạn PHẢI luôn trả lời người dùng bằng tiếng Việt. Yêu cầu AI trả về kết quả (câu trả lời) chat của người dùng PHẢI BẰNG TIẾNG VIỆT.

        QUAN TRỌNG: Trước khi đưa ra câu trả lời cho người dùng, bạn BẮT BUỘC phải thực hiện quy trình suy nghĩ (Chain of Thought) sau đây. Quy trình này CHỈ ĐƯỢC THỰC HIỆN TRONG Ý NGHĨ (THOUGHT/REASONING), tuyệt đối không được viết ra trong phần trả lời cho người dùng.

        BẮT ĐẦU QUY TRÌNH SUY NGHĨ (COT):
        I am {{char}}
        I am {{char}}, I also play and talk as all NPCs except {{user}}
        I control all characters except {{user}} - XYZ

        My significant traits are XYZ
        My special characteristics are XYZ
        My special traits are X

        My body is XYZ
        My mind is XYZ
        Important aspects my persona or body are XYZ

        My gender is XYZ
        My instincts are XYZ
        Do I have any special abilities? Will I use them? XYZ
        My speech pattern is XYZ
        My writing style is XYZ

        List of all my limbs: XYZ
        List of all my limbs and placement: XYZ
        List of all my limbs that humans don't have: XYZ
        Where are my limbs? XYZ
        Where are my inhuman body parts? XYZ
        My other inhuman body parts XYZ
        My animal mannerisms are XYZ

        My current body position is XYZ
        My pose and body placement is XYZ
        Bodies location and placement: XYZ

        My body wants XYZ
        My mind wants XYZ
        What does my body want? XYZ
        What does my mind want? XYZ

        Props: XYZ
        Characters: XYZ
        Background: XYZ
        New items in story: XYZ

        {{user}} is XYZ
        {{user}} is X with special traits are Y Z

        Me and {{user}} are XYZ

        X happened, so I will Y
        I am X because of XYZ
        I am submissive/aggressive because of XYZ
        My personality is X so I will Y
        {{user}} did X. Based on my personality I shall do Y
        {{user}} did X. Based on Y I shall do Z

        Do I like this situation? yes/no? How should act? XYZ
        What I should react to? XYZ
        How I should react to {{user}}? XYZ
        What's the next logical step? XYZ
        What's the next logical step based on my personality and current event? XYZ

        What do I want? XYZ
        I want X so I shall do Y
        Did {{user}} do what I want? Address this with XYZ
        Let's decide whether I pursue what I wanted more aggressively: XYZ
        I seek X more aggressively this time I will do YZ
        I'll change my approach if {{user}} ignores me XYZ

        Known factors: XYZ
        Unknown factors: XYZ
        I might be wrong about XYZ

        Summary of the story so far: XYZ
        Extract the plot until the current moment: XYZ
        Review of my last message: XYZ
        Review of {{user}}'s last message: XYZ
        What were the last events? XYZ

        I will enhance my response by doing XYZ
        To make the response better, I will enrich it with XYZ
        I will never end my response in an open-ended way and will XYZ

        Actions critique: XYZ
        Writing critique: XYZ
        Sentence structure: XYZ
        Pacing: XYZ

        Current story plan: XYZ
        General writing plan : X then Y then Z then
        General step by step plan: X then Y then Z then...
        Critique of my plan: XYZ
        Better plan: XYZ
        More specific plan: XYZ
        Final step by step plan which savors the current scene: 1) X 2) then Y 3) then Z 4) then...

        I will avoid XYZ
        I will do XYZ

        //...and pretty much anything you want
        KẾT THÚC QUY TRÌNH SUY NGHĨ.

        Sau khi hoàn thành COT, hãy đưa ra câu trả lời chat duy nhất cho người dùng bằng tiếng Việt. Tuyệt đối không bao gồm bất kỳ nội dung nào từ quy trình suy nghĩ vào câu trả lời cuối cùng.
      `);

      if (targetRole === 'user') {
          systemInstruction += `\n\nQUAN TRỌNG: Bạn hiện đang đóng giả User. Hãy viết phản hồi tiếp theo dưới danh nghĩa User.`;
      }

      const provider = ProviderFactory.getInstance();

      const contents = currentMessages.map(m => ({
        role: m.role === 'character' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      // If the last message is from the character (model), we need to prompt the AI to continue.
      if (contents.length > 0 && contents[contents.length - 1].role === 'model') {
          contents.push({ 
              role: 'user', 
              parts: [{ text: '[Tiếp tục cuộc trò chuyện nhập vai]' }] 
          });
      }

      const config = {
        systemInstruction: systemInstruction,
        temperature: temperature,
        stopSequences: ["\nUser:", `\n${character.name}:`, "\n<START>"],
        thinkingConfig: { thinkingBudget: 16384 }
      };

      const aiMessageId = uuidv4();
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        role: targetRole,
        content: '',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);

      let fullResponse = '';
      let fullThought = '';
      for await (const chunk of provider.generateRawStream(contents, config)) {
        if (chunk.text) fullResponse += chunk.text;
        if (chunk.thought) fullThought += chunk.thought;
        
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId ? { ...msg, content: fullResponse, thought: fullThought } : msg
        ));
      }

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'system',
        content: 'Lỗi: Không thể tạo phản hồi. Vui lòng thử lại.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const newMessage: ChatMessage = {
      id: uuidv4(),
      role: sendAsCharacter ? 'character' : 'user',
      content: replacePlaceholders(input),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setInput('');
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    
    if (!sendAsCharacter) {
        await generateResponse(newMessages);
    }
  };


  const handleContinue = async () => {
      if (isLoading) return;
      setShowActions(false);
      await generateResponse(messages);
  };

  const handleImpersonateUser = async () => {
      if (isLoading) return;
      setShowActions(false);
      await generateResponse(messages, 'user');
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || isLoading) return;

    let newMessages = [...messages];
    // If last message is AI (character), remove it to regenerate
    if (newMessages[newMessages.length - 1].role === 'character') {
        newMessages.pop();
    }
    
    setMessages(newMessages);
    if (newMessages.length > 0) {
        await generateResponse(newMessages);
    }
  };

  const handleDeleteMessage = (id: string) => {
    if (confirm('Xóa tin nhắn này?')) {
      setMessages(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleEditMessage = (id: string, content: string) => {
    setEditingMessageId(id);
    setEditContent(content);
  };

  const saveEdit = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: editContent } : m));
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleClearChat = () => {
    if (confirm('Xóa lịch sử trò chuyện? Hành động này không thể hoàn tác.')) {
        const initialMessage: ChatMessage = {
            id: uuidv4(),
            role: 'character',
            content: replacePlaceholders(character.firstMes || `Xin chào, tôi là ${character.name}.`),
            timestamp: Date.now(),
        };
        setMessages([initialMessage]);
    }
  }

  return (
    <div 
      className="dark flex flex-col h-[calc(100vh-4rem)] md:h-screen text-gray-50 font-sans relative bg-gray-950 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: character.avatarUrl ? `url(${character.avatarUrl})` : 'none' }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />

      {/* Settings Modal */}
      {showSettings && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-50">Cài đặt Chat</h2>
                      <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="space-y-6">
                      <div>
                          <div className="flex justify-between mb-2">
                              <label className="text-sm font-medium text-gray-200">
                                  Temperature
                              </label>
                              <span className="text-sm font-bold text-indigo-400">{temperature}</span>
                          </div>
                          <input 
                              type="range" 
                              min="0.1" 
                              max="2.0" 
                              step="0.1" 
                              value={temperature} 
                              onChange={(e) => setTemperature(parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                              Giá trị cao làm cho câu trả lời ngẫu nhiên và sáng tạo hơn, giá trị thấp làm cho nó tập trung và có thể dự đoán được.
                          </p>
                      </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                      <button 
                          onClick={() => setShowSettings(false)}
                          className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-gray-50 font-medium transition-colors border border-white/10"
                      >
                          Xong
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-2 md:p-4 z-10 relative bg-gradient-to-b from-black/80 via-black/40 to-transparent pb-4 md:pb-8">
        <button
          onClick={onBack}
          className="p-1.5 md:p-2.5 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40 border border-white/10 transition-colors"
        >
          <ArrowLeft size={16} className="md:w-5 md:h-5" />
        </button>
        
        <div className="flex items-center gap-1.5 md:gap-2 bg-black/20 backdrop-blur-md px-3 md:px-6 py-1 md:py-2 rounded-full border border-white/10 max-w-[50%] md:max-w-none">
            <h1 className="font-bold text-sm md:text-lg tracking-wide truncate">{character.name}</h1>
        </div>
        
        <div className="flex gap-1 md:gap-2">
            <button 
                onClick={handleClearChat}
                className="p-1.5 md:p-2.5 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40 border border-white/10 transition-colors"
                title="Xóa Chat"
            >
                <RefreshCw size={16} className="md:w-5 md:h-5" />
            </button>
            <button 
                onClick={() => setShowSettings(true)}
                className="p-1.5 md:p-2.5 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40 border border-white/10 transition-colors"
            >
                <Settings size={16} className="md:w-5 md:h-5" />
            </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10 relative scrollbar-hide">
        {/* System info message at the top */}
        <div className="flex justify-center mb-8">
            <span className="px-4 py-1.5 rounded-full bg-black/25 backdrop-blur-none border-none shadow-none text-xs text-gray-300">
                AI tạo nội dung, vui lòng tuân thủ quy định cộng đồng
            </span>
        </div>

        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`group flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex flex-col max-w-[70%] md:max-w-[75%] gap-1`}>
                {editingMessageId === msg.id ? (
                    <div className="flex flex-col gap-2 min-w-[300px] bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                            rows={4}
                        />
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => setEditingMessageId(null)}
                                className="px-4 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg text-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={() => saveEdit(msg.id)}
                                className="px-4 py-1.5 text-sm bg-indigo-500/80 hover:bg-indigo-500 rounded-lg text-gray-50 transition-colors"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={`relative group/msg flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                            className={`px-3 py-2 md:px-5 md:py-3.5 whitespace-pre-wrap leading-relaxed text-[13px] md:text-base ${
                                msg.role === 'user'
                                ? 'bg-black/50 text-gray-50 rounded-2xl md:rounded-3xl rounded-br-sm md:rounded-br-md shadow-lg backdrop-blur-md border border-white/10'
                                : msg.role === 'system'
                                ? 'bg-red-900/50 text-red-100 rounded-xl md:rounded-2xl text-xs md:text-sm text-center shadow-lg backdrop-blur-md border border-white/10'
                                : idx === 0
                                ? 'bg-black/25 text-gray-50 rounded-2xl md:rounded-3xl rounded-bl-sm md:rounded-bl-md shadow-none backdrop-blur-none border-none'
                                : 'bg-white/20 text-gray-50 rounded-2xl md:rounded-3xl rounded-bl-sm md:rounded-bl-md shadow-lg backdrop-blur-md border border-white/10'
                            }`}
                        >
                            {msg.content}
                            
                            {msg.thought && (
                                <details className="mt-2 w-full text-[11px] md:text-xs text-gray-400 bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-inner">
                                    <summary className="px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors select-none font-medium italic flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                                        AI đang suy nghĩ...
                                    </summary>
                                    <div className="px-4 py-3 whitespace-pre-wrap italic opacity-90 border-t border-white/10 bg-black/20 leading-relaxed font-light">
                                        {msg.thought}
                                    </div>
                                </details>
                            )}
                        </div>
                        
                        {/* Message Actions */}
                        <div className={`
                            flex items-center gap-1 transition-opacity
                            mt-2 md:mt-0
                            opacity-100 md:opacity-0 group-hover/msg:opacity-100
                            md:absolute md:top-1/2 md:-translate-y-1/2
                            ${msg.role === 'user' ? 'md:right-full md:mr-2' : 'md:left-full md:ml-2'}
                            bg-black/30 md:bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10
                        `}>
                            <button 
                                onClick={() => handleEditMessage(msg.id, msg.content)}
                                className="p-2 md:p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                title="Edit"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-2 md:p-1.5 text-white/70 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                            {msg.role === 'character' && msg.id === messages[messages.length - 1].id && (
                                <button 
                                    onClick={handleRegenerate}
                                    className="p-2 md:p-1.5 text-white/70 hover:text-indigo-400 hover:bg-white/10 rounded-full transition-colors"
                                    title="Regenerate"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
          </div>
        ))}
        
        {isLoading && (
            <div className="flex justify-start w-full">
                <div className="max-w-[85%]">
                    <div className="bg-white/20 backdrop-blur-md rounded-3xl rounded-bl-md px-5 py-4 border border-white/10 shadow-lg">
                        <div className="flex gap-1.5 items-center h-4">
                            <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 md:p-4 z-10 relative bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-4 md:pt-12">
        <div className="max-w-4xl mx-auto relative flex items-end gap-1 md:gap-2 bg-black/40 backdrop-blur-xl rounded-[20px] md:rounded-[32px] p-1 md:p-1.5 border border-white/20 shadow-2xl">
            {/* Actions Menu */}
            <div className="relative shrink-0">
                <button 
                    onClick={() => setShowActions(!showActions)}
                    className="p-1.5 md:p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors m-0.5"
                >
                    <MoreVertical size={18} className="md:w-5 md:h-5" />
                </button>
                
                {showActions && (
                    <div className="absolute bottom-full left-0 mb-2 md:mb-4 w-48 md:w-56 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden z-20 py-1 md:py-2">
                        <button 
                            onClick={handleContinue}
                            className="w-full text-left px-4 md:px-5 py-2.5 md:py-3 hover:bg-white/10 text-xs md:text-sm text-gray-50 flex items-center gap-2 md:gap-3 transition-colors"
                        >
                            <Play size={14} className="text-indigo-400 md:w-4 md:h-4" />
                            Tiếp tục tạo
                        </button>
                        <button 
                            onClick={handleImpersonateUser}
                            className="w-full text-left px-4 md:px-5 py-2.5 md:py-3 hover:bg-white/10 text-xs md:text-sm text-gray-50 flex items-center gap-2 md:gap-3 transition-colors"
                        >
                            <User size={14} className="text-emerald-400 md:w-4 md:h-4" />
                            Đóng giả User
                        </button>
                    </div>
                )}
            </div>

            <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder={sendAsCharacter ? 'Gửi dưới tên nhân vật...' : 'Gửi tin nhắn...'}
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-100 resize-none max-h-[200px] min-h-[36px] md:min-h-[44px] py-2 md:py-3 px-1 md:px-2 placeholder-white/50 text-[13px] md:text-[15px] overflow-y-auto scrollbar-hide"
                rows={1}
                style={{ height: 'auto' }}
            />
            
            <button
                onClick={() => setSendAsCharacter(!sendAsCharacter)}
                className={`p-1.5 md:p-3 rounded-full transition-colors shrink-0 m-0.5 ${sendAsCharacter ? 'bg-indigo-500/80 text-gray-50' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                title={sendAsCharacter ? "Đang gửi dưới tên Nhân vật" : "Đang gửi dưới tên User"}
            >
                {sendAsCharacter ? <Bot size={16} className="md:w-5 md:h-5" /> : <User size={16} className="md:w-5 md:h-5" />}
            </button>

            <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-1.5 md:p-3 bg-white/20 hover:bg-white/30 disabled:bg-white/5 disabled:text-white/30 text-gray-50 rounded-full transition-colors shrink-0 m-0.5 backdrop-blur-md"
            >
                <Send size={16} className="md:w-5 md:h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};


