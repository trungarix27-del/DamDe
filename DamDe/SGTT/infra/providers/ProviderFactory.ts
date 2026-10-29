import { Character, EntityRegistry } from '../../types';
import { CanonExtractionResult } from '../aiService';
import { AIConfig, defaultAIConfig, ProviderType, ProviderFallbackMode } from './AIConfig';
import { AIProvider } from './AIProviderInterface';
import { GeminiProvider } from './GeminiProvider';
import { LocalLLMProvider } from './LocalLLMProvider';

export class ProviderFactory implements AIProvider {
    private static instance: ProviderFactory;
    private config: AIConfig;
    
    private geminiInstance: GeminiProvider | null = null;
    private localInstance: LocalLLMProvider | null = null;

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

    public static getInstance(config?: Partial<AIConfig>): ProviderFactory {
        if (!ProviderFactory.instance) {
            ProviderFactory.instance = new ProviderFactory(config);
        } else if (config) {
            ProviderFactory.instance.updateConfig(config);
        }
        return ProviderFactory.instance;
    }

    public getConfig(): AIConfig {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<AIConfig>) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem('aetheria_ai_config', JSON.stringify(this.config));
        
        // Re-init local if URL or model changed
        if (newConfig.localBaseUrl || newConfig.localModel) {
             this.localInstance = new LocalLLMProvider(this.config.localBaseUrl, this.config.localModel);
        }

        // Re-init gemini if keys or SD URL changed
        if (newConfig.geminiApiKeys || newConfig.sdWebuiUrl || newConfig.geminiModel || newConfig.geminiCustomModel) {
            this.geminiInstance = new GeminiProvider(this.config);
        }
    }

    private getProvider(type: ProviderType): AIProvider {
        if (type === ProviderType.GEMINI) {
            if (!this.geminiInstance) this.geminiInstance = new GeminiProvider(this.config);
            return this.geminiInstance;
        } else {
            if (!this.localInstance) this.localInstance = new LocalLLMProvider(this.config.localBaseUrl, this.config.localModel);
            return this.localInstance;
        }
    }

    private getFallbackProvider(primaryType: ProviderType): AIProvider | null {
        if (this.config.fallbackMode === ProviderFallbackMode.PRIMARY_ONLY) return null;
        
        if (primaryType === ProviderType.GEMINI && this.config.fallbackMode === ProviderFallbackMode.FALLBACK_LOCAL) {
            return this.getProvider(ProviderType.LOCAL_LLM);
        }
        
        if (primaryType === ProviderType.LOCAL_LLM && this.config.fallbackMode === ProviderFallbackMode.FALLBACK_GEMINI) {
            return this.getProvider(ProviderType.GEMINI);
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
            console.warn(`[ProviderFactory] ${methodName} failed on primary ${this.config.activeProvider}. Error:`, error);
            const fallbackProvider = this.getFallbackProvider(this.config.activeProvider);
            if (fallbackProvider) {
                console.log(`[ProviderFactory] Attempting fallback for ${methodName}...`);
                return await operation(fallbackProvider);
            }
            throw error;
        }
    }

    public async generateImage(
        prompt: string, 
        aspectRatio: string = "3:4", 
        referenceImages?: { data: string, mimeType: string }[],
        onProgress?: (progress: number, previewBase64: string | null) => void
    ): Promise<string> {
        return this.executeWithFallback(p => {
            if (typeof p.generateImage === 'function') {
                return p.generateImage(prompt, aspectRatio, referenceImages, onProgress);
            }
            throw new Error("generateImage not implemented on provider");
        }, 'generateImage');
    }

    public async editImage(prompt: string, imageBase64: string, mimeType: string, aspectRatio: string = "3:4"): Promise<string> {
        return this.executeWithFallback(p => {
            if (typeof p.editImage === 'function') {
                return p.editImage(prompt, imageBase64, mimeType, aspectRatio);
            }
            throw new Error("editImage not implemented on provider");
        }, 'editImage');
    }

    public async generateContent(prompt: string, useAux?: boolean, config?: any): Promise<string> {
        return this.executeWithFallback(p => p.generateContent(prompt, useAux, config), 'generateContent');
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
            console.warn(`[ProviderFactory] generateRawStream failed on primary ${this.config.activeProvider}`, error);
            const fallbackProvider = this.getFallbackProvider(this.config.activeProvider);
            if (fallbackProvider) {
                console.log(`[ProviderFactory] Attempting fallback stream for generateRawStream...`);
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
            console.warn(`[ProviderFactory] generateStoryStream failed on primary ${this.config.activeProvider}`, error);
            const fallbackProvider = this.getFallbackProvider(this.config.activeProvider);
            if (fallbackProvider) {
                console.log(`[ProviderFactory] Attempting fallback stream for generateStoryStream...`);
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
            console.warn(`[ProviderFactory] rewriteContentStream failed on primary ${this.config.activeProvider}`, error);
            const fallbackProvider = this.getFallbackProvider(this.config.activeProvider);
            if (fallbackProvider) {
                console.log(`[ProviderFactory] Attempting fallback stream for rewriteContentStream...`);
                yield* fallbackProvider.rewriteContentStream(originalText, instruction, contextData);
            } else {
                throw error;
            }
        }
    }
}
