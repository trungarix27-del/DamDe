import { Character, EntityRegistry } from '../../types';
import { CanonExtractionResult } from '../aiService';
import { AIConfig, defaultAIConfig, ProviderType, ProviderFallbackMode } from './AIConfig';
import { AIProvider } from './AIProviderInterface';
import { SachHiepDeepSeekProvider } from './SachHiepDeepSeekProvider';
import { SachHiepGeminiProvider } from './SachHiepGeminiProvider';
import { SachHiepLocalLLMProvider } from './SachHiepLocalLLMProvider';

export class SachHiepProviderFactory implements AIProvider {
    private static instance: SachHiepProviderFactory;
    private config: AIConfig;
    
    private deepseekInstance: SachHiepDeepSeekProvider | null = null;
    private geminiInstance: SachHiepGeminiProvider | null = null;
    private localInstance: SachHiepLocalLLMProvider | null = null;

    private constructor(config: Partial<AIConfig> = {}) {
        const savedConfig = localStorage.getItem('aetheria_ai_config');
        let parsedSavedConfig = {};
        if (savedConfig) {
            try {
                parsedSavedConfig = JSON.parse(savedConfig);
            } catch (e) {
                console.error('Failed to parse saved AI config', e);
            }
        }
        this.config = { ...defaultAIConfig, ...parsedSavedConfig, ...config };
    }

    public static getInstance(config?: Partial<AIConfig>): SachHiepProviderFactory {
        if (!SachHiepProviderFactory.instance) {
            SachHiepProviderFactory.instance = new SachHiepProviderFactory(config);
        } else if (config) {
            SachHiepProviderFactory.instance.updateConfig(config);
        }
        return SachHiepProviderFactory.instance;
    }

    public getConfig(): AIConfig {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<AIConfig>) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem('aetheria_ai_config', JSON.stringify(this.config));
        
        // Re-init DeepSeek if settings changed
        if (newConfig.deepseekApiKey !== undefined || newConfig.deepseekBaseUrl !== undefined || 
            newConfig.deepseekModel !== undefined || newConfig.deepseekCustomModel !== undefined ||
            newConfig.deepseekTemperature !== undefined || newConfig.deepseekMaxTokens !== undefined) {
            this.deepseekInstance = new SachHiepDeepSeekProvider(this.config);
        }

        // Re-init local if URL or model changed
        if (newConfig.localBaseUrl || newConfig.localModel) {
             this.localInstance = new SachHiepLocalLLMProvider(this.config.localBaseUrl, this.config.localModel);
        }

        // Re-init gemini if model or api keys changed
        if (newConfig.geminiModel || newConfig.geminiCustomModel || newConfig.geminiApiKeys) {
            this.geminiInstance = new SachHiepGeminiProvider(this.config);
        }
    }

    private getProvider(type: ProviderType): AIProvider {
        if (type === ProviderType.DEEPSEEK) {
            if (!this.deepseekInstance) this.deepseekInstance = new SachHiepDeepSeekProvider(this.config);
            return this.deepseekInstance;
        } else if (type === ProviderType.LOCAL_LLM) {
            if (!this.localInstance) this.localInstance = new SachHiepLocalLLMProvider(this.config.localBaseUrl, this.config.localModel);
            return this.localInstance;
        } else {
            if (!this.geminiInstance) this.geminiInstance = new SachHiepGeminiProvider(this.config);
            return this.geminiInstance;
        }
    }

    private getFallbackProvider(primaryType: ProviderType): AIProvider | null {
        if (this.config.fallbackMode === ProviderFallbackMode.PRIMARY_ONLY) return null;
        
        if (primaryType === ProviderType.DEEPSEEK && this.config.fallbackMode === ProviderFallbackMode.FALLBACK_LOCAL) {
            return this.getProvider(ProviderType.LOCAL_LLM);
        }
        
        if (primaryType === ProviderType.LOCAL_LLM && this.config.fallbackMode === ProviderFallbackMode.FALLBACK_DEEPSEEK) {
            return this.getProvider(ProviderType.DEEPSEEK);
        }
        
        return null;
    }

    /** 
     * Orchestrator generic wrapper for standard Promise-returning methods
     */
    private async executeWithFallback<T>(operation: (provider: AIProvider) => Promise<T>, methodName: string): Promise<T> {
        const primaryProvider = this.getProvider(this.config.activeProvider);
        try {
            return await operation(primaryProvider);
        } catch (error) {
            console.warn(`[SachHiepProviderFactory] ${methodName} failed on primary ${this.config.activeProvider}. Error:`, error);
            const fallbackProvider = this.getFallbackProvider(this.config.activeProvider);
            if (fallbackProvider) {
                console.log(`[SachHiepProviderFactory] Attempting fallback for ${methodName}...`);
                return await operation(fallbackProvider);
            }
            throw error;
        }
    }

    public async generateContent(prompt: string, useAux?: boolean): Promise<string> {
        return this.executeWithFallback(p => p.generateContent(prompt, useAux), 'generateContent');
    }

    public async generateIllustrationPrompts(content: string, numScenes: number, characters: any[]): Promise<{ scenes: any[], prompt: string }> {
        return this.executeWithFallback(async p => {
            if (p.generateIllustrationPrompts) {
                return p.generateIllustrationPrompts(content, numScenes, characters);
            }
            return { scenes: [], prompt: "" };
        }, 'generateIllustrationPrompts');
    }

    public async generateImage(
        prompt: string, 
        aspectRatio?: string, 
        referenceImages?: { data: string, mimeType: string }[],
        onProgress?: (progress: number, previewBase64: string | null) => void
    ): Promise<string> {
        return this.executeWithFallback(async p => {
            if (p.generateImage) {
                return p.generateImage(prompt, aspectRatio, referenceImages, onProgress);
            }
            return "";
        }, 'generateImage');
    }

    public async embedText(text: string): Promise<number[]> {
        return this.executeWithFallback(p => p.embedText(text), 'embedText');
    }

    public async generateRawContent(contents: any[], config?: any): Promise<string> {
        return this.executeWithFallback(p => p.generateRawContent(contents, config), 'generateRawContent');
    }

    public async *generateRawStream(contents: any[], config?: any) {
        const primaryProvider = this.getProvider(this.config.activeProvider);
        let fallbackRequired = false;

        try {
            const stream = primaryProvider.generateRawStream(contents, config);
            const iterator = stream[Symbol.asyncIterator]();
            const firstResult = await iterator.next();

            if (!firstResult.done) {
                yield firstResult.value;
                for await (const chunk of stream) yield chunk;
            }
        } catch (error) {
            console.warn(`[SachHiepProviderFactory] generateRawStream failed on primary ${this.config.activeProvider}`, error);
            const fallbackProvider = this.getFallbackProvider(this.config.activeProvider);
            if (fallbackProvider) {
                console.log(`[SachHiepProviderFactory] Attempting fallback stream for generateRawStream...`);
                yield* fallbackProvider.generateRawStream(contents, config);
            } else {
                throw error;
            }
        }
    }

    public async extractCanonData(textChunk: string): Promise<CanonExtractionResult> {
        return this.executeWithFallback(p => p.extractCanonData(textChunk), 'extractCanonData');
    }

    public async extractCharacters(text: string, pronounStyle: string): Promise<Character[]> {
        return this.executeWithFallback(p => p.extractCharacters(text, pronounStyle), 'extractCharacters');
    }

    public async ingestFanficData(fandomName: string, url: string): Promise<{ setting: string; characters: Character[]; }> {
        return this.executeWithFallback(p => p.ingestFanficData(fandomName, url), 'ingestFanficData');
    }

    public async summarize(text: string, pronounStyle: string): Promise<string> {
        return this.executeWithFallback(p => p.summarize(text, pronounStyle), 'summarize');
    }

    public async generateStoryBible(formData: any, sourceText?: string): Promise<import('../../types').StoryBible> {
        return this.executeWithFallback(async p => {
            if (!p.generateStoryBible) throw new Error("generateStoryBible not implemented by provider");
            return p.generateStoryBible(formData, sourceText);
        }, 'generateStoryBible');
    }

    public async updateStoryBible(chapterContent: string): Promise<{ chapter_core: string, new_chars?: import('../../types').StoryBibleChar[], arc_update?: string }> {
        return this.executeWithFallback(async p => {
            if (!p.updateStoryBible) throw new Error("updateStoryBible not implemented by provider");
            return p.updateStoryBible(chapterContent);
        }, 'updateStoryBible');
    }

    public async *generateSachHiepStoryStream(
        recentContext: string, oldCores: string, charSnippet: string, storyBible: import('../../types').StoryBible,
        genre: string, writingStyle: string, pov: string, pronounStyle: string, negativePrompt: string,
        nsfw: boolean, userInstruction: string, currentChapterTitle: string
    ) {
        const primaryProvider = this.getProvider(this.config.activeProvider);
        let fallbackRequired = false;

        try {
            if (!primaryProvider.generateSachHiepStoryStream) throw new Error("generateSachHiepStoryStream not implemented by primary provider");
            const stream = primaryProvider.generateSachHiepStoryStream(
                recentContext, oldCores, charSnippet, storyBible, genre, writingStyle, pov, pronounStyle,
                negativePrompt, nsfw, userInstruction, currentChapterTitle
            );
            
            const iterator = stream[Symbol.asyncIterator]();
            const firstResult = await iterator.next();
            
            if (!firstResult.done) {
                yield firstResult.value;
                for await (const chunk of stream) yield chunk;
            }
        } catch (error) {
            console.warn(`[SachHiepProviderFactory] generateSachHiepStoryStream failed on primary ${this.config.activeProvider}`, error);
            const fallbackProvider = this.getFallbackProvider(this.config.activeProvider);
            if (fallbackProvider && fallbackProvider.generateSachHiepStoryStream) {
                console.log(`[SachHiepProviderFactory] Attempting fallback stream for generateSachHiepStoryStream...`);
                yield* fallbackProvider.generateSachHiepStoryStream(
                   recentContext, oldCores, charSnippet, storyBible, genre, writingStyle, pov, pronounStyle,
                   negativePrompt, nsfw, userInstruction, currentChapterTitle
                );
            } else {
                throw error;
            }
        }
    }

    /**
     * Orchestrator for AsyncGenerators requires special handling because trying to yield* inside a catch block 
     * with another generator can be tricky if we don't restart the iterator logic properly.
     */
    public async *generateStoryStream(
        immediateContext: string, rollingSummaries: string, worldBible: string, augmentedContext: string,
        synopsis: string, characters: Character[], worldLore: string[], genre: string, writingStyle: string,
        pov: string, pronounStyle: string, negativePrompt: string, nsfw: boolean, userInstruction: string,
        sourceUrl: string | undefined, entityRegistry: EntityRegistry | undefined, currentChapterTitle: string
    ) {
        const primaryProvider = this.getProvider(this.config.activeProvider);
        let fallbackRequired = false;

        try {
            const stream = primaryProvider.generateStoryStream(
                immediateContext, rollingSummaries, worldBible, augmentedContext, synopsis, characters, 
                worldLore, genre, writingStyle, pov, pronounStyle, negativePrompt, nsfw, userInstruction, 
                sourceUrl, entityRegistry, currentChapterTitle
            );
            
            // First chunk might throw if connection rejected/429
            const iterator = stream[Symbol.asyncIterator]();
            const firstResult = await iterator.next();
            
            if (!firstResult.done) {
                yield firstResult.value;
                for await (const chunk of stream) yield chunk;
            }
        } catch (error) {
            console.warn(`[SachHiepProviderFactory] generateStoryStream failed on primary ${this.config.activeProvider}`, error);
            const fallbackProvider = this.getFallbackProvider(this.config.activeProvider);
            if (fallbackProvider) {
                console.log(`[SachHiepProviderFactory] Attempting fallback stream for generateStoryStream...`);
                yield* fallbackProvider.generateStoryStream(
                   immediateContext, rollingSummaries, worldBible, augmentedContext, synopsis, characters, 
                   worldLore, genre, writingStyle, pov, pronounStyle, negativePrompt, nsfw, userInstruction, 
                   sourceUrl, entityRegistry, currentChapterTitle
                );
            } else {
                throw error;
            }
        }
    }

    public async *rewriteContentStream(
        originalText: string, instruction: string, contextData: {
            worldBible: string; synopsis: string; characters: Character[]; worldLore: string[]; genre: string;
            writingStyle: string; pov: string; pronounStyle: string; negativePrompt: string; nsfw: boolean;
            sourceUrl?: string; entityRegistry?: EntityRegistry;
        }
    ) {
        const primaryProvider = this.getProvider(this.config.activeProvider);
        let fallbackRequired = false;

        try {
            const stream = primaryProvider.rewriteContentStream(originalText, instruction, contextData);
            const iterator = stream[Symbol.asyncIterator]();
            const firstResult = await iterator.next();
            
            if (!firstResult.done) {
                yield firstResult.value;
                for await (const chunk of stream) yield chunk;
            }
        } catch (error) {
            console.warn(`[SachHiepProviderFactory] rewriteContentStream failed on primary ${this.config.activeProvider}`, error);
            const fallbackProvider = this.getFallbackProvider(this.config.activeProvider);
            if (fallbackProvider) {
                console.log(`[SachHiepProviderFactory] Attempting fallback stream for rewriteContentStream...`);
                yield* fallbackProvider.rewriteContentStream(originalText, instruction, contextData);
            } else {
                throw error;
            }
        }
    }
}
