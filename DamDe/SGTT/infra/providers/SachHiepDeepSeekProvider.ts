import { Character, EntityRegistry } from "../../types";
import { SACH_HIEP_COT_PROMPT, sachHiepPromptBuilderService } from "../../narrative/prompting/sachHiepPromptAssembler";
import { AIProvider } from "./AIProviderInterface";
import { AIConfig, defaultAIConfig } from "./AIConfig";
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
        console.error("[DeepSeek] JSON Parse Error:", e, "Original Text:", text);
        try {
            return (partialParse as any)(cleanText) || [];
        } catch {
            return [];
        }
    }
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 120000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } catch (e: any) {
        if (e.name === 'AbortError') {
            throw new Error(`Kết nối tới DeepSeek quá thời gian (${timeoutMs / 1000}s)`);
        }
        throw e;
    } finally {
        clearTimeout(id);
    }
};

export class SachHiepDeepSeekProvider implements AIProvider {
    private apiKey: string;
    private baseUrl: string;
    private primaryModel: string;
    private temperature: number;
    private maxTokens: number;

    constructor(config?: Partial<AIConfig>) {
        this.apiKey = config?.deepseekApiKey ?? defaultAIConfig.deepseekApiKey;
        this.baseUrl = (config?.deepseekBaseUrl ?? defaultAIConfig.deepseekBaseUrl).replace(/\/+$/, '');
        this.primaryModel = config?.deepseekModel === 'custom' 
            ? (config?.deepseekCustomModel || 'deepseek-chat') 
            : (config?.deepseekModel || defaultAIConfig.deepseekModel);
        this.temperature = config?.deepseekTemperature ?? defaultAIConfig.deepseekTemperature ?? 1.0;
        this.maxTokens = config?.deepseekMaxTokens ?? defaultAIConfig.deepseekMaxTokens ?? 4096;
    }

    private getEndpoint(path: string = '/chat/completions'): string {
        const cleanBase = this.baseUrl.replace(/\/+$/, '');
        if (cleanBase.endsWith('/v1')) {
            return `${cleanBase}${path.startsWith('/') ? path : '/' + path}`;
        }
        return `${cleanBase}/v1${path.startsWith('/') ? path : '/' + path}`;
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey && this.apiKey.trim()) {
            headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
        }
        return headers;
    }

    /**
     * Test connection to DeepSeek API with latency and status feedback
     */
    public static async testConnection(
        apiKey: string, 
        baseUrl: string = 'https://api.deepseek.com', 
        model: string = 'deepseek-chat'
    ): Promise<{ success: boolean; latencyMs: number; message: string; reply?: string }> {
        const startTime = performance.now();
        const cleanBase = baseUrl.trim().replace(/\/+$/, '');
        const endpoint = cleanBase.endsWith('/v1') 
            ? `${cleanBase}/chat/completions` 
            : `${cleanBase}/v1/chat/completions`;

        if (!apiKey || !apiKey.trim()) {
            return {
                success: false,
                latencyMs: 0,
                message: 'Vui lòng nhập DeepSeek API Key trước khi kiểm tra!'
            };
        }

        try {
            const res = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: model || 'deepseek-chat',
                    messages: [
                        { role: 'user', content: 'Ping test. Hãy trả lời ngắn đúng 5 từ: Kết nối DeepSeek thành công!' }
                    ],
                    max_tokens: 30
                })
            }, 20000);

            const latencyMs = Math.round(performance.now() - startTime);

            if (!res.ok) {
                let errDetail = '';
                try {
                    const errJson = await res.json();
                    errDetail = errJson.error?.message || JSON.stringify(errJson);
                } catch {
                    errDetail = await res.text();
                }

                if (res.status === 401) {
                    return {
                        success: false,
                        latencyMs,
                        message: `Lỗi xác thực (401 Unauthorized): API Key không đúng. Chi tiết: ${errDetail}`
                    };
                }
                if (res.status === 402) {
                    return {
                        success: false,
                        latencyMs,
                        message: `Tài khoản DeepSeek chưa có số dư (402 Insufficient Balance): Vui lòng nạp tiền vào tài khoản platform.deepseek.com.`
                    };
                }
                if (res.status === 429) {
                    return {
                        success: false,
                        latencyMs,
                        message: `Vượt hạn mức yêu cầu (429 Rate Limit). Vui lòng thử lại sau giây lát.`
                    };
                }

                return {
                    success: false,
                    latencyMs,
                    message: `Lỗi kết nối HTTP ${res.status}: ${errDetail || res.statusText}`
                };
            }

            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || 'OK';

            return {
                success: true,
                latencyMs,
                message: `Kết nối thành công tới mô hình ${model}!`,
                reply: reply.trim()
            };
        } catch (err: any) {
            const latencyMs = Math.round(performance.now() - startTime);
            return {
                success: false,
                latencyMs,
                message: `Không thể kết nối đến ${endpoint}. Lỗi: ${err.message || String(err)}`
            };
        }
    }

    async generateContent(prompt: string, useAux: boolean = false, config?: any): Promise<string> {
        try {
            const response = await fetchWithTimeout(this.getEndpoint('/chat/completions'), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    model: this.primaryModel,
                    temperature: config?.temperature ?? this.temperature,
                    max_tokens: config?.maxTokens ?? this.maxTokens
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`DeepSeek API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || "";
            return rawContent.replace(THINKING_PATTERN, '').trim();
        } catch (e) {
            console.error("[DeepSeek] Generate content failed:", e);
            throw e;
        }
    }

    private _convertContentsToMessages(contents: any[], config?: any): any[] {
        const messages: any[] = [];
        
        if (config?.systemInstruction) {
            const sysText = typeof config.systemInstruction === 'string' 
                ? config.systemInstruction 
                : config.systemInstruction?.parts?.[0]?.text || JSON.stringify(config.systemInstruction);
            messages.push({ role: 'system', content: sysText });
        }

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
            const response = await fetchWithTimeout(this.getEndpoint('/chat/completions'), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    messages,
                    model: this.primaryModel,
                    temperature: config?.temperature ?? this.temperature,
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`DeepSeek API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || "";
            return rawContent.replace(THINKING_PATTERN, '').trim();
        } catch (e) {
            console.error("[DeepSeek] Raw content failed:", e);
            throw e;
        }
    }

    async *generateRawStream(contents: any[], config?: any) {
        const messages = this._convertContentsToMessages(contents, config);
        
        const response = await fetch(this.getEndpoint('/chat/completions'), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                messages,
                model: this.primaryModel,
                temperature: config?.temperature ?? this.temperature,
                stream: true,
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`DeepSeek Stream Error (${response.status}): ${errText}`);
        }

        if (!response.body) throw new Error("DeepSeek Raw Stream returned no body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

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
                        
                        // Handle native reasoning_content from DeepSeek-R1
                        if (deltaObj?.reasoning_content) {
                            yield { text: '', thought: deltaObj.reasoning_content };
                        }
                        
                        if (deltaObj?.content) {
                            yield { text: deltaObj.content };
                        }

                        if (parsed.usage) {
                            yield { text: '', usageMetadata: { totalTokenCount: parsed.usage.total_tokens } };
                        }
                    } catch {}
                }
            }
        }
    }

    async embedText(text: string): Promise<number[]> {
        // DeepSeek is a pure chat/reasoning LLM and does not provide an embedding endpoint.
        // Returning empty array gracefully allows narrative memory to rely on full recent chapters & Bible context.
        return [];
    }

    async extractCanonData(textChunk: string): Promise<CanonExtractionResult> {
        const prompt = `Phân tích đoạn văn bản sau và trích xuất dữ liệu cốt lõi:
        Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
        
        Bạn chỉ được phép trả về JSON hợp lệ. Không có bất kỳ văn bản giải thích nào khác ngoài JSON.
        Cấu trúc JSON yêu cầu:
        {
           "rules": ["quy tắc 1", ...],
           "character_profiles": [{"name": "tên", "core": "tính cách", "traits": []}],
           "relationships": ["tương tác 1", ...],
           "locations": ["địa danh", ...],
           "factions": ["môn phái / thế lực", ...]
        }

        Văn bản gốc:
        ${textChunk.substring(0, 15000)}...`;

        try {
            const response = await fetchWithTimeout(this.getEndpoint('/chat/completions'), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an extraction AI. You only output valid JSON code blocks without reasoning commentary.' },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.1,
                })
            }, 300000);

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`DeepSeek API Error: ${errText}`);
            }

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
            console.error("[DeepSeek] Canon extraction failed", e);
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

        const fullSystemInstruction = `${systemInstruction}\n\n${SACH_HIEP_COT_PROMPT}`;

        const messages: any[] = [
            { role: 'system', content: fullSystemInstruction },
            { role: 'user', content: prompt }
        ];

        const response = await fetch(this.getEndpoint('/chat/completions'), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                messages,
                model: this.primaryModel,
                temperature: this.temperature,
                stream: true,
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`DeepSeek Stream Error (${response.status}): ${errText}`);
        }

        if (!response.body) throw new Error("DeepSeek Stream returned no body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedRaw = '';

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

                        if (deltaObj?.reasoning_content) {
                            yield { text: '', thought: deltaObj.reasoning_content, usageMetadata: {} };
                        }

                        if (deltaObj?.content) {
                            const chunkText = deltaObj.content;
                            accumulatedRaw += chunkText;
                            yield { text: chunkText, usageMetadata: {}, raw: accumulatedRaw };
                        }

                        if (parsed.usage) {
                            yield { text: '', usageMetadata: { totalTokenCount: parsed.usage.total_tokens } };
                        }
                    } catch {}
                }
            }
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
            contextData.writingStyle, contextData.negativePrompt, contextData.nsfw, contextData.sourceUrl, contextData.entityRegistry
        );

        const messages = [
            { role: 'system', content: `${systemInstruction}\n\n${SACH_HIEP_COT_PROMPT}` },
            { role: 'user', content: prompt }
        ];

        const response = await fetch(this.getEndpoint('/chat/completions'), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                messages,
                model: this.primaryModel,
                temperature: this.temperature,
                stream: true,
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`DeepSeek Rewrite Error (${response.status}): ${err}`);
        }

        if (!response.body) throw new Error("DeepSeek Stream returned no body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

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

                        if (deltaObj?.reasoning_content) {
                            yield { text: '', thought: deltaObj.reasoning_content, usageMetadata: {} };
                        }

                        if (deltaObj?.content) {
                            yield { text: deltaObj.content, usageMetadata: {} };
                        }

                        if (parsed.usage) {
                            yield { text: '', usageMetadata: { totalTokenCount: parsed.usage.total_tokens } };
                        }
                    } catch {}
                }
            }
        }
    }

    async extractCharacters(text: string, pronounStyle: string): Promise<Character[]> {
        const prompt = `Phân tích văn bản và trích xuất danh sách JSON các nhân vật quan trọng. 
        Định dạng xưng hô bắt buộc: ${pronounStyle}
        Toàn bộ nội dung phân tích phải bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
        
        Trả về DUY NHẤT một mảng JSON với cấu trúc:
        [
          {
            "name": "Tên nhân vật",
            "role": "Nhân vật chính / Phụ / Phản diện",
            "personality": "Tính cách cốt lõi",
            "core_personality": "Tính cách đặc trưng nhất",
            "description": "Mô tả ngoại hình, tính cách, bối cảnh",
            "traits": ["Đặc điểm 1", "Đặc điểm 2"],
            "appearance": {
              "face": "Khuôn mặt",
              "body": "Thân hình",
              "clothing": "Trang phục"
            }
          }
        ]

        Văn bản:
        ${text.substring(0, 15000)}`;

        try {
            const response = await fetchWithTimeout(this.getEndpoint('/chat/completions'), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: sachHiepPromptBuilderService.buildExtractionSystemInstruction(pronounStyle) },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.1,
                })
            }, 300000);

            if (!response.ok) return [];

            const data = await response.json();
            const textResponse = data.choices?.[0]?.message?.content || "";
            const cleaned = textResponse.replace(THINKING_PATTERN, '').trim();
            const characters = cleanAndParseJSON(cleaned);
            
            return Array.isArray(characters) ? characters.map((c: any, index: number) => ({
                id: `char_${Date.now()}_${index}`,
                name: c.name || "Nhân vật",
                role: c.role || "Phụ",
                personality: c.personality || "",
                core_personality: c.core_personality || c.personality || "",
                description: c.description || "",
                traits: Array.isArray(c.traits) ? c.traits : [],
                appearance: c.appearance || {}
            })) : [];
        } catch (e) {
            console.error("[DeepSeek] Extract characters failed:", e);
            return [];
        }
    }

    async ingestFanficData(fandomName: string, url: string): Promise<{ setting: string; characters: Character[] }> {
        const prompt = `Phân tích tác phẩm Fandom "${fandomName}" (Tham khảo: ${url}) và cung cấp:
        1. Tóm tắt Bối cảnh, Hệ thống sức mạnh thế giới quan.
        2. Danh sách các nhân vật cốt lõi kèm tính cách, ngoại hình.

        Trả về JSON:
        {
          "setting": "Mô tả bối cảnh chi tiết...",
          "characters": [
            {
              "name": "Tên",
              "role": "Vai trò",
              "personality": "Tính cách",
              "description": "Mô tả",
              "traits": ["Đặc điểm"],
              "appearance": { "general": "Ngoại hình" }
            }
          ]
        }`;

        try {
            const response = await fetchWithTimeout(this.getEndpoint('/chat/completions'), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    model: this.primaryModel,
                    temperature: 0.2,
                })
            }, 300000);

            if (!response.ok) return { setting: "", characters: [] };

            const data = await response.json();
            const textResponse = data.choices?.[0]?.message?.content || "";
            const result = cleanAndParseJSON(textResponse.replace(THINKING_PATTERN, '').trim());

            return {
                setting: result.setting || "",
                characters: Array.isArray(result.characters) ? result.characters.map((c: any, idx: number) => ({
                    id: `fanfic_char_${Date.now()}_${idx}`,
                    name: c.name || "Nhân vật",
                    role: c.role || "Phụ",
                    personality: c.personality || "",
                    core_personality: c.personality || "",
                    description: c.description || "",
                    traits: c.traits || [],
                    appearance: c.appearance || {}
                })) : []
            };
        } catch (e) {
            console.error("[DeepSeek] Ingest fanfic data failed:", e);
            return { setting: "", characters: [] };
        }
    }

    async summarize(text: string, pronounStyle: string): Promise<string> {
        const prompt = `Hãy đọc đoạn văn sau và tạo một bản tóm tắt súc tích, lưu ý giữ nguyên các chi tiết then chốt, sự kiện chính, biến động cảm xúc và thiết lập xưng hô: ${pronounStyle}.
        
        Văn bản:
        ${text}`;

        try {
            const response = await fetchWithTimeout(this.getEndpoint('/chat/completions'), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: sachHiepPromptBuilderService.buildSummarySystemInstruction(pronounStyle) },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.3,
                })
            }, 180000);

            if (!response.ok) return "";

            const data = await response.json();
            const raw = data.choices?.[0]?.message?.content || "";
            return raw.replace(THINKING_PATTERN, '').trim();
        } catch (e) {
            console.error("[DeepSeek] Summarize failed:", e);
            return "";
        }
    }

    async generateStoryBible(formData: any, sourceText?: string): Promise<import('../../types').StoryBible> {
        const hasInitialChars = Array.isArray(formData.initialCharacters) && formData.initialCharacters.length > 0;
        const initialCharsText = hasInitialChars
            ? `\n\n### 🔒 DANH SÁCH NHÂN VẬT ĐÃ THIẾT LẬP (BẮT BUỘC KHÓA - TUYỆT ĐỐI KHÔNG CHẾ THÊM NHÂN VẬT MỚI):
Tác giả đã chỉ định sẵn danh sách nhân vật sau:
${formData.initialCharacters.map((c: any) => `- Tên: "${c.name}", Vai trò: "${c.role}", Phân loại: "${c.character_type}", Tính cách: "${c.core}". Ngoại hình: "${c.appearance || ''}"`).join('\n')}

QUY TẮC BẮT BUỘC:
1. Bạn PHẢI đưa TOÀN BỘ các nhân vật trên vào trường "chars" của JSON.
2. TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý BỊA ĐẶT THÊM BẤT KỲ NHÂN VẬT NÀO KHÁC trong "chars".
3. Thiết lập thế giới (world), quy tắc (rules) và đại cương (arc) PHẢI XOAY QUANH các nhân vật này.`
            : '';

        const prompt = `Bạn là biên tập viên văn học chuyên nghiệp về tiểu thuyết Sắc Hiệp và Đô Thị Hiện Đại.
Hãy tạo một bộ Story Bible hoàn chỉnh dựa trên thông tin sau:
- Tiêu đề: ${formData.title}
- Thể loại: ${formData.genre}
- Cảm hứng/Tóm tắt: ${formData.synopsis}
- Bối cảnh thiết lập: ${formData.setting || 'Chưa có'}
${sourceText ? `- Dữ liệu tác phẩm gốc: ${sourceText.substring(0, 10000)}...` : ''}
${initialCharsText}

YÊU CẦU: Trả về DUY NHẤT một chuỗi JSON hợp lệ không bọc trong markdown hay lời giải thích, với cấu trúc:
{
  "world": "Mô tả chi tiết bối cảnh đô thị, không gian sống, tầng lớp xã hội",
  "rules": "Các quy tắc cốt lõi của thế giới (xã hội đô thị, dục vọng, quy tắc ngầm, cấm kỵ)",
  "arc": "Dàn ý cốt truyện chính theo từng giai đoạn",
  "chars": [
    {
      "name": "Tên nhân vật",
      "role": "Nam chính / Nữ chính / Mỹ phụ / Nữ tổng tài",
      "core": "Tính cách cốt lõi, dục vọng, phong cách xưng hô",
      "state": "Mối quan hệ ban đầu"
    }
  ],
  "chapter_cores": []
}`;

        try {
            const response = await fetchWithTimeout(this.getEndpoint('/chat/completions'), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an expert story bible generator. Output valid JSON only.' },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.7,
                })
            }, 300000);

            if (!response.ok) {
                throw new Error(`DeepSeek API Error: ${response.statusText}`);
            }

            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || "{}";
            const cleaned = rawContent.replace(THINKING_PATTERN, '').trim();
            const parsed = cleanAndParseJSON(cleaned);

            let finalChars = Array.isArray(parsed.chars) && parsed.chars.length > 0 ? parsed.chars : [];
            if (hasInitialChars) {
                // If user defined characters, guarantee they exist in Story Bible
                finalChars = formData.initialCharacters.map((c: any) => ({
                    name: c.name,
                    role: c.role,
                    core: `${c.core}. Ngoại hình: ${c.appearance || ''}`.trim(),
                    character_type: c.character_type || 'npc'
                }));
            }

            return {
                world: parsed.world || formData.setting || "Thế giới Đô Thị Hiện Đại",
                rules: (parsed.rules || "Quy tắc đô thị hiện đại.") + (hasInitialChars ? " [QUY TẮC KHÓA NHÂN VẬT]: Tuyệt đối không tự ý chế thêm bất kỳ nhân vật có tên riêng nào khác ngoài danh sách đã khai báo." : ""),
                arc: parsed.arc || formData.synopsis || "Hành trình đô thị.",
                chars: finalChars,
                chapter_cores: []
            };
        } catch (e) {
            console.error("[DeepSeek] Generate Story Bible failed:", e);
            throw e;
        }
    }

    async updateStoryBible(chapterContent: string): Promise<{ chapter_core: string, new_chars?: import('../../types').StoryBibleChar[], arc_update?: string }> {
        const prompt = `Phân tích chương vừa viết dưới đây và trích xuất cập nhật cho Story Bible:
1. "chapter_core": Tóm tắt cực ngắn (1-2 câu) các sự kiện mấu chốt, bước tiến quan hệ / tu vi.
2. "new_chars": Danh sách nhân vật mới xuất hiện (nếu có): [{"name": "...", "role": "...", "core": "...", "state": "..."}].
3. "arc_update": Cập nhật diễn biến mạch truyện nếu có sự kiện lớn.

Nội dung chương:
${chapterContent.substring(0, 15000)}

Trả về JSON:
{
  "chapter_core": "...",
  "new_chars": [],
  "arc_update": "..."
}`;

        try {
            const response = await fetchWithTimeout(this.getEndpoint('/chat/completions'), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a literature assistant. Output valid JSON only.' },
                        { role: 'user', content: prompt }
                    ],
                    model: this.primaryModel,
                    temperature: 0.2,
                })
            }, 180000);

            if (!response.ok) return { chapter_core: "Chương đã hoàn thành." };

            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || "{}";
            const cleaned = rawContent.replace(THINKING_PATTERN, '').trim();
            const parsed = cleanAndParseJSON(cleaned);

            return {
                chapter_core: parsed.chapter_core || "Chương đã hoàn thành.",
                new_chars: Array.isArray(parsed.new_chars) ? parsed.new_chars : [],
                arc_update: parsed.arc_update || ""
            };
        } catch (e) {
            console.error("[DeepSeek] Update Story Bible failed:", e);
            return { chapter_core: "Chương đã hoàn thành." };
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
        const prompt = `### 📚 TÓM TẮT CỐT TRUYỆN TRƯỚC:
${oldCores || "Chưa có"}

### ⚡ THIẾT LẬP THẾ GIỚI & STORY BIBLE:
- Bối cảnh: ${storyBible?.world || 'Đô thị hiện đại'}
- Quy tắc: ${storyBible?.rules || 'Quy luật đô thị'}
- Đại cương: ${storyBible?.arc || 'Mạch truyện đô thị'}

### 👥 NHÂN VẬT THAM GIA:
${charSnippet || "Theo bối cảnh"}

### 🔒 QUY TẮC KHÓA NHÂN VẬT (BẮT BUỘC TUÂN THỦ):
- TUYỆT ĐỐI KHÔNG TỰ CHẾ THÊM NHÂN VẬT MỚI CÓ TÊN RIÊNG.
- Mọi tương tác, tình tiết chỉ xoay quanh các nhân vật đã được cung cấp ở trên.
- Nếu cần người qua đường, phục vụ bàn, tài xế... CHỈ DÙNG DANH XƯNG CHUNG (ví dụ: "người phục vụ", "tài xế taxi"), TUYỆT ĐỐI KHÔNG đặt tên riêng hay xây dựng tiểu sử cho họ.

### 📝 NGỮ CẢNH ĐOẠN TRƯỚC (ĐỌC KỸ ĐỂ NỐI TIẾP LIỀN MẠCH):
${recentContext || "Bắt đầu chương mới."}

### 🎬 CHỈ ĐẠO CỦA TÁC GIẢ:
${userInstruction ? `YÊU CẦU ĐẶC BIỆT: ${userInstruction}` : "Tiếp tục diễn biến câu chuyện tự nhiên, gợi tình, hấp dẫn, chi tiết theo đúng phong cách sắc hiệp đô thị."}

Chương hiện tại: ${currentChapterTitle || "Chương mới"}
HÃY BẮT ĐẦU VIẾT TIẾP NGAY SAU NGỮ CẢNH TRÊN:`;

        const systemInstruction = sachHiepPromptBuilderService.buildSystemInstruction(
            genre, storyBible?.world || 'Tu chân dị giới', pov, pronounStyle, writingStyle, negativePrompt, nsfw, undefined, undefined
        );

        const messages = [
            { role: 'system', content: `${systemInstruction}\n\n${SACH_HIEP_COT_PROMPT}` },
            { role: 'user', content: prompt }
        ];

        const response = await fetch(this.getEndpoint('/chat/completions'), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                messages,
                model: modelName || this.primaryModel,
                temperature: this.temperature,
                stream: true,
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`DeepSeek Story Stream Error (${response.status}): ${err}`);
        }

        if (!response.body) throw new Error("DeepSeek Stream returned no body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedRaw = '';

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

                        if (deltaObj?.reasoning_content) {
                            yield { text: '', thought: deltaObj.reasoning_content, usageMetadata: {} };
                        }

                        if (deltaObj?.content) {
                            accumulatedRaw += deltaObj.content;
                            yield { text: deltaObj.content, usageMetadata: {}, raw: accumulatedRaw };
                        }

                        if (parsed.usage) {
                            yield { text: '', usageMetadata: { totalTokenCount: parsed.usage.total_tokens } };
                        }
                    } catch {}
                }
            }
        }
    }
}
