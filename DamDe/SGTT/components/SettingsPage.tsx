import React, { useState } from 'react';
import { 
    Settings, 
    Cpu, 
    Save, 
    Server, 
    Check, 
    AlertCircle, 
    CheckCircle2, 
    Loader2, 
    Key, 
    Globe, 
    Sliders, 
    Zap,
    Eye,
    EyeOff,
    ExternalLink
} from 'lucide-react';
import { SachHiepProviderFactory } from '../infra/providers/SachHiepProviderFactory';
import { SachHiepDeepSeekProvider } from '../infra/providers/SachHiepDeepSeekProvider';
import { AIConfig, ProviderFallbackMode, ProviderType } from '../infra/providers/AIConfig';

export const SettingsPage: React.FC = () => {
    const [config, setConfig] = useState<AIConfig>(() => SachHiepProviderFactory.getInstance().getConfig());
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    // Test API state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        tested: boolean;
        success: boolean;
        latencyMs: number;
        message: string;
        reply?: string;
    } | null>(null);

    const handleSave = () => {
        setIsSaving(true);
        SachHiepProviderFactory.getInstance().updateConfig(config);
        
        setTimeout(() => {
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }, 300);
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        const currentModel = config.deepseekModel === 'custom' 
            ? (config.deepseekCustomModel || 'deepseek-chat') 
            : (config.deepseekModel || 'deepseek-chat');

        try {
            const res = await SachHiepDeepSeekProvider.testConnection(
                config.deepseekApiKey,
                config.deepseekBaseUrl,
                currentModel
            );

            setTestResult({
                tested: true,
                success: res.success,
                latencyMs: res.latencyMs,
                message: res.message,
                reply: res.reply
            });
        } catch (err: any) {
            setTestResult({
                tested: true,
                success: false,
                latencyMs: 0,
                message: `Lỗi bất ngờ: ${err.message || String(err)}`
            });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="min-h-full bg-gray-950 text-gray-100 p-4 md:p-6 lg:p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2.5">
                            <Settings className="text-pink-500 w-6 h-6" />
                            Cài Đặt AI (DeepSeek)
                        </h1>
                        <p className="text-sm text-gray-400 mt-1">
                            Cấu hình kết nối API DeepSeek và các tham số sinh văn bản cho tiểu thuyết.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {saveSuccess && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-fadeIn">
                                <Check size={14} /> Đã lưu cài đặt!
                            </span>
                        )}
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`px-5 py-2.5 ${isSaving ? 'bg-gray-700' : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500'} text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-pink-900/30 transition-all`}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>{isSaving ? 'Đang lưu...' : 'Lưu Cài Đặt'}</span>
                        </button>
                    </div>
                </div>

                {/* DeepSeek Primary Configuration Card */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 md:p-7 shadow-xl space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-gray-800/80">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-900/30 shrink-0">
                                <Cpu size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-gray-100">DeepSeek AI</h2>
                                    <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/60 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        Mặc định (Cloud)
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Mô hình ngôn ngữ hàng đầu cho sáng tác văn học và suy luận cốt truyện
                                </p>
                            </div>
                        </div>

                        <div className="px-3 py-1 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div> 
                            <span>Đang sử dụng</span>
                        </div>
                    </div>

                    {/* API Key Input */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                                <Key size={15} className="text-pink-400" />
                                DeepSeek API Key
                            </label>
                            <a 
                                href="https://platform.deepseek.com/api_keys" 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 hover:underline"
                            >
                                <span>Lấy key tại platform.deepseek.com</span>
                                <ExternalLink size={12} />
                            </a>
                        </div>
                        <div className="relative">
                            <input 
                                type={showApiKey ? "text" : "password"}
                                value={config.deepseekApiKey || ''}
                                onChange={(e) => setConfig({ ...config, deepseekApiKey: e.target.value })}
                                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="w-full bg-gray-950 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 pr-10 font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                            >
                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400">
                            Key được lưu an toàn trực tiếp trên trình duyệt của bạn (Local Storage) và không bao giờ gửi qua máy chủ trung gian.
                        </p>
                    </div>

                    {/* Base URL and Model Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Base URL */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                                <Globe size={15} className="text-blue-400" />
                                Base URL Endpoint
                            </label>
                            <input 
                                type="text"
                                value={config.deepseekBaseUrl || 'https://api.deepseek.com'}
                                onChange={(e) => setConfig({ ...config, deepseekBaseUrl: e.target.value })}
                                placeholder="https://api.deepseek.com"
                                className="w-full bg-gray-950 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                            <p className="text-[11px] text-gray-400">
                                Mặc định chính thức là <code className="text-gray-300">https://api.deepseek.com</code>
                            </p>
                        </div>

                        {/* Model */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                                <Cpu size={15} className="text-purple-400" />
                                Mô hình DeepSeek
                            </label>
                            <select 
                                value={config.deepseekModel || 'deepseek-chat'}
                                onChange={(e) => setConfig({ ...config, deepseekModel: e.target.value })}
                                className="w-full bg-gray-950 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            >
                                <option value="deepseek-chat">deepseek-chat (V3 - Viết văn cực hay, siêu nhanh, khuyên dùng)</option>
                                <option value="deepseek-reasoner">deepseek-reasoner (R1 - Suy luận tư duy sâu, lập dàn ý)</option>
                                <option value="custom">Tùy chỉnh model khác...</option>
                            </select>
                            {config.deepseekModel === 'custom' && (
                                <input 
                                    type="text"
                                    value={config.deepseekCustomModel || ''}
                                    onChange={(e) => setConfig({ ...config, deepseekCustomModel: e.target.value })}
                                    placeholder="Nhập mã model (VD: deepseek-ai/DeepSeek-V3)"
                                    className="w-full bg-gray-950 border border-gray-700/80 rounded-xl px-3.5 py-2 text-sm text-gray-100 mt-2 font-mono"
                                />
                            )}
                        </div>
                    </div>

                    {/* Test API Section */}
                    <div className="p-4 bg-gray-950/70 border border-gray-800 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                                    <Zap size={16} className="text-amber-400" />
                                    Kiểm tra kết nối API
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Gửi yêu cầu thử nghiệm siêu nhỏ đến máy chủ DeepSeek để kiểm tra API Key và hạn mức.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={isTesting || !config.deepseekApiKey?.trim()}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shrink-0 ${
                                    isTesting 
                                        ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                                        : !config.deepseekApiKey?.trim()
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                                }`}
                            >
                                {isTesting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Đang kiểm tra...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={14} />
                                        <span>Test API Ngay</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Test Results Banner */}
                        {testResult && testResult.tested && (
                            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fadeIn ${
                                testResult.success 
                                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' 
                                    : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                            }`}>
                                <div className="flex items-center gap-2 font-bold">
                                    {testResult.success ? (
                                        <CheckCircle2 size={16} className="text-emerald-400" />
                                    ) : (
                                        <AlertCircle size={16} className="text-rose-400" />
                                    )}
                                    <span>{testResult.message}</span>
                                    {testResult.latencyMs > 0 && (
                                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10">
                                            {testResult.latencyMs} ms
                                        </span>
                                    )}
                                </div>
                                {testResult.reply && (
                                    <div className="text-[11px] font-mono text-gray-300 pl-6 bg-black/30 p-2 rounded-lg border border-white/5">
                                        Phản hồi: &ldquo;{testResult.reply}&rdquo;
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Creative Parameters (Sliders) */}
                    <div className="pt-4 border-t border-gray-800 space-y-4">
                        <div className="flex items-center gap-2">
                            <Sliders size={16} className="text-pink-400" />
                            <h3 className="text-sm font-bold text-gray-200">Tham Số Sinh Văn Bản</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Temperature */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-300 font-medium">Độ sáng tạo (Temperature)</span>
                                    <span className="text-pink-400 font-mono font-bold">{config.deepseekTemperature ?? 1.0}</span>
                                </div>
                                <input 
                                    type="range"
                                    min="0.2"
                                    max="1.5"
                                    step="0.1"
                                    value={config.deepseekTemperature ?? 1.0}
                                    onChange={(e) => setConfig({ ...config, deepseekTemperature: parseFloat(e.target.value) })}
                                    className="w-full accent-pink-500 bg-gray-950 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Chặt chẽ (0.3)</span>
                                    <span>Cân bằng (0.7)</span>
                                    <span>Sáng tạo / Văn học (1.0 - 1.3)</span>
                                </div>
                            </div>

                            {/* Max Tokens */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-300 font-medium">Độ dài tối đa mỗi lần viết (Max Tokens)</span>
                                    <span className="text-pink-400 font-mono font-bold">{config.deepseekMaxTokens ?? 4096}</span>
                                </div>
                                <input 
                                    type="range"
                                    min="1024"
                                    max="8192"
                                    step="512"
                                    value={config.deepseekMaxTokens ?? 4096}
                                    onChange={(e) => setConfig({ ...config, deepseekMaxTokens: parseInt(e.target.value) })}
                                    className="w-full accent-pink-500 bg-gray-950 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>1024 (~500 từ)</span>
                                    <span>4096 (~2500 từ)</span>
                                    <span>8192 (~5000 từ)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secondary: Local LLM Configuration (Collapsible or Auxiliary) */}
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-800 text-gray-400 flex items-center justify-center shrink-0">
                                <Server size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-200">Local LLM / Ollama (Tùy chọn)</h3>
                                <p className="text-xs text-gray-400">
                                    Dành cho máy chủ cục bộ hoặc mô hình offline (Ollama, LM Studio, vLLM)
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const newProvider = config.activeProvider === ProviderType.LOCAL_LLM ? ProviderType.DEEPSEEK : ProviderType.LOCAL_LLM;
                                setConfig({ ...config, activeProvider: newProvider });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                config.activeProvider === ProviderType.LOCAL_LLM
                                    ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                                    : 'bg-gray-950 text-gray-400 border-gray-700 hover:text-gray-200'
                            }`}
                        >
                            {config.activeProvider === ProviderType.LOCAL_LLM ? '✓ Đang kích hoạt' : 'Chuyển sang Local'}
                        </button>
                    </div>

                    {config.activeProvider === ProviderType.LOCAL_LLM && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-800 animate-fadeIn">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400">Local Base URL</label>
                                <input 
                                    type="text"
                                    value={config.localBaseUrl || 'http://127.0.0.1:11434'}
                                    onChange={(e) => setConfig({ ...config, localBaseUrl: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono"
                                    placeholder="http://127.0.0.1:11434"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400">Local Model ID</label>
                                <input 
                                    type="text"
                                    value={config.localModel || 'deepseek-r1:latest'}
                                    onChange={(e) => setConfig({ ...config, localModel: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono"
                                    placeholder="deepseek-r1:latest"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
