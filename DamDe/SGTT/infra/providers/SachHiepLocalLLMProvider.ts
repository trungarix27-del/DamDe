import { Character, EntityRegistry } from "../../types";
import { SACH_HIEP_COT_PROMPT, sachHiepPromptBuilderService } from "../../narrative/prompting/sachHiepPromptAssembler";
import { AIProvider } from "./AIProviderInterface";
import { defaultAIConfig } from "./AIConfig";
import { CanonExtractionResult } from "../aiService";
import partialParse from 'partial-json-parser';

const THINKING_PATTERN = /<think>(.*?)<\/think>/s;

const cleanAndParseJSON = (text: string): any => {
    if (!text) return [];
    let cleanText = text.trim();
    if (cleanText.includes('```')) {
        cleanText = cleanText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    }
    
    const firstBracket = cleanText.indexOf('[');
    const firstBrace = cleanText.indexOf('{');
    
    try {
        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            const lastBracket = cleanText.lastIndexOf(']');
            if (lastBracket !== -1) cleanText = cleanText.substring(firstBracket, lastBracket + 1);
        } else if (firstBrace !== -1) {
             const lastBrace = cleanText.lastIndexOf('}');
             if (lastBrace !== -1) cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parse Error:", e, "Original Text:", text);
        return [];
    }
};

const mapThinkingBudgetToEffort = (budget: number | undefined): "low" | "medium" | "high" | undefined => {
    if (!budget || budget === 0) return undefined;
    if (budget >= 16384) return "high";
    if (budget >= 4096) return "medium";
    return "low";
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 120000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } catch (e: any) {
        if (e.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        throw e;
    } finally {
        clearTimeout(id);
    }
};

export class SachHiepLocalLLMProvider implements AIProvider {
    private baseUrl: string;
    private primaryModel: string;
    private get apiConfig() { return { baseUrl: this.baseUrl, model: this.primaryModel }; }

    constructor(baseUrl: string = defaultAIConfig.localBaseUrl, model: string = defaultAIConfig.localModel) {
        this.baseUrl = baseUrl;
        this.primaryModel = model;
    }

    async generateContent(prompt: string, useAux: boolean = false): Promise<string> {
        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    model: this.primaryModel,
                    temperature: 0.7,
                })
            });
            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || "";
            return rawContent.replace(THINKING_PATTERN, '').trim();
        } catch (e) {
            console.error("Local Generate content failed:", e);
            throw e; // Throw to allow fallback mechanism
        }
    }

    /**
     * Convert Gemini-format contents array to OpenAI messages array
     */
    private _convertContentsToMessages(contents: any[], config?: any): any[] {
        const messages: any[] = [];
        
        // Map systemInstruction from config to system role
        if (config?.systemInstruction) {
            const sysText = typeof config.systemInstruction === 'string' 
                ? config.systemInstruction 
                : config.systemInstruction?.parts?.[0]?.text || JSON.stringify(config.systemInstruction);
            messages.push({ role: 'system', content: sysText });
        }

        // Map Gemini contents format to OpenAI messages
        if (Array.isArray(contents)) {
            for (const item of contents) {
                const role = item.role === 'model' ? 'assistant' : 'user';
                const text = item.parts?.map((p: any) => p.text || '').join('') || 
                             (typeof item === 'string' ? item : '');
                if (text) {
                    messages.push({ role, content: text });
                }
            }
        }

        return messages;
    }

    async generateRawContent(contents: any[], config?: any): Promise<string> {
        try {
            const messages = this._convertContentsToMessages(contents, config);
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages,
                    model: this.primaryModel,
                    temperature: config?.temperature ?? 0.7,
                    enable_thinking: false,
                })
            });
            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || "";
            return rawContent.replace(THINKING_PATTERN, '').trim();
        } catch (e) {
            console.error("Local Raw content failed:", e);
            throw e;
        }
    }

    async *generateRawStream(contents: any[], config?: any) {
        const messages = this._convertContentsToMessages(contents, config);
        
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages,
                    model: this.primaryModel,
                    temperature: config?.temperature ?? 0.9,
                    stream: true,
                    enable_thinking: true,
                })
            });

        if (!response.body) throw new Error("Local Raw Stream no body returned");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let isThinking = false;
        let hasStarted = false; // Add hasStarted flag
        let partialTag = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n');

            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (dataStr === '[DONE]') break;
                    
                    try {
                        const parsed = JSON.parse(dataStr);
                        const deltaObj = parsed.choices?.[0]?.delta;
                        if (deltaObj?.content) {
                            let chunkText = deltaObj.content;
                            
                            // Handle potential split tags across chunks
                            const fullContent = partialTag + chunkText;
                            partialTag = '';

                            let currentContent = fullContent;
                            while (currentContent.length > 0) {
                                    if (!isThinking) {
                                        const thinkStartIdx = currentContent.indexOf('<think>');
                                        const thinkEndIdx = currentContent.indexOf('</think>');

                                        // NEW: Implied Start logic
                                        if (!hasStarted && (thinkStartIdx === -1 || thinkStartIdx > 0)) {
                                            isThinking = true;
                                            hasStarted = true;
                                            continue;
                                        }
                                        hasStarted = true;

                                        // If we see an end tag before a start tag, it means we started in a thinking block without an opening tag
                                        if (thinkEndIdx !== -1 && (thinkStartIdx === -1 || thinkEndIdx < thinkStartIdx)) {
                                            const thought = currentContent.substring(0, thinkEndIdx);
                                            if (thought) yield { text: '', thought };
                                            isThinking = false;
                                            currentContent = currentContent.substring(thinkEndIdx + 8);
                                            continue;
                                        }

                                    if (thinkStartIdx !== -1) {
                                        const before = currentContent.substring(0, thinkStartIdx);
                                        if (before) yield { text: before };
                                        isThinking = true;
                                        currentContent = currentContent.substring(thinkStartIdx + 7);
                                    } else {
                                        // Still check for partial tags
                                        const lastLess = currentContent.lastIndexOf('<');
                                        if (lastLess !== -1 && ('<think>'.startsWith(currentContent.substring(lastLess)) || '</think>'.startsWith(currentContent.substring(lastLess)))) {
                                            partialTag = currentContent.substring(lastLess);
                                            const before = currentContent.substring(0, lastLess);
                                            if (before) yield { text: before };
                                            break;
                                        } else {
                                            yield { text: currentContent };
                                            break;
                                        }
                                    }
                                } else {
                                    const thinkEndIdx = currentContent.indexOf('</think>');
                                    if (thinkEndIdx !== -1) {
                                        const thought = currentContent.substring(0, thinkEndIdx);
                                        if (thought) yield { text: '', thought };
                                        isThinking = false;
                                        currentContent = currentContent.substring(thinkEndIdx + 8);
                                    } else {
                                        const lastLess = currentContent.lastIndexOf('<');
                                        if (lastLess !== -1 && '</think>'.startsWith(currentContent.substring(lastLess))) {
                                            partialTag = currentContent.substring(lastLess);
                                            const thought = currentContent.substring(0, lastLess);
                                            if (thought) yield { text: '', thought };
                                            break;
                                        } else {
                                            yield { text: '', thought: currentContent };
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (parsed.usage) {
                            yield { text: '', usageMetadata: { totalTokenCount: parsed.usage.total_tokens } };
                        }
                    } catch (err) {}
                }
            }
        }
    }

    async embedText(text: string): Promise<number[]> {
        if (!text || text.length < 5) return []; 
        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: text,
                    // text-generation-webui/llama.cpp handles the model resolution mostly, but pass standard if needed
                    model: "sentence-transformers/all-mpnet-base-v2" 
                })
            });
            const data = await response.json();
            return data.data?.[0]?.embedding || [];
        } catch (e) {
            console.error("Local Embedding failed:", e);
            throw e;
        }
    }

    async extractCanonData(textChunk: string): Promise<CanonExtractionResult> {
        if (!textChunk || textChunk.length < 100) return { rules: [], character_profiles: [], relationships: [], locations: [], factions: [] };

        const prompt = `Phân tích đoạn văn bản thô từ tiểu thuyết gốc sau đây và trích xuất dữ liệu cốt lõi (Canon) để làm cơ sở dữ liệu cho Fanfiction (Existence Lock).
        Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
        
        Bạn chỉ được phép trả về JSON. Không có bất kỳ văn bản giải thích nào khác ngoài JSON.
        Cấu trúc JSON yêu cầu:
        {
           "rules": ["quy tắc 1", ...],
           "character_profiles": [{"name": "tên", "core": "tính cách", "traits": []}],
           "relationships": ["tương tác 1", ...],
           "locations": ["whitelist địa danh", ...],
           "factions": ["whitelist môn phái", ...]
        }

        Văn bản gốc:
        ${textChunk.substring(0, 15000)}...`;

        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an extraction AI. You only output valid JSON code blocks without thinking.' },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.1,
                    enable_thinking: false
                })
            }, 300000); // 5 minutes for extraction
            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content || "{}";
            const cleanedText = answer.replace(THINKING_PATTERN, '').trim();
            const result = cleanAndParseJSON(cleanedText);
            return {
                rules: result.rules || [],
                character_profiles: result.character_profiles || [],
                relationships: result.relationships || [],
                locations: result.locations || [],
                factions: result.factions || []
            };
        } catch (e) {
            console.error("Local Canon extraction failed", e);
            throw e;
        }
    }

    async *generateStoryStream(
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
    ): AsyncGenerator<{ text: string; thought?: string; usageMetadata: any; storyContinuePlan?: any; raw?: string }> {
        const prompt = sachHiepPromptBuilderService.buildContinuePrompt(
            immediateContext, rollingSummaries, worldBible, augmentedContext,
            synopsis, characters, worldLore, userInstruction, pronounStyle, currentChapterTitle, this.primaryModel
        );

        const systemInstruction = sachHiepPromptBuilderService.buildSystemInstruction(
            genre, worldBible, pov, pronounStyle, writingStyle, negativePrompt, nsfw, sourceUrl, entityRegistry
        );

        // Map thinking logic
        const thinkingBudget = 24576;
        const reasoningEffort = mapThinkingBudgetToEffort(thinkingBudget);

        try {
            const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.9,
                    top_p: 0.95,
                    stream: true,
                    enable_thinking: true,
                    reasoning_effort: reasoningEffort
                })
            });

            if (!response.body) throw new Error("Local Stream no body returned");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let isThinking = false;
            let hasStarted = false; // Add hasStarted flag
            let partialTag = '';
            let fullRawText = "";
            let lastStoryContent = "";
            let lastThoughtProcess = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n');

                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') break;
                        
                        try {
                            const parsed = JSON.parse(dataStr);
                            const deltaObj = parsed.choices?.[0]?.delta;
                            if (deltaObj?.content) {
                                let chunkText = deltaObj.content;
                                fullRawText += chunkText;
                                
                                // Handle potential split tags across chunks
                                const fullContent = partialTag + chunkText;
                                partialTag = '';

                                let currentContent = fullContent;
                                const usageMetadata = parsed.usage ? { totalTokenCount: parsed.usage.total_tokens } : null;

                                // Try to parse as JSON if it looks like it
                                if (fullRawText.trim().startsWith('{')) {
                                    try {
                                        const partial = partialParse(fullRawText);
                                        
                                        // Handle thought process (combined from parts)
                                        const p1_thought = partial.part1?.thought_process || "";
                                        const p2_thought = partial.part2?.thought_process || "";
                                        const p3_thought = partial.part3?.thought_process || "";
                                        const currentThought = p1_thought + (p2_thought ? "\n" + p2_thought : "") + (p3_thought ? "\n" + p3_thought : "");
                                        
                                        if (currentThought.length > lastThoughtProcess.length) {
                                            const delta = currentThought.substring(lastThoughtProcess.length);
                                            yield { text: '', thought: delta, usageMetadata, raw: fullRawText };
                                            lastThoughtProcess = currentThought;
                                        }

                                        // Handle story content (combined from parts)
                                        const p1_content = partial.part1?.part_story_content || "";
                                        const p2_content = partial.part2?.part_story_content || "";
                                        const p3_content = partial.part3?.part_story_content || "";
                                        const currentStoryContent = p1_content + (p2_content ? "\n\n" + p2_content : "") + (p3_content ? "\n\n" + p3_content : "");
                                        
                                        if (currentStoryContent.length > lastStoryContent.length) {
                                            const delta = currentStoryContent.substring(lastStoryContent.length);
                                            yield { text: delta, usageMetadata, raw: fullRawText };
                                            lastStoryContent = currentStoryContent;
                                        }

                                        if (partial.story_continue_plan) {
                                            yield { text: '', storyContinuePlan: partial.story_continue_plan, usageMetadata, raw: fullRawText };
                                        }
                                        continue; // Skip the raw text yielding below
                                    } catch (e) {
                                        // Silent catch for partial parsing
                                    }
                                    // Always yield raw even if parsing fails or no new content
                                    yield { text: '', usageMetadata, raw: fullRawText };
                                    continue;
                                }

                                while (currentContent.length > 0) {
                                    if (!isThinking) {
                                        const thinkStartIdx = currentContent.indexOf('<think>');
                                        const thinkEndIdx = currentContent.indexOf('</think>');

                                        // NEW: Implied Start logic
                                        if (!hasStarted && (thinkStartIdx === -1 || thinkStartIdx > 0)) {
                                            isThinking = true;
                                            hasStarted = true;
                                            continue;
                                        }
                                        hasStarted = true;

                                        // If we see an end tag before a start tag, it means we started in a thinking block without an opening tag
                                        if (thinkEndIdx !== -1 && (thinkStartIdx === -1 || thinkEndIdx < thinkStartIdx)) {
                                            const thought = currentContent.substring(0, thinkEndIdx);
                                            if (thought) yield { text: '', thought, usageMetadata, raw: fullRawText };
                                            isThinking = false;
                                            currentContent = currentContent.substring(thinkEndIdx + 8);
                                            continue;
                                        }

                                        if (thinkStartIdx !== -1) {
                                            const before = currentContent.substring(0, thinkStartIdx);
                                            if (before) yield { text: before, usageMetadata, raw: fullRawText };
                                            isThinking = true;
                                            currentContent = currentContent.substring(thinkStartIdx + 7);
                                        } else {
                                            const lastLess = currentContent.lastIndexOf('<');
                                            if (lastLess !== -1 && ('<think>'.startsWith(currentContent.substring(lastLess)) || '</think>'.startsWith(currentContent.substring(lastLess)))) {
                                                partialTag = currentContent.substring(lastLess);
                                                const before = currentContent.substring(0, lastLess);
                                                if (before) yield { text: before, usageMetadata, raw: fullRawText };
                                                break;
                                            } else {
                                                yield { text: currentContent, usageMetadata, raw: fullRawText };
                                                break;
                                            }
                                        }
                                    } else {
                                        const thinkEndIdx = currentContent.indexOf('</think>');
                                        if (thinkEndIdx !== -1) {
                                            const thought = currentContent.substring(0, thinkEndIdx);
                                            if (thought) yield { text: '', thought, usageMetadata, raw: fullRawText };
                                            isThinking = false;
                                            currentContent = currentContent.substring(thinkEndIdx + 8);
                                        } else {
                                            const lastLess = currentContent.lastIndexOf('<');
                                            if (lastLess !== -1 && '</think>'.startsWith(currentContent.substring(lastLess))) {
                                                partialTag = currentContent.substring(lastLess);
                                                const thought = currentContent.substring(0, lastLess);
                                                if (thought) yield { text: '', thought, usageMetadata, raw: fullRawText };
                                                break;
                                            } else {
                                                yield { text: '', thought: currentContent, usageMetadata, raw: fullRawText };
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (err) {}
                    }
                }
            }
        } catch (e) {
            console.error("Local Story generation failed", e);
            throw e;
        }
    }

    async *rewriteContentStream(
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
    ): AsyncGenerator<{ text: string; thought?: string; usageMetadata: any; storyContinuePlan?: any; raw?: string }> {
        const prompt = sachHiepPromptBuilderService.buildRewritePrompt(
            originalText, instruction, contextData.characters, contextData.worldLore,
            contextData.worldBible, contextData.synopsis, contextData.pronounStyle
        );

        const systemInstruction = sachHiepPromptBuilderService.buildSystemInstruction(
            contextData.genre, contextData.worldBible, contextData.pov, contextData.pronounStyle, 
            contextData.writingStyle, contextData.negativePrompt, contextData.nsfw, 
            contextData.sourceUrl, contextData.entityRegistry
        );

        const thinkingBudget = 16384;
        const reasoningEffort = mapThinkingBudgetToEffort(thinkingBudget);

        try {
            const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.7,
                    top_p: 0.95,
                    stream: true,
                    enable_thinking: true,
                    reasoning_effort: reasoningEffort
                })
            });

            if (!response.body) throw new Error("Local Rewrite Stream no body returned");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let isThinking = false;
            let hasStarted = false; // Add hasStarted flag
            let partialTag = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n');

                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') break;
                        
                        try {
                            const parsed = JSON.parse(dataStr);
                            const deltaObj = parsed.choices?.[0]?.delta;
                            if (deltaObj?.content) {
                                let chunkText = deltaObj.content;
                                
                                // Handle potential split tags across chunks
                                const fullContent = partialTag + chunkText;
                                partialTag = '';

                                let currentContent = fullContent;
                                const usageMetadata = parsed.usage ? { totalTokenCount: parsed.usage.total_tokens } : null;

                                while (currentContent.length > 0) {
                                    if (!isThinking) {
                                        const thinkStartIdx = currentContent.indexOf('<think>');
                                        const thinkEndIdx = currentContent.indexOf('</think>');

                                        // NEW: Implied Start logic
                                        if (!hasStarted && (thinkStartIdx === -1 || thinkStartIdx > 0)) {
                                            isThinking = true;
                                            hasStarted = true;
                                            continue;
                                        }
                                        hasStarted = true;

                                        if (thinkEndIdx !== -1 && (thinkStartIdx === -1 || thinkEndIdx < thinkStartIdx)) {
                                            const thought = currentContent.substring(0, thinkEndIdx);
                                            if (thought) yield { text: '', thought, usageMetadata };
                                            isThinking = false;
                                            currentContent = currentContent.substring(thinkEndIdx + 8);
                                            continue;
                                        }

                                        if (thinkStartIdx !== -1) {
                                            const before = currentContent.substring(0, thinkStartIdx);
                                            if (before) yield { text: before, usageMetadata };
                                            isThinking = true;
                                            currentContent = currentContent.substring(thinkStartIdx + 7);
                                        } else {
                                            const lastLess = currentContent.lastIndexOf('<');
                                            if (lastLess !== -1 && ('<think>'.startsWith(currentContent.substring(lastLess)) || '</think>'.startsWith(currentContent.substring(lastLess)))) {
                                                partialTag = currentContent.substring(lastLess);
                                                const before = currentContent.substring(0, lastLess);
                                                if (before) yield { text: before, usageMetadata };
                                                break;
                                            } else {
                                                yield { text: currentContent, usageMetadata };
                                                break;
                                            }
                                        }
                                    } else {
                                        const thinkEndIdx = currentContent.indexOf('</think>');
                                        if (thinkEndIdx !== -1) {
                                            const thought = currentContent.substring(0, thinkEndIdx);
                                            if (thought) yield { text: '', thought, usageMetadata };
                                            isThinking = false;
                                            currentContent = currentContent.substring(thinkEndIdx + 8);
                                        } else {
                                            const lastLess = currentContent.lastIndexOf('<');
                                            if (lastLess !== -1 && '</think>'.startsWith(currentContent.substring(lastLess))) {
                                                partialTag = currentContent.substring(lastLess);
                                                const thought = currentContent.substring(0, lastLess);
                                                if (thought) yield { text: '', thought, usageMetadata };
                                                break;
                                            } else {
                                                yield { text: '', thought: currentContent, usageMetadata };
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (err) {}
                    }
                }
            }
        } catch (e) {
            console.error("Local Rewrite generation failed", e);
            throw e;
        }
    }

    async extractCharacters(text: string, pronounStyle: string): Promise<Character[]> {
        const systemInstruction = sachHiepPromptBuilderService.buildExtractionSystemInstruction(pronounStyle);
        const prompt = `Phân tích văn bản và trích xuất danh sách JSON các nhân vật quan trọng.
        Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
        Bạn chỉ được trả về JSON thô. Không có văn bản giải thích.
        Danh sách định dạng JSON:
        {"characters": [{"name": "", "role": "", "description": "", "appearance": {"general": "", "face": "", "clothing": ""}, "core_personality": ""}]}
        
        Văn bản cần phân tích:\n${text}`;
        
        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: `${systemInstruction}. Only return JSON.` },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.1,
                    enable_thinking: false
                })
            }, 300000); // 5 minutes for character extraction
            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content || "{}";
            const cleanedText = answer.replace(THINKING_PATTERN, '').trim();
            const parsed = cleanAndParseJSON(cleanedText);
            const list = parsed.characters || (Array.isArray(parsed) ? parsed : []);
            
            if (!Array.isArray(list)) return [];

            return list.map((c: any, index: number) => ({
                ...c,
                id: `char_${Date.now()}_${index}`,
                traits: c.traits || []
            }));
        } catch (e) {
            console.error("Local Character Extraction failed", e);
            throw e;
        }
    }

    async ingestFanficData(fandomName: string, url: string): Promise<{ setting: string; characters: Character[] }> {
        // Here we map tool calls
        let prompt = `Nghiên cứu fandom/series "${fandomName}"`;
        if (url && url.length > 5) prompt += ` cũng như chủ đề Wiki tại URL này: "${url}"`;
        prompt += `. \nNhiệm vụ: Tóm tắt xây dựng thế giới/truyền thuyết bằng tiếng Việt (trong mục 'setting'). Trích xuất danh sách nhân vật dưới dạng JSON. Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE). Nếu cần, chỉ sử dụng định dạng google_search để tìm kiếm, nếu không hãy tổng hợp từ dữ liệu huấn luyện.`;

        const toolDef = {
            type: "function",
            function: {
                name: "googleSearch",
                description: "Search google for fandom info",
                parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
            }
        };

        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: `Output JSON strictly: {"setting": "...", "characters": [{"name": "...", "role": "...", "description": "...", "core_personality": "..."}]}` },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.1,
                    tools: [toolDef],
                    enable_thinking: true, // We allow thinking before they fire the JSON or tool
                    reasoning_effort: "low"
                })
            });
            const data = await response.json();
            const msg = data.choices?.[0]?.message || {};
            
            // If they tool_call, mock the response since Local typically requires a round trip to execute
            // For now, if finish_reason = tool_calls, we will just use their knowledge base because our frontend isn't executing local scripts for google search
            let answer = msg.content || "{}";
            if (msg.tool_calls && !answer) {
                 console.log("Local LLM attempted Tool Call: ", msg.tool_calls);
                 // Fallback prompt since we won't round trip the exact python search here
                 const response2 = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: `Output JSON strictly: {"setting": "...", "characters": []} . Use your own knowledge for ${fandomName}.` },
                        ],
                        model: this.primaryModel,
                        temperature: 0.3
                    })
                });
                const data2 = await response2.json();
                answer = data2.choices?.[0]?.message?.content || "{}";
            }

            const cleanedText = answer.replace(THINKING_PATTERN, '').trim();
            const parsedData = cleanAndParseJSON(cleanedText);
            
            const characters = Array.isArray(parsedData.characters) 
                ? parsedData.characters.map((c: any, index: number) => ({
                    ...c,
                    id: `char_fanfic_${Date.now()}_${index}`,
                    traits: c.traits || [],
                    appearance: c.appearance || { general: "Chưa rõ", face: "", body: "", hair: "", clothing: "" },
                    core_personality: c.core_personality || "Chưa rõ",
                    personality: c.core_personality || "",
                }))
                : [];

            return {
                setting: parsedData.setting || "",
                characters: characters
            };
        } catch (e) {
            console.error("Local Fanfic ingestion failed", e);
            throw e;
        }
    }

    async summarize(text: string, pronounStyle: string): Promise<string> {
        const systemInstruction = sachHiepPromptBuilderService.buildSummarySystemInstruction(pronounStyle);
        const prompt = `Hãy đọc văn bản sau và tạo bản tóm tắt nén cho AI, tuân thủ nghiêm ngặt hệ thống xưng hô. Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).\n\nVăn bản:\n${text}`;
        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.3,
                    enable_thinking: true,
                    reasoning_effort: "low"
                })
            }, 180000); // 3 minutes for summary
            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content || "";
            return answer.replace(THINKING_PATTERN, '').trim();
        } catch (e) {
            console.error("Local Sumarize failed", e);
            throw e;
        }
    }

    async generateStoryBible(formData: any, sourceText?: string): Promise<import('../../types').StoryBible> {
        const hasInitialChars = Array.isArray(formData.initialCharacters) && formData.initialCharacters.length > 0;
        let prompt = `Vui lòng đọc thông tin sau và trả về một Story Bible dưới định dạng JSON. Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
        
        【Thông tin đầu vào】
        Tiêu đề: ${formData.title}
        Thể loại: ${formData.genre}
        Dàn ý/Cảm hứng: ${formData.synopsis}
        Bối cảnh: ${formData.setting}
        `;

        if (hasInitialChars) {
            prompt += `\n【DANH SÁCH NHÂN VẬT ĐÃ KHÓA - CẤM TỰ BỊA ĐẶT THÊM NHÂN VẬT MỚI】\n`;
            formData.initialCharacters.forEach((c: any) => {
                prompt += `- Tên: ${c.name}, Vai: ${c.role}, Loại: ${c.character_type}, Tính cách: ${c.core}. Ngoại hình: ${c.appearance || ''}\n`;
            });
            prompt += `BẮT BUỘC: Giữ nguyên các nhân vật trên trong trường chars của JSON, không được tạo thêm bất kỳ nhân vật nào khác!\n`;
        }

        if (sourceText) {
            prompt += `\n【Trích đoạn gốc】\n${sourceText}\n`;
        }

        prompt += `
        Vui lòng trích xuất và tích hợp các thông tin trên, trả về định dạng JSON, bao gồm các trường sau:
        - chars: Mảng nhân vật, mỗi nhân vật bao gồm name (tên), role (vai trò, ví dụ: nam chính/nữ chính/mỹ phụ), core (tính cách/đặc điểm cốt lõi trong một câu).
        - world: Mô tả ngắn gọn về thiết lập thế giới.
        - rules: Mô tả ngắn gọn về các quy tắc cốt lõi hoặc điều cấm kỵ.
        - arc: Mục tiêu hoặc trạng thái ngắn gọn của chương truyện hiện tại.
        - chapter_cores: Mảng các sự kiện cốt lõi của chương, mỗi phần tử chứa ch (số chương) và core (sự kiện cốt lõi). Ban đầu là một mảng rỗng [].
        `;

        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a story planner. Output JSON strictly.' },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.1,
                    response_format: { type: "json_object" },
                    enable_thinking: true,
                    reasoning_effort: "low"
                })
            }, 300000);
            
            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content || "{}";
            const cleanedText = answer.replace(THINKING_PATTERN, '').trim();
            const parsed = cleanAndParseJSON(cleanedText);
            
            if (hasInitialChars) {
                parsed.chars = formData.initialCharacters.map((c: any) => ({
                    name: c.name,
                    role: c.role,
                    core: `${c.core}. Ngoại hình: ${c.appearance || ''}`.trim(),
                    character_type: c.character_type || 'npc'
                }));
            }
            return parsed;
        } catch (e) {
            console.error("generateStoryBible failed", e);
            const fallbackChars = hasInitialChars ? formData.initialCharacters.map((c: any) => ({
                name: c.name,
                role: c.role,
                core: `${c.core}. Ngoại hình: ${c.appearance || ''}`.trim(),
                character_type: c.character_type || 'npc'
            })) : [];
            return { chars: fallbackChars, world: formData.setting || "", rules: "", arc: formData.synopsis || "", chapter_cores: [] };
        }
    }

    async updateStoryBible(chapterContent: string): Promise<{ chapter_core: string, new_chars?: import('../../types').StoryBibleChar[], arc_update?: string }> {
        const prompt = `Đọc nội dung chương vừa viết xong sau đây. Vui lòng trả về định dạng JSON, trích xuất các sự kiện cốt lõi của chương này, phát hiện nhân vật mới (nếu có) và cập nhật trạng thái chương hiện tại (nếu có thay đổi lớn). Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
        
        【Nội dung chương】
        ${chapterContent}
        `;

        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a story analyzer. Output JSON strictly.' },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.1,
                    response_format: { type: "json_object" },
                    enable_thinking: true,
                    reasoning_effort: "low"
                })
            }, 180000);
            
            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content || "{}";
            const cleanedText = answer.replace(THINKING_PATTERN, '').trim();
            return cleanAndParseJSON(cleanedText);
        } catch (e) {
            console.error("updateStoryBible failed", e);
            return { chapter_core: "" };
        }
    }

    async *generateSachHiepStoryStream(
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
    ): AsyncGenerator<{ text: string; thought?: string; usageMetadata: any; storyContinuePlan?: any; raw?: string }> {
        
        const systemInstruction = sachHiepPromptBuilderService.buildSystemInstruction(
            genre, storyBible.world, pov, pronounStyle, writingStyle, negativePrompt, nsfw
        );

        const prompt = sachHiepPromptBuilderService.buildContinuePrompt(
            recentContext,
            oldCores,
            storyBible.world,
            "", // augmentedContext
            storyBible.arc, // synopsis
            [], // characters
            [], // worldLore
            userInstruction,
            pronounStyle,
            currentChapterTitle,
            modelName || "local-llm"
        );

        const thinkingBudget = 24576;
        const reasoningEffort = mapThinkingBudgetToEffort(thinkingBudget);

        try {
            const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.9,
                    top_p: 0.95,
                    response_format: { type: "json_object" },
                    enable_thinking: true,
                    reasoning_effort: reasoningEffort
                })
            });

            if (!response.ok) {
                throw new Error(`Local LLM API error: ${response.statusText}`);
            }

            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content || "{}";
            const result = cleanAndParseJSON(answer);
            
            const usageMetadata = data.usage ? { totalTokenCount: data.usage.total_tokens } : null;

            // Handle thought process (combined from parts)
            const p1_thought = result.part1?.thought_process || "";
            const p2_thought = result.part2?.thought_process || "";
            const p3_thought = result.part3?.thought_process || "";
            const combinedThought = p1_thought + (p2_thought ? "\n" + p2_thought : "") + (p3_thought ? "\n" + p3_thought : "");
            
            if (combinedThought) {
                yield { text: '', thought: combinedThought, usageMetadata, raw: answer };
            }

            // Handle story content (combined from parts)
            const p1_content = result.part1?.part_story_content || "";
            const p2_content = result.part2?.part_story_content || "";
            const p3_content = result.part3?.part_story_content || "";
            const combinedContent = p1_content + (p2_content ? "\n\n" + p2_content : "") + (p3_content ? "\n\n" + p3_content : "");

            if (combinedContent) {
                yield { text: combinedContent, usageMetadata, raw: answer };
            }

            if (result.story_continue_plan) {
                yield { text: '', usageMetadata, storyContinuePlan: result.story_continue_plan, raw: answer };
            }

        } catch (error) {
            console.error("Local LLM story generation failed", error);
            throw error;
        }
    }
}
