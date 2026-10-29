import { Character, EntityRegistry } from "../../types";
import { promptBuilderService } from "../../narrative/prompting/narrativePromptAssembler";
import { AIProvider } from "./AIProviderInterface";
import { defaultAIConfig } from "./AIConfig";
import { CanonExtractionResult } from "../aiService";

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

export class LocalLLMProvider implements AIProvider {
    private baseUrl: string;
    private primaryModel: string;
    private get apiConfig() { return { baseUrl: this.baseUrl, model: this.primaryModel }; }

    constructor(baseUrl: string = defaultAIConfig.localBaseUrl, model: string = defaultAIConfig.localModel) {
        this.baseUrl = baseUrl;
        this.primaryModel = model;
    }

    async generateContent(prompt: string, useAux: boolean = false, config?: any): Promise<string> {
        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    model: this.primaryModel,
                    temperature: config?.temperature ?? 0.7,
                    response_format: config?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
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
        
        Bạn chỉ được phép trả về JSON. Không có bất kỳ text nào khác ngoài JSON.
        Cấu trúc JSON yêu cầu:
        {
           "rules": ["quy tắc 1", ...],
           "character_profiles": [{"name": "Tên", "core": "Tính cách", "traits": []}],
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
    ) {
        const prompt = promptBuilderService.buildContinuePrompt(
            immediateContext, rollingSummaries, worldBible, augmentedContext,
            synopsis, characters, worldLore, userInstruction, pronounStyle, currentChapterTitle, this.primaryModel
        );

        const systemInstruction = promptBuilderService.buildSystemInstruction(
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

                                        // If we see an end tag before a start tag, it means we started in a thinking block without an opening tag
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
    ) {
        const prompt = promptBuilderService.buildRewritePrompt(
            originalText, instruction, contextData.characters, contextData.worldLore,
            contextData.worldBible, contextData.synopsis, contextData.pronounStyle
        );

        const systemInstruction = promptBuilderService.buildSystemInstruction(
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
        const systemInstruction = promptBuilderService.buildExtractionSystemInstruction(pronounStyle);
        const prompt = `Phân tích văn bản và trích xuất danh sách JSON các nhân vật quan trọng. 
        Bạn CHỈ trả về JSON nguyên gốc. Không text giải thích.
        JSON format list:
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
                description: "Tìm kiếm thông tin fandom trên Google",
                parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
            }
        };

        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: `Xuất JSON nghiêm ngặt: {"setting": "...", "characters": [{"name": "...", "role": "...", "description": "...", "core_personality": "..."}]}` },
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
                            { role: 'system', content: `Xuất JSON nghiêm ngặt: {"setting": "...", "characters": []} . Sử dụng kiến thức của bạn về ${fandomName}.` },
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
        const systemInstruction = promptBuilderService.buildSummarySystemInstruction(pronounStyle);
        const prompt = `Hãy đọc văn bản sau và tạo bản tóm tắt nén cho AI, tuân thủ đúng hệ thống xưng hô.\n\nVăn bản:\n${text}`;
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
}
