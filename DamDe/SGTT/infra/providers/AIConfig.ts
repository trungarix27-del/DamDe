export enum ProviderType {
    DEEPSEEK = 'deepseek',
    LOCAL_LLM = 'local',
    GEMINI = 'gemini'
}

export enum ProviderFallbackMode {
    PRIMARY_ONLY = 'primary', // Only use currently selected provider
    FALLBACK_LOCAL = 'fallback_local', // DeepSeek -> Local
    FALLBACK_DEEPSEEK = 'fallback_deepseek', // Local -> DeepSeek
    FALLBACK_GEMINI = 'fallback_gemini' // Backward compatibility
}

export interface AIConfig {
    activeProvider: ProviderType;
    fallbackMode: ProviderFallbackMode;
    // DeepSeek Configuration
    deepseekApiKey: string;
    deepseekBaseUrl: string;
    deepseekModel: string;
    deepseekCustomModel?: string;
    deepseekTemperature?: number;
    deepseekMaxTokens?: number;
    // Local LLM Configuration
    localBaseUrl: string;
    localModel: string;
    // Legacy fields for backward compatibility
    geminiModel?: string;
    geminiImageModel?: string;
    geminiCustomModel?: string;
    geminiApiKeys?: string[];
    sdWebuiUrl?: string;
}

// Load default configuration
export const defaultAIConfig: AIConfig = {
    activeProvider: ProviderType.DEEPSEEK,
    fallbackMode: ProviderFallbackMode.PRIMARY_ONLY,
    deepseekApiKey: (import.meta as any).env?.VITE_DEEPSEEK_API_KEY || '',
    deepseekBaseUrl: (import.meta as any).env?.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    deepseekModel: 'deepseek-chat',
    deepseekCustomModel: '',
    deepseekTemperature: 1.0,
    deepseekMaxTokens: 4096,
    localBaseUrl: (import.meta as any).env?.VITE_LOCAL_LLM_BASE_URL || 'http://127.0.0.1:11434',
    localModel: (import.meta as any).env?.VITE_LOCAL_LLM_MODEL || 'deepseek-r1:latest',
    geminiModel: 'gemini-2.5-flash',
    geminiImageModel: 'gemini-2.5-flash-image',
    geminiApiKeys: [],
    sdWebuiUrl: ''
};
