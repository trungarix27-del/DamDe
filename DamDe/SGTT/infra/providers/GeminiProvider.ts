import { GoogleGenAI, Type } from "@google/genai";
import { Character, EntityRegistry } from "../../types";
import { promptBuilderService } from "../../narrative/prompting/narrativePromptAssembler";
import { AIProvider } from "./AIProviderInterface";
import { CanonExtractionResult } from "../aiService"; // reuse type
import { AIConfig } from "./AIConfig";

const MODEL_WRITING_PRIMARY = 'gemini-3.5-flash-lite';
const MODEL_WRITING_FALLBACK = 'gemini-3.5-flash-lite';
const MODEL_AUX = 'gemini-3.5-flash-lite';
const MODEL_EMBEDDING = 'gemini-embedding-2-preview';

// Cooldown mechanism for Primary Model
const MODEL_COOLDOWN_DURATION = 60 * 60 * 1000; // 1 hour
let primaryModelCooldownUntil = 0;

const isPrimaryModelAvailable = () => Date.now() > primaryModelCooldownUntil;

const setPrimaryModelCooldown = () => {
    primaryModelCooldownUntil = Date.now() + MODEL_COOLDOWN_DURATION;
    console.warn(`model ${MODEL_WRITING_PRIMARY} test test.`);
};

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

export class GeminiProvider implements AIProvider {
  private config: AIConfig | null = null;

  constructor(config?: AIConfig) {
    this.config = config || null;
  }

  private getApiKey(): string {
    if (
      this.config &&
      this.config.geminiApiKeys &&
      this.config.geminiApiKeys.length > 0
    ) {
      const keys = this.config.geminiApiKeys.filter((k) => k.trim().length > 0);
      if (keys.length > 0) {
        const randomIndex = Math.floor(Math.random() * keys.length);
        return keys[randomIndex];
      }
    }
    return process.env.GEMINI_API_KEY || "";
  }

  private getAI = () => new GoogleGenAI({ apiKey: this.getApiKey() });

  async generateImage(
    prompt: string,
    aspectRatio: string = "3:4",
    referenceImages?: { data: string; mimeType: string }[],
    onProgress?: (progress: number, previewBase64: string | null) => void
  ): Promise<string> {
    // Check if SD WebUI is configured
    if (this.config?.sdWebuiUrl) {
      try {
        let sdWebuiUrl = this.config.sdWebuiUrl.replace(/\/$/, "");
        
        // Calculate width/height based on aspect ratio
        let width = 768;
        let height = 1024;
        if (aspectRatio === "3:4") {
          width = 768;
          height = 1024;
        } else if (aspectRatio === "9:16") {
          width = 720;
          height = 1280;
        } else if (aspectRatio === "1:1") {
          width = 1024;
          height = 1024;
        }

        const payload = {
          prompt: prompt,
          negative_prompt: "(worst quality:1.4), (low quality:1.4), (normal quality:1.2), lowres, bad anatomy, bad hands, bad feet, bad proportions, bad face, deformed, disfigured, mutated, ugly, mutated hands, mutated fingers, extra fingers, fewer fingers, extra limbs, missing limbs, extra arms, extra legs, fused fingers, too many fingers, long neck, long body, gross proportions, malformed limbs, blurry, out of focus, jpeg artifacts, compression artifacts, watermark, text, signature, username, artist name, logo, scan artifacts, monochrome, greyscale, sketch, comic, multiple views, 2koma, 4koma, error, cropped, worst face, poorly drawn face, poorly drawn hands, deformed eyes, bad eyes, extra digits, fewer digits",
          sampler_name: "DPM++ 2M",
          scheduler: "Automatic",
          steps: 8,
          width: 768,
          height: 1344,
          cfg_scale: 2,
          seed: -1,
          n_iter: 1,
          batch_size: 1,
        };

        let isDone = false;
        let finalResult: any = null;
        let fetchError: any = null;

        const headers = {
          "Content-Type": "application/json",
          "Pinggy-Skip-Browser-Warning": "true",
          "ngrok-skip-browser-warning": "true",
          "Bypass-Tunnel-Reminder": "true",
        };

        const generatePromise = fetch(`${sdWebuiUrl}/sdapi/v1/txt2img`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`SD API error: ${res.status} ${res.statusText}`);
            return res.json();
          })
          .then((data) => {
            finalResult = data;
            isDone = true;
          })
          .catch((err) => {
            fetchError = err;
            isDone = true;
          });

        // Poll progress
        while (!isDone) {
          try {
            const progressRes = await fetch(`${sdWebuiUrl}/sdapi/v1/progress?skip_current_image=false`, { headers });
            if (progressRes.ok) {
              const progressData = await progressRes.json();
              if (onProgress) {
                const progress = progressData.progress || 0;
                const currentImage = progressData.current_image ? `data:image/png;base64,${progressData.current_image}` : null;
                onProgress(progress, currentImage);
              }
            }
          } catch (e) {}
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        if (fetchError) {
          console.error("SD WebUI fetch error:", fetchError);
          // Fallback to Gemini if SD fails? Or throw? User said "switch", so maybe throw error if SD fails but is configured.
          throw new Error(`Không thể kết nối đến SD WebUI. Vui lòng kiểm tra lại URL trong Cài đặt.`);
        }

        if (finalResult && finalResult.images && finalResult.images.length > 0) {
          return `data:image/png;base64,${finalResult.images[0]}`;
        }
      } catch (sdErr) {
        console.error("Stable Diffusion generation failed, falling back to Gemini:", sdErr);
        // Fallback to Gemini if SD fails
      }
    }

    // Default to Gemini Image Generation
    try {
      const ai = this.getAI();
      const parts: any[] = [];
      
      if (referenceImages && referenceImages.length > 0) {
        for (const ref of referenceImages) {
          parts.push({
            inlineData: {
              data: ref.data.split(',')[1] || ref.data,
              mimeType: ref.mimeType,
            },
          });
        }
      }
      
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: this.config.geminiImageModel || 'gemini-2.5-flash-image',
        contents: {
          parts: parts,
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any
          }
        },
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return '';
    } catch (e) {
      console.error("Gemini Generate image failed:", e);
      return '';
    }
  }

  async editImage(prompt: string, imageBase64: string, mimeType: string, aspectRatio: string = "3:4"): Promise<string> {
    // Check if SD WebUI is configured
    if (this.config?.sdWebuiUrl) {
      try {
        let sdWebuiUrl = this.config.sdWebuiUrl.replace(/\/$/, "");
        
        // Calculate width/height based on aspect ratio
        let width = 768;
        let height = 1024;
        if (aspectRatio === "3:4") {
          width = 768;
          height = 1024;
        } else if (aspectRatio === "9:16") {
          width = 720;
          height = 1280;
        } else if (aspectRatio === "1:1") {
          width = 1024;
          height = 1024;
        }

        const payload = {
          init_images: [imageBase64],
          prompt: prompt,
          negative_prompt: "(worst quality:1.4), (low quality:1.4), (normal quality:1.2), lowres, bad anatomy, bad hands, bad feet, bad proportions, bad face, deformed, disfigured, mutated, ugly, mutated hands, mutated fingers, extra fingers, fewer fingers, extra limbs, missing limbs, extra arms, extra legs, fused fingers, too many fingers, long neck, long body, gross proportions, malformed limbs, blurry, out of focus, jpeg artifacts, compression artifacts, watermark, text, signature, username, artist name, logo, scan artifacts, monochrome, greyscale, sketch, comic, multiple views, 2koma, 4koma, error, cropped, worst face, poorly drawn face, poorly drawn hands, deformed eyes, bad eyes, extra digits, fewer digits",
          sampler_name: "DPM++ 2M",
          scheduler: "Automatic",
          steps: 8,
          width: 768,
          height: 1344,
          cfg_scale: 2,
          denoising_strength: 0.75,
          seed: -1,
          n_iter: 1,
          batch_size: 1,
        };

        const headers = {
          "Content-Type": "application/json",
          "Pinggy-Skip-Browser-Warning": "true",
          "ngrok-skip-browser-warning": "true",
          "Bypass-Tunnel-Reminder": "true",
        };

        const res = await fetch(`${sdWebuiUrl}/sdapi/v1/img2img`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`SD API error: ${res.status} ${res.statusText}`);
        const data = await res.json();

        if (data && data.images && data.images.length > 0) {
          return `data:image/png;base64,${data.images[0]}`;
        }
      } catch (sdErr) {
        console.error("Stable Diffusion edit failed, falling back to Gemini:", sdErr);
      }
    }

    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.config.geminiImageModel || 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any
          }
        },
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return '';
    } catch (e) {
      console.error("Gemini Edit image failed:", e);
      return '';
    }
  }

  async generateContent(prompt: string, useAux: boolean = false, config?: any): Promise<string> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: useAux ? MODEL_AUX : MODEL_WRITING_PRIMARY,
        contents: [{ parts: [{ text: prompt }] }],
        config: config
      });
      return response.text || '';
    } catch (e) {
      console.error("Generate content failed:", e);
      return '';
    }
  }

  async generateRawContent(contents: any[], config?: any): Promise<string> {
      try {
          const ai = this.getAI();
          const response = await ai.models.generateContent({
              model: MODEL_WRITING_PRIMARY,
              contents: contents,
              config: config
          });
          return response.text || '';
      } catch (e) {
          console.error("Gemini Raw content failed:", e);
          return '';
      }
  }

  async *generateRawStream(contents: any[], config?: any) {
      const ai = this.getAI();
      const responseStream = await ai.models.generateContentStream({
          model: MODEL_WRITING_PRIMARY,
          contents: contents,
          config: config
      });
      for await (const chunk of responseStream) {
          const parts = chunk.candidates?.[0]?.content?.parts || [];
          let text = '';
          let thought = '';
          
          for (const part of parts) {
              if (part.text) text += part.text;
              if (part.thought) thought += part.thought;
          }

          if (text || thought) {
              yield { text, thought, usageMetadata: chunk.usageMetadata };
          }
      }
  }

  async embedText(text: string): Promise<number[]> {
    if (!text || text.length < 5) return []; 
    try {
      const ai = this.getAI();
      const response = await ai.models.embedContent({
        model: MODEL_EMBEDDING, 
        contents: [{ parts: [{ text: text }] }]
      });
      return response.embeddings?.[0]?.values || [];
    } catch (e) {
      console.error("Embedding failed:", e);
      return [];
    }
  }

  async extractCanonData(textChunk: string): Promise<CanonExtractionResult> {
    if (!textChunk || textChunk.length < 100) return { rules: [], character_profiles: [], relationships: [], locations: [], factions: [] };

    const prompt = `Phân tích đoạn văn bản thô từ tiểu thuyết gốc sau đây và trích xuất dữ liệu cốt lõi (Canon) để làm cơ sở dữ liệu cho Fanfiction (Existence Lock).
    
    Yêu cầu đầu ra (JSON):
    1. rules: Các quy tắc thế giới, hệ thống sức mạnh, hoặc sự kiện lịch sử không thể thay đổi.
    2. character_profiles: Hồ sơ tâm lý nhân vật. (Tên, tính cách cốt lõi).
    3. relationships: Tương tác quan hệ.
    4. locations: DANH SÁCH TÊN ĐỊA DANH / ĐỊA ĐIỂM xuất hiện (Để làm Whitelist).
    5. factions: DANH SÁCH TÊN TỔ CHỨC / MÔN PHÁI / GIA TỘC xuất hiện (Để làm Whitelist).

    Văn bản gốc:
    ${textChunk.substring(0, 15000)}... (đã cắt bớt)`;

    try {
        const ai = this.getAI();
        const response = await ai.models.generateContent({
            model: MODEL_AUX,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rules: { type: Type.ARRAY, items: { type: Type.STRING } },
                        character_profiles: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    core: { type: Type.STRING, description: "Tính cách cốt lõi / Core Personality" },
                                    traits: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["name", "core"]
                            }
                        },
                        relationships: { type: Type.ARRAY, items: { type: Type.STRING } },
                        locations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Whitelist of valid locations" },
                        factions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Whitelist of valid orgs/groups" }
                    },
                    required: ["rules", "character_profiles", "locations", "factions"]
                }
            }
        });
        const result = cleanAndParseJSON(response.text || "{}");
        return {
            rules: result.rules || [],
            character_profiles: result.character_profiles || [],
            relationships: result.relationships || [],
            locations: result.locations || [],
            factions: result.factions || []
        };
    } catch (e) {
        console.error("Canon extraction failed", e);
        return { rules: [], character_profiles: [], relationships: [], locations: [], factions: [] };
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
      immediateContext,
      rollingSummaries,
      worldBible,
      augmentedContext,
      synopsis,
      characters,
      worldLore,
      userInstruction,
      pronounStyle,
      currentChapterTitle,
      MODEL_WRITING_PRIMARY
    );

    const systemInstruction = promptBuilderService.buildSystemInstruction(
        genre, worldBible, pov, pronounStyle, writingStyle, negativePrompt, nsfw, sourceUrl, entityRegistry
    );

    const ai = this.getAI();
    const config = {
        systemInstruction: systemInstruction,
        temperature: 0.9, 
        topK: 64,
        topP: 0.95,
        thinkingConfig: { thinkingBudget: 24576 } 
    };

    const tryStream = async function*(model: string, provider: GeminiProvider) {
        const responseStream = await provider.getAI().models.generateContentStream({
            model: model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: config
        });
        for await (const chunk of responseStream) {
            if (chunk.text) {
                yield { text: chunk.text, thought: '', usageMetadata: chunk.usageMetadata };
            }
        }
    };

    let useFallback = !isPrimaryModelAvailable();

    if (!useFallback) {
        try {
            yield* tryStream(MODEL_WRITING_PRIMARY, this);
        } catch (e: any) {
            const isQuotaError = e.toString().includes('429') || 
                                 e.toString().toLowerCase().includes('quota') || 
                                 e.toString().toLowerCase().includes('exhausted') ||
                                 (e.status === 429);
            
            if (isQuotaError) {
                setPrimaryModelCooldown();
            }
            console.warn(`Primary model ${MODEL_WRITING_PRIMARY} failed, switching to fallback ${MODEL_WRITING_FALLBACK}. Error:`, e);
            useFallback = false;
        }
    }

    if (useFallback) {
        try {
            yield* tryStream(MODEL_WRITING_FALLBACK, this);
        } catch (fallbackError) {
            console.error("Story generation failed on both models", fallbackError);
            throw fallbackError;
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
  ) {
    const prompt = promptBuilderService.buildRewritePrompt(
        originalText,
        instruction,
        contextData.characters,
        contextData.worldLore,
        contextData.worldBible,
        contextData.synopsis,
        contextData.pronounStyle
    );

    const systemInstruction = promptBuilderService.buildSystemInstruction(
        contextData.genre, contextData.worldBible, contextData.pov, contextData.pronounStyle, contextData.writingStyle, contextData.negativePrompt, contextData.nsfw, contextData.sourceUrl, contextData.entityRegistry
    );

    const ai = this.getAI();
    const config = {
        systemInstruction: systemInstruction,
        temperature: 0.7, 
        topK: 64,
        topP: 0.95,
        thinkingConfig: { thinkingBudget: 16384 }
    };

    const tryStream = async function*(model: string, provider: GeminiProvider) {
        const responseStream = await provider.getAI().models.generateContentStream({
            model: model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: config
        });
        for await (const chunk of responseStream) {
            if (chunk.text) {
                yield { text: chunk.text, thought: '', usageMetadata: chunk.usageMetadata };
            }
        }
    };

    let useFallback = !isPrimaryModelAvailable();

    if (!useFallback) {
        try {
            yield* tryStream(MODEL_WRITING_PRIMARY, this);
        } catch (e: any) {
            
            const isQuotaError = e.toString().includes('429') || 
                                 e.toString().toLowerCase().includes('quota') || 
                                 e.toString().toLowerCase().includes('exhausted') ||
                                 (e.status === 429);
            
            if (isQuotaError) {
                setPrimaryModelCooldown();
            }
            console.warn(`Primary model ${MODEL_WRITING_PRIMARY} failed for rewrite, switching to fallback ${MODEL_WRITING_FALLBACK}. Error:`, e);
            useFallback = false;
        }
    }

    if (useFallback) {
        try {
            yield* tryStream(MODEL_WRITING_FALLBACK, this);
        } catch (fallbackError) {
            console.error("Rewrite generation failed on both models", fallbackError);
            throw fallbackError;
        }
    }
  }

  async extractCharacters(text: string, pronounStyle: string): Promise<Character[]> {
    const systemInstruction = promptBuilderService.buildExtractionSystemInstruction(pronounStyle);
    const prompt = `Phân tích văn bản và trích xuất danh sách JSON các nhân vật quan trọng. 
    HÃY SUY LUẬN ĐỂ ĐIỀN ĐẦY ĐỦ CÁC TRƯỜNG: Ngoại hình (Tóc, Mắt, Quần áo), Tính cách (Big Five, MBTI) dựa trên hành động của họ.
    Nếu thông tin không có, hãy suy luận hợp lý nhất dựa trên bối cảnh.`;
    
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: MODEL_AUX,
        contents: {
            parts: [
                { text: prompt },
                { text: `Văn bản cần phân tích:\n${text}` }
            ]
        },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
                characters: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            role: { type: Type.STRING },
                            description: { type: Type.STRING, description: "Tiểu sử, quá khứ, động lực" },
                            appearance: {
                                type: Type.OBJECT,
                                properties: {
                                    general: { type: Type.STRING },
                                    face: { type: Type.STRING },
                                    body: { type: Type.STRING },
                                    hair: { type: Type.STRING },
                                    clothing: { type: Type.STRING },
                                    body_impression: { type: Type.STRING }
                                },
                                required: ["general", "face", "clothing"]
                            },
                            core_personality: { type: Type.STRING, description: "Tính cách cốt lõi bất biến" },
                            personality: { type: Type.STRING, description: "Biểu hiện bên ngoài" },
                            mbti: { type: Type.STRING },
                            big_five: {
                                type: Type.OBJECT,
                                properties: {
                                    O: { type: Type.NUMBER, description: "Openness (0.0-1.0)" },
                                    C: { type: Type.NUMBER, description: "Conscientiousness (0.0-1.0)" },
                                    E: { type: Type.NUMBER, description: "Extraversion (0.0-1.0)" },
                                    A: { type: Type.NUMBER, description: "Agreeableness (0.0-1.0)" },
                                    N: { type: Type.NUMBER, description: "Neuroticism (0.0-1.0)" }
                                }
                            },
                            emotionState: {
                                type: Type.OBJECT,
                                properties: {
                                    anger: { type: Type.NUMBER },
                                    joy: { type: Type.NUMBER },
                                    sadness: { type: Type.NUMBER },
                                    fear: { type: Type.NUMBER },
                                    trust: { type: Type.NUMBER },
                                    surprise: { type: Type.NUMBER }
                                }
                            },
                            status: { type: Type.STRING, description: "Trạng thái hiện tại (VD: Đang bị thương)" },
                            traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                            voiceSample: { type: Type.STRING, description: "Một câu thoại mẫu điển hình" }
                        },
                        required: ["name", "role", "description", "core_personality"],
                    }
                }
            }
          }
        }
      });

      const parsed = cleanAndParseJSON(response.text || "{}");
      const list = parsed.characters || (Array.isArray(parsed) ? parsed : []);
      
      if (!Array.isArray(list)) return [];

      return list.map((c: any, index: number) => ({
        ...c,
        id: `char_${Date.now()}_${index}`,
        traits: c.traits || []
      }));
    } catch (e) {
      console.error("Extraction failed", e);
      return [];
    }
  }

  async ingestFanficData(fandomName: string, url: string): Promise<{ setting: string; characters: Character[] }> {
    const ai = this.getAI();
    let prompt = `Nghiên cứu Fandom/Series "${fandomName}"`;
    if (url && url.length > 5) {
        prompt += ` và chủ đề Wiki tại URL này: "${url}"`;
    }
    
    prompt += `.
    
    Nhiệm vụ 1: Tóm tắt Xây dựng Thế giới, Hệ thống Sức mạnh (Cấp độ, Kỹ năng) và các thông tin quan trọng (Lore) thành một bản mô tả "Bối cảnh" (Setting) toàn diện bằng tiếng Việt.
    Nhiệm vụ 2: Trích xuất các nhân vật chính được đề cập trong tài liệu nguồn với hồ sơ chuyên sâu (Ngoại hình, Tính cách, Sức mạnh).

    Trả về kết quả dưới định dạng JSON. Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_AUX,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }], // Use Search for grounding
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              setting: { type: Type.STRING, description: "Detailed description of world, power system, and lore in Vietnamese." },
              characters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    appearance: {
                        type: Type.OBJECT,
                        properties: {
                            general: { type: Type.STRING },
                            face: { type: Type.STRING },
                            body: { type: Type.STRING },
                            hair: { type: Type.STRING },
                            clothing: { type: Type.STRING },
                        },
                    },
                    core_personality: { type: Type.STRING },
                    traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["name", "role", "description"],
                }
              }
            },
            required: ["setting", "characters"],
          }
        }
      });

      const data = cleanAndParseJSON(response.text || "{}");
      
      const characters = Array.isArray(data.characters) 
        ? data.characters.map((c: any, index: number) => ({
            ...c,
            id: `char_fanfic_${Date.now()}_${index}`,
            traits: c.traits || [],
            appearance: c.appearance || { general: "Không rõ", face: "", body: "", hair: "", clothing: "" },
            core_personality: c.core_personality || "Không rõ",
            personality: c.core_personality || "",
          }))
        : [];

      return {
        setting: data.setting || "",
        characters: characters
      };

    } catch (e) {
      console.error("Fanfic ingestion failed", e);
      return { setting: "", characters: [] };
    }
  }

  async summarize(text: string, pronounStyle: string): Promise<string> {
    const systemInstruction = promptBuilderService.buildSummarySystemInstruction(pronounStyle);
    const prompt = `Hãy đọc văn bản sau và tạo bản tóm tắt nén cho AI, tuân thủ đúng hệ thống xưng hô.\n\nVăn bản:\n${text}`;
    try {
        const ai = this.getAI();
        const response = await ai.models.generateContent({
            model: MODEL_AUX,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: systemInstruction,
                thinkingConfig: { thinkingBudget: 4096 }
            }
        });
        return response.text || "";
    } catch (e) {
        return "";
    }
  }
}
