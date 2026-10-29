import { Character, EntityRegistry } from '../../types';
import { CanonExtractionResult } from '../aiService';

export interface AIProvider {
    /**
     * Generate content from a simple prompt
     */
    generateContent(prompt: string, useAux?: boolean, config?: any): Promise<string>;

    /**
     * Generate an image from a prompt
     */
    generateImage?(
        prompt: string, 
        aspectRatio?: string, 
        referenceImages?: { data: string, mimeType: string }[],
        onProgress?: (progress: number, previewBase64: string | null) => void
    ): Promise<string>;

    /**
     * Edit an image from a prompt
     */
    editImage?(prompt: string, imageBase64: string, mimeType: string, aspectRatio?: string): Promise<string>;

    /**
     * Embed text into vector representation
     */
    embedText(text: string): Promise<number[]>;

    /**
     * Generate content using raw GoogleGenAI format arrays directly
     */
    generateRawContent(contents: any[], config?: any): Promise<string>;

    /**
     * Generate content stream using raw GoogleGenAI format arrays directly
     */
    generateRawStream(contents: any[], config?: any): AsyncGenerator<{ text: string; thought?: string; usageMetadata?: any }>;

    /**
     * Generate illustration prompts
     */
    generateIllustrationPrompts?(content: string, numScenes: number, characters: any[]): Promise<{ scenes: any[], prompt: string }>;

    /**
     * Get the raw prompt that would be sent for illustration generation
     */
    getIllustrationPrompt?(content: string, numScenes: number, characters: any[]): string;

    /**
     * Extract canon data rules, profiles, relations, locations, factions from text chunk
     */
    extractCanonData(textChunk: string): Promise<CanonExtractionResult>;

    /**
     * Core streaming generator for story continuation
     */
    generateStoryStream(
        immediateContext: string,
        rollingSummaries: string,
        worldBible: string,
        augmentedContext: string,
        synopsis: string,
        characters: Character[],
        worldLore: string[],
        genre: string,
        writingStyle: string,
        pov: string,
        pronounStyle: string,
        negativePrompt: string,
        nsfw: boolean,
        userInstruction: string,
        sourceUrl: string | undefined,
        entityRegistry: EntityRegistry | undefined,
        currentChapterTitle: string
    ): AsyncGenerator<{ text: string; thought?: string; usageMetadata: any; storyContinuePlan?: any; raw?: string }>;

    /**
     * Stream generator for rewriting text
     */
    rewriteContentStream(
        originalText: string,
        instruction: string,
        contextData: {
            worldBible: string;
            synopsis: string;
            characters: Character[];
            worldLore: string[];
            genre: string;
            writingStyle: string;
            pov: string;
            pronounStyle: string;
            negativePrompt: string;
            nsfw: boolean;
            sourceUrl?: string;
            entityRegistry?: EntityRegistry;
        }
    ): AsyncGenerator<{ text: string; thought?: string; usageMetadata: any; storyContinuePlan?: any; raw?: string }>;

    /**
     * Extract character details from text
     */
    extractCharacters(text: string, pronounStyle: string): Promise<Character[]>;

    /**
     * Read external fanfic wiki data and extract setting/characters
     */
    ingestFanficData(fandomName: string, url: string): Promise<{ setting: string; characters: Character[] }>;

    /**
     * Summarize arbitrary text based on pronoun rules
     */
    summarize(text: string, pronounStyle: string): Promise<string>;

    /**
     * Generate the initial Story Bible from form data and optional source text
     */
    generateStoryBible?(formData: any, sourceText?: string): Promise<import('../../types').StoryBible>;

    /**
     * Update the Story Bible after a chapter is written
     */
    updateStoryBible?(chapterContent: string): Promise<{ chapter_core: string, new_chars?: import('../../types').StoryBibleChar[], arc_update?: string }>;

    /**
     * Core streaming generator for story continuation using Story Bible
     */
    generateSachHiepStoryStream?(
        recentContext: string,
        oldCores: string,
        charSnippet: string,
        storyBible: import('../../types').StoryBible,
        genre: string,
        writingStyle: string,
        pov: string,
        pronounStyle: string,
        negativePrompt: string,
        nsfw: boolean,
        userInstruction: string,
        currentChapterTitle: string,
        modelName?: string
    ): AsyncGenerator<{ text: string; thought?: string; usageMetadata: any; storyContinuePlan?: any; raw?: string }>;
}
