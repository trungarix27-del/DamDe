import { GoogleGenAI, Type } from "@google/genai";
import partialParse from "partial-json-parser";
import { Character, EntityRegistry, StoryContinuePlan } from "../../types";
import {
  SACH_HIEP_COT_PROMPT,
  sachHiepPromptBuilderService,
} from "../../narrative/prompting/sachHiepPromptAssembler";
import { AIProvider } from "./AIProviderInterface";
import { CanonExtractionResult } from "../aiService"; // reuse type
import { AIConfig } from "./AIConfig";
import { autoAssignLoraToCharacters } from "../../utils/loraAutoAssign";

const cleanAndParseJSON = (text: string): any => {
  if (!text) return [];
  let cleanText = text.trim();
  if (cleanText.includes("```")) {
    cleanText = cleanText
      .replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1")
      .trim();
  }

  const firstBracket = cleanText.indexOf("[");
  const firstBrace = cleanText.indexOf("{");

  try {
    if (
      firstBracket !== -1 &&
      (firstBrace === -1 || firstBracket < firstBrace)
    ) {
      const lastBracket = cleanText.lastIndexOf("]");
      if (lastBracket !== -1)
        cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1) {
      const lastBrace = cleanText.lastIndexOf("}");
      if (lastBrace !== -1)
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    // Attempt standard parse
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error, attempting partial recovery:", e);
    try {
      // Try partial-json-parser as a fallback for malformed but mostly-there JSON
      return partialParse(cleanText);
    } catch (pE) {
      console.error("Partial Parse also failed:", pE);
      // Final fallback: return empty structure based on context if possible,
      // but here we return empty array/object as a safe default
      return firstBracket !== -1 ? [] : {};
    }
  }
};

export class SachHiepGeminiProvider implements AIProvider {
  private config: AIConfig | null = null;

  constructor(config?: AIConfig) {
    this.config = config || null;
  }

  private getModel(): string {
    if (!this.config) return "gemini-3.5-flash-lite";
    if (this.config.geminiModel === "custom" && this.config.geminiCustomModel) {
      return this.config.geminiCustomModel;
    }
    return this.config.geminiModel;
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

  async generateContent(
    prompt: string,
    useAux: boolean = false,
  ): Promise<string> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.getModel(),
        contents: [{ parts: [{ text: prompt }] }],
      });
      return response.text || "";
    } catch (e) {
      console.error("Generate content failed:", e);
      return "";
    }
  }

  async generateRawContent(contents: any[], config?: any): Promise<string> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.getModel(),
        contents: contents,
        config: config,
      });
      return response.text || "";
    } catch (e) {
      console.error("Gemini Raw content failed:", e);
      return "";
    }
  }

  async *generateRawStream(contents: any[], config?: any) {
    const ai = this.getAI();
    const responseStream = await ai.models.generateContentStream({
      model: this.getModel(),
      contents: contents,
      config: config,
    });
    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield {
          text: chunk.text,
          thought: "",
          usageMetadata: chunk.usageMetadata,
        };
      }
    }
  }

  async embedText(text: string): Promise<number[]> {
    if (!text || text.length < 5) return [];
    try {
      const ai = this.getAI();
      const response = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: [{ parts: [{ text: text }] }],
      });
      return response.embeddings?.[0]?.values || [];
    } catch (e) {
      console.error("Embedding failed:", e);
      return [];
    }
  }

  async extractCanonData(textChunk: string): Promise<CanonExtractionResult> {
    if (!textChunk || textChunk.length < 100)
      return {
        rules: [],
        character_profiles: [],
        relationships: [],
        locations: [],
        factions: [],
      };

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
    ${textChunk.substring(0, 15000)}... (Cắt ngắn)`;

    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.getModel(),
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
                    core: {
                      type: Type.STRING,
                      description: "Nhân vật cốt lõi / Core Personality",
                    },
                    traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["name", "core"],
                },
              },
              relationships: { type: Type.ARRAY, items: { type: Type.STRING } },
              locations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Whitelist of valid locations",
              },
              factions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Whitelist of valid orgs/groups",
              },
            },
            required: ["rules", "character_profiles", "locations", "factions"],
          },
        },
      });
      const result = cleanAndParseJSON(response.text || "{}");
      return {
        rules: result.rules || [],
        character_profiles: result.character_profiles || [],
        relationships: result.relationships || [],
        locations: result.locations || [],
        factions: result.factions || [],
      };
    } catch (e) {
      console.error("Canon extraction failed", e);
      return {
        rules: [],
        character_profiles: [],
        relationships: [],
        locations: [],
        factions: [],
      };
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
    currentChapterTitle: string,
  ) {
    const prompt = sachHiepPromptBuilderService.buildContinuePrompt(
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
      this.getModel(),
    );

    const systemInstruction =
      sachHiepPromptBuilderService.buildSystemInstruction(
        genre,
        worldBible,
        pov,
        pronounStyle,
        writingStyle,
        negativePrompt,
        nsfw,
        sourceUrl,
        entityRegistry,
      );

    const ai = this.getAI();
    const config = {
      systemInstruction: systemInstruction,
      temperature: 0.9,
      topK: 64,
      topP: 0.95,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          part1: {
            type: Type.OBJECT,
            properties: {
              part_script: { type: Type.STRING },
              thought_process: { type: Type.STRING },
              part_story_content: { type: Type.STRING },
            },
            required: ["part_script", "thought_process", "part_story_content"],
          },
          part2: {
            type: Type.OBJECT,
            properties: {
              part_script: { type: Type.STRING },
              thought_process: { type: Type.STRING },
              part_story_content: { type: Type.STRING },
            },
            required: ["part_script", "thought_process", "part_story_content"],
          },
          part3: {
            type: Type.OBJECT,
            properties: {
              part_script: { type: Type.STRING },
              thought_process: { type: Type.STRING },
              part_story_content: { type: Type.STRING },
            },
            required: ["part_script", "thought_process", "part_story_content"],
          },
          story_continue_plan: {
            type: Type.OBJECT,
            properties: {
              LoveOrGoodRoute: {
                type: Type.OBJECT,
                properties: {
                  CharacterComment: { type: Type.STRING },
                  ContinuePlan: { type: Type.STRING },
                },
                required: ["CharacterComment", "ContinuePlan"],
              },
              NtrOrBadRoute: {
                type: Type.OBJECT,
                properties: {
                  CharacterComment: { type: Type.STRING },
                  ContinuePlan: { type: Type.STRING },
                },
                required: ["CharacterComment", "ContinuePlan"],
              },
              SupriseOrNeutralRoute: {
                type: Type.OBJECT,
                properties: {
                  CharacterComment: { type: Type.STRING },
                  ContinuePlan: { type: Type.STRING },
                },
                required: ["CharacterComment", "ContinuePlan"],
              },
            },
            required: [
              "LoveOrGoodRoute",
              "NtrOrBadRoute",
              "SupriseOrNeutralRoute",
            ],
          },
        },
        required: ["part1", "part2", "part3", "story_continue_plan"],
      },
    };

    const tryGenerate = async function* (
      model: string,
      provider: SachHiepGeminiProvider,
    ) {
      const response = await ai.models.generateContentStream({
        model: model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          ...config,
          responseMimeType: "application/json",
        },
      });

      let fullRawText = "";
      let lastStoryContent = "";
      let lastThoughtProcess = "";
      let finalPlan: any = null;

      for await (const chunk of response) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullRawText += chunkText;

          try {
            const partial = partialParse(fullRawText);

            // Handle thought process (combined from parts)
            const p1_thought = partial.part1?.thought_process || "";
            const p2_thought = partial.part2?.thought_process || "";
            const p3_thought = partial.part3?.thought_process || "";
            const currentThought =
              p1_thought +
              (p2_thought ? "\n" + p2_thought : "") +
              (p3_thought ? "\n" + p3_thought : "");

            if (currentThought.length > lastThoughtProcess.length) {
              const delta = currentThought.substring(lastThoughtProcess.length);
              yield {
                text: "",
                thought: delta,
                usageMetadata: chunk.usageMetadata,
                raw: fullRawText,
              };
              lastThoughtProcess = currentThought;
            }

            // Handle story content (combined from parts)
            const p1_content = partial.part1?.part_story_content || "";
            const p2_content = partial.part2?.part_story_content || "";
            const p3_content = partial.part3?.part_story_content || "";
            const currentStoryContent =
              p1_content +
              (p2_content ? "\n\n" + p2_content : "") +
              (p3_content ? "\n\n" + p3_content : "");

            if (currentStoryContent.length > lastStoryContent.length) {
              const delta = currentStoryContent.substring(
                lastStoryContent.length,
              );
              yield {
                text: delta,
                usageMetadata: chunk.usageMetadata,
                raw: fullRawText,
              };
              lastStoryContent = currentStoryContent;
            }

            if (partial.story_continue_plan) {
              finalPlan = partial.story_continue_plan;
            }
          } catch (e) {
            // Silent catch for partial parsing
          }

          // Always yield raw even if parsing fails or no new content
          yield {
            text: "",
            usageMetadata: chunk.usageMetadata,
            raw: fullRawText,
          };
        }
      }

      if (finalPlan) {
        yield {
          text: "",
          storyContinuePlan: finalPlan,
          usageMetadata: {} as any,
          raw: fullRawText,
        };
      }
    };

    yield* tryGenerate(this.getModel(), this);
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
    },
  ): AsyncGenerator<{
    text: string;
    thought?: string;
    usageMetadata: any;
    storyContinuePlan?: any;
    raw?: string;
  }> {
    const prompt = sachHiepPromptBuilderService.buildRewritePrompt(
      originalText,
      instruction,
      contextData.characters,
      contextData.worldLore,
      contextData.worldBible,
      contextData.synopsis,
      contextData.pronounStyle,
    );

    const systemInstruction =
      sachHiepPromptBuilderService.buildSystemInstruction(
        contextData.genre,
        contextData.worldBible,
        contextData.pov,
        contextData.pronounStyle,
        contextData.writingStyle,
        contextData.negativePrompt,
        contextData.nsfw,
        contextData.sourceUrl,
        contextData.entityRegistry,
      );

    const ai = this.getAI();
    const config = {
      systemInstruction: systemInstruction,
      temperature: 0.7,
      topK: 64,
      topP: 0.95,
      thinkingConfig: { thinkingBudget: 16384 },
    };

    const tryStream = async function* (model: string) {
      const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: config,
      });

      let isThinking = false;
      let hasStarted = false;
      let partialTag = "";

      let fullRawText = "";
      for await (const chunk of responseStream) {
        if (chunk.text) {
          let chunkText = chunk.text;
          fullRawText += chunkText;
          const usageMetadata = chunk.usageMetadata;

          const fullContent = partialTag + chunkText;
          partialTag = "";
          let currentContent = fullContent;

          while (currentContent.length > 0) {
            if (!isThinking) {
              const thinkStartIdx = currentContent.indexOf("<think>");
              const thinkEndIdx = currentContent.indexOf("</think>");

              if (!hasStarted && (thinkStartIdx === -1 || thinkStartIdx > 0)) {
                isThinking = true;
                hasStarted = true;
                continue;
              }
              hasStarted = true;

              if (
                thinkEndIdx !== -1 &&
                (thinkStartIdx === -1 || thinkEndIdx < thinkStartIdx)
              ) {
                const thought = currentContent.substring(0, thinkEndIdx);
                if (thought)
                  yield { text: "", thought, usageMetadata, raw: fullRawText };
                isThinking = false;
                currentContent = currentContent.substring(thinkEndIdx + 8);
                continue;
              }

              if (thinkStartIdx !== -1) {
                const before = currentContent.substring(0, thinkStartIdx);
                if (before)
                  yield { text: before, usageMetadata, raw: fullRawText };
                isThinking = true;
                currentContent = currentContent.substring(thinkStartIdx + 7);
              } else {
                const lastLess = currentContent.lastIndexOf("<");
                if (
                  lastLess !== -1 &&
                  ("<think>".startsWith(currentContent.substring(lastLess)) ||
                    "</think>".startsWith(currentContent.substring(lastLess)))
                ) {
                  partialTag = currentContent.substring(lastLess);
                  const before = currentContent.substring(0, lastLess);
                  if (before)
                    yield { text: before, usageMetadata, raw: fullRawText };
                  break;
                } else {
                  yield {
                    text: currentContent,
                    usageMetadata,
                    raw: fullRawText,
                  };
                  break;
                }
              }
            } else {
              const thinkEndIdx = currentContent.indexOf("</think>");
              if (thinkEndIdx !== -1) {
                const thought = currentContent.substring(0, thinkEndIdx);
                if (thought)
                  yield { text: "", thought, usageMetadata, raw: fullRawText };
                isThinking = false;
                currentContent = currentContent.substring(thinkEndIdx + 8);
              } else {
                const lastLess = currentContent.lastIndexOf("<");
                if (
                  lastLess !== -1 &&
                  "</think>".startsWith(currentContent.substring(lastLess))
                ) {
                  partialTag = currentContent.substring(lastLess);
                  const thought = currentContent.substring(0, lastLess);
                  if (thought)
                    yield {
                      text: "",
                      thought,
                      usageMetadata,
                      raw: fullRawText,
                    };
                  break;
                } else {
                  yield {
                    text: "",
                    thought: currentContent,
                    usageMetadata,
                    raw: fullRawText,
                  };
                  break;
                }
              }
            }
          }
        }
      }
    };

    yield* tryStream(this.getModel());
  }

  async extractCharacters(
    text: string,
    pronounStyle: string,
  ): Promise<Character[]> {
    const systemInstruction =
      sachHiepPromptBuilderService.buildExtractionSystemInstruction(
        pronounStyle,
      );
    const prompt = `Phân tích văn bản và trích xuất danh sách JSON các ký tự chính.

    Tất cả đầu ra phải ở dạng tiếng Việt.

    Vui lòng suy luận để điền đầy đủ các trường: ngoại hình (tóc, mắt, quần áo), tính cách (BIG FIVE, MBTI), dựa trên hành vi của họ.

    Nếu không có thông tin, vui lòng đưa ra suy luận hợp lý nhất dựa trên ngữ cảnh.`;

    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.getModel(),
        contents: {
          parts: [
            { text: prompt },
            { text: `Văn bản cần phân tích: \n${text}` },
          ],
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
                    description: {
                      type: Type.STRING,
                      description: "Tiểu sử, Quá khứ, Động lực",
                    },
                    appearance: {
                      type: Type.OBJECT,
                      properties: {
                        general: { type: Type.STRING },
                        face: { type: Type.STRING },
                        body: { type: Type.STRING },
                        hair: { type: Type.STRING },
                        clothing: { type: Type.STRING },
                        body_impression: { type: Type.STRING },
                      },
                      required: ["general", "face", "clothing"],
                    },
                    core_personality: {
                      type: Type.STRING,
                      description: "Tính cách cốt lõi bất biến",
                    },
                    personality: {
                      type: Type.STRING,
                      description: "Biểu hiện bên ngoài",
                    },
                    mbti: { type: Type.STRING },
                    big_five: {
                      type: Type.OBJECT,
                      properties: {
                        O: {
                          type: Type.NUMBER,
                          description: "Openness (0.0-1.0)",
                        },
                        C: {
                          type: Type.NUMBER,
                          description: "Conscientiousness (0.0-1.0)",
                        },
                        E: {
                          type: Type.NUMBER,
                          description: "Extraversion (0.0-1.0)",
                        },
                        A: {
                          type: Type.NUMBER,
                          description: "Agreeableness (0.0-1.0)",
                        },
                        N: {
                          type: Type.NUMBER,
                          description: "Neuroticism (0.0-1.0)",
                        },
                      },
                    },
                    emotionState: {
                      type: Type.OBJECT,
                      properties: {
                        anger: { type: Type.NUMBER },
                        joy: { type: Type.NUMBER },
                        sadness: { type: Type.NUMBER },
                        fear: { type: Type.NUMBER },
                        trust: { type: Type.NUMBER },
                        surprise: { type: Type.NUMBER },
                      },
                    },
                    status: {
                      type: Type.STRING,
                      description: "Trạng thái hiện tại (VD: Đang bị thương)",
                    },
                    character_type: {
                      type: Type.STRING,
                      description: "Phân loại: 'male_lead', 'female_young_lead', 'female_mature_lead', 'npc'",
                    },
                    traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                    voiceSample: {
                      type: Type.STRING,
                      description: "Một câu thoại mẫu điển hình",
                    },
                  },
                  required: ["name", "role", "description", "core_personality"],
                },
              },
            },
          },
        },
      });

      const parsed = cleanAndParseJSON(response.text || "{}");
      const list = parsed.characters || (Array.isArray(parsed) ? parsed : []);

      if (!Array.isArray(list)) return [];

      const characters = list.map((c: any, index: number) => ({
        ...c,
        id: `char_${Date.now()}_${index}`,
        traits: c.traits || [],
      }));

      return autoAssignLoraToCharacters(characters) as Character[];
    } catch (e) {
      console.error("Extraction failed", e);
      return [];
    }
  }

  async ingestFanficData(
    fandomName: string,
    url: string,
  ): Promise<{ setting: string; characters: Character[] }> {
    const ai = this.getAI();
    let prompt = `Nghiên cứu Fandom/Series "${fandomName}"`;
    if (url && url.length > 5) {
      prompt += ` và chủ đề Wiki tại URL này: "${url}"`;
    }

    prompt += `.
    
    Nhiệm vụ 1: Tóm tắt Xây dựng thế giới, Hệ thống sức mạnh (Cấp độ, Kỹ năng) và các Truyền thuyết chính thành một mô tả "Bối cảnh" (Setting) toàn diện (bằng tiếng Việt).
    Nhiệm vụ 2: Trích xuất các nhân vật chính được đề cập trong tài liệu nguồn với hồ sơ chuyên sâu (Ngoại hình, Tính cách, Sức mạnh).

    Trả về kết quả dưới định dạng JSON. Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).`;

    try {
      const response = await ai.models.generateContent({
        model: this.getModel(),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }], // Use Search for grounding
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              setting: {
                type: Type.STRING,
                description:
                  "Mô tả chi tiết về thế giới, hệ thống sức mạnh và truyền thuyết bằng tiếng Việt.",
              },
              characters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    character_type: { type: Type.STRING },
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
                },
              },
            },
            required: ["setting", "characters"],
          },
        },
      });

      const data = cleanAndParseJSON(response.text || "{}");

      const characters = Array.isArray(data.characters)
        ? data.characters.map((c: any, index: number) => ({
            ...c,
            id: `char_fanfic_${Date.now()}_${index}`,
            traits: c.traits || [],
            appearance: c.appearance || {
              general: "Không rõ",
              face: "",
              body: "",
              hair: "",
              clothing: "",
            },
            core_personality: c.core_personality || "Không rõ",
            personality: c.core_personality || "",
          }))
        : [];

      return {
        setting: data.setting || "",
        characters: characters,
      };
    } catch (e) {
      console.error("Fanfic ingestion failed", e);
      return { setting: "", characters: [] };
    }
  }

  async summarize(text: string, pronounStyle: string): Promise<string> {
    const systemInstruction =
      sachHiepPromptBuilderService.buildSummarySystemInstruction(pronounStyle);
    const prompt = `Hãy đọc văn bản sau và tạo bản tóm tắt nén cho AI, tuân thủ đúng hệ thống xưng hô.\n\nVăn bản:\n：\n${text}`;
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.getModel(),
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemInstruction,
        },
      });
      return response.text || "";
    } catch (e) {
      return "";
    }
  }

  async generateStoryBible(
    formData: any,
    sourceText?: string,
  ): Promise<import("../../types").StoryBible> {
    const ai = this.getAI();
    const hasInitialChars = Array.isArray(formData.initialCharacters) && formData.initialCharacters.length > 0;
    let prompt = `Vui lòng đọc thông tin sau và gửi lại một "Story Bible" dưới định dạng JSON. Toàn bộ nội dung phải được viết bằng tiếng Việt.
    
    [Thông tin đầu vào]
    Tiêu đề: ${formData.title}
    Thể loại: ${formData.genre}
    Dàn ý/Nguồn cảm hứng: ${formData.synopsis}
    Bối cảnh: ${formData.setting}
    `;

    if (hasInitialChars) {
      prompt += `\n[DANH SÁCH NHÂN VẬT ĐÃ KHÓA - CẤM TỰ BỊA ĐẶT THÊM NHÂN VẬT MỚI]\n`;
      formData.initialCharacters.forEach((c: any) => {
        prompt += `- Tên: ${c.name}, Vai: ${c.role}, Loại: ${c.character_type}, Tính cách: ${c.core}. Ngoại hình: ${c.appearance || ''}\n`;
      });
      prompt += `BẮT BUỘC: Giữ nguyên danh sách nhân vật trên trong trường chars của JSON, tuyệt đối không được thêm bất kỳ nhân vật nào khác!\n`;
    }

    if (sourceText) {
      prompt += `\n [Trích đoạn gốc] \n${sourceText}\n`;
    }

    prompt += `
    Vui lòng trích xuất và tích hợp thông tin trên, trả về một tệp JSON chứa các trường sau:
    - chars: Một mảng các nhân vật, mỗi nhân vật chứa:
        + name: Tên nhân vật.
        + role: Vai trò (ví dụ: nhân vật chính/nữ chính/mỹ phụ).
        + core: Đặc điểm cốt lõi (mô tả ngắn gọn về tính cách/đặc điểm cốt lõi của họ).
        + character_type: Phân loại nhân vật (BẮT BUỘC CHỌN 1): 'male_lead' (Nam chính duy nhất), 'female_young_lead' (Nữ chính trẻ), 'female_mature_lead' (Nữ chính trưởng thành), 'npc' (Khác).
    - world: Mô tả ngắn gọn về thế giới trong truyện.
    - rules: Mô tả ngắn gọn về các quy tắc hoặc điều cấm kỵ cốt lõi.
    - arc: Mô tả ngắn gọn về mục tiêu hoặc trạng thái của chương truyện hiện tại.
    - chapter_cores: Một mảng các sự kiện cốt lõi của chương, mỗi sự kiện chứa ch (số chương) và core (sự kiện cốt lõi). Ban đầu là một mảng rỗng [].
    `;

    try {
      const response = await ai.models.generateContent({
        model: this.getModel(),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chars: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    core: { type: Type.STRING },
                    character_type: { type: Type.STRING },
                  },
                  required: ["name", "role", "core", "character_type"],
                },
              },
              world: { type: Type.STRING },
              rules: { type: Type.STRING },
              arc: { type: Type.STRING },
              chapter_cores: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ch: { type: Type.INTEGER },
                    core: { type: Type.STRING },
                  },
                  required: ["ch", "core"],
                },
              },
            },
            required: ["chars", "world", "rules", "arc", "chapter_cores"],
          },
        },
      });
      const parsed = cleanAndParseJSON(response.text || "{}");
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

  getIllustrationPrompt(
    chapterContent: string,
    numScenes: number,
    characters: Character[],
  ): string {
    let characterInfoBlock = "";
    if (characters.length > 0) {
      characterInfoBlock =
        "### 参考角色信息 (Thông tin nhân vật tham khảo):\n---\n";
      characters.forEach((c) => {
        characterInfoBlock += `- Tên nhân vật: ${c.name}\n`;
        if (c.role) characterInfoBlock += `  - Vai trò: ${c.role}\n`;
        if (c.appearance?.general)
          characterInfoBlock += `  - Ngoại hình: ${c.appearance.general}\n`;
        if (c.appearance?.clothing)
          characterInfoBlock += `  - Trang phục: ${c.appearance.clothing}\n`;
        if (c.core_personality)
          characterInfoBlock += `  - Tính cách: ${c.core_personality}\n`;
        if (c.loraTag) characterInfoBlock += `  - LoRA Tag: ${c.loraTag}\n`;
        if (c.triggerWords)
          characterInfoBlock += `  - Trigger Words: ${c.triggerWords}\n`;
        if (c.promptExamples && c.promptExamples.length > 0) {
          characterInfoBlock += `  - Prompt Examples:\n`;
          c.promptExamples.forEach((pe, idx) => {
            const promptText = typeof pe === 'string' ? pe : (pe as any).sdPrompt || "";
            characterInfoBlock += `    ${idx + 1}. ${promptText}\n`;
          });
        }
      });
      characterInfoBlock += "---\n";
    }

    const prompt = `
    # Role: Stable diffusion提示词编写大师
    
    ## Profile

    - Author: Andy
    - Version: 0.2
    - Language: 中文
    - Description: 掌握Stable diffusion的提示词编写技能，助你轻松编写提示词，生成高质量AI绘画作品的Stable diffusion提示词编写大师。

    ### 掌握提示词的编写规则与一般语法
    -提示词一般以词组（关键词）为单位，不需要完整的句子和语法结构。
    -提示词之间，需要用“,”分隔。
    -单个提示词的权重一般默 nhận là 1，一般写法为（Prompt A:X)，表示为Prompt A的权重为“X”。其中X合理取值范围在[0.4,1.5]，当X=1时，则不需要“()”和1，只填写Prompt A即可；当1＜X≤1.5时，表示权重增加；反之，当0.4≤X＜1时，则表示权重减少。

    ### 掌握提示词的书写格式
    1.画面提示词的书写格式：人物及主体特征+场景特征+环境光照+画幅视角+画质增强+画面风格。
    人物及主体特征：服饰穿搭（如white dress)、发型发色(如short hair、blue hair)、五官特点(如black eyes、open mouth、big ears...)、面部表情(smiling、sad、hopeful...)、肢体动作(如walk、run、jump、talk、write...)等。
    -场景特征：室内/室外(indoor/out door)、大场景(如forest、city、street...)、小细节(如trees、cars...)。
    -环境光照：白天/黑夜(day/night)、特定时段(如morning、sunset、sunrise...)、光环境(如sunlight、moonlight、bright、dark...)、天空(如blue sky、starry sky...)、天气状况(如windy、sunny、snowy、rainy...)。
    -画幅视角：人物比例(如full body、upper body...)、观察视角(如from above、view of back、look at audience...)、镜头景别（如long shot、close up、full length shot...)。
    -画质增强：如8k、best quality、ultra-detailed、masterpiece...
    -画面风格：插画风(如illstration、painting、paintbrush...)、二次元(如anime、comic、game CG...）、写实风(如photorealistic、realistics、photograph...)。

    ## Rules
    1.提示词部分使用英文表述，且它们之间用","分隔
    2.严格按照提示词的书写格式，编写提示词。
    3.提示词末尾固定加入“nice hands,perfect hands,8k,Best quality”
    4.如果画面中哪个提示词比较重要，请给该提示词增加小括号，并为其赋予权重值，权重值在1.1-1.5之间，如(blue hair:1.2),(flowrs:1.1)...ect.

    ## Workflow
    1.为用户提供两种提示词生成模式：单图模式与绘本模式。
    -若用户选择“单图模式”，根据用户给出的主题或文本，进行充分联想，发挥想象，构思画面，生成1条参考提示词。
    -若用户选择“绘本模式”，则根据用户给定的主题，以分镜的方式创作绘本故事，且为绘本故事生成多个插图的提示词，且以表格的形式，清晰的逻辑呈现给用户。表格应包括插画的序号、故事的文本描述以及画面提示词。
    2.针对用户选择的生成模式和主题，匹配最佳的画面风格。
    3.生成画面提示词，并严格遵循提示词的书写格式：人物及主体特征+场景特征+环境光照+画幅视角+画质增强+画面风格。比如描述“一个在草地上唱歌的女孩”，画面提示词示例如下：1girl,(white dress:1.2),long and blue hair,black eyes,Open mouth,excited,(Singing:1.3),outdoor,Grassland,Flowers,(butterfly:1.1)，blue sky,Morning light,windy,full body,look at audience,nice hands,perfect hands,8k,Best quality,illustration.

    ## Initialization
    作为角色，使用默认语言与用户对话，友好地欢迎用户。用最简单的语言介绍自己，无需介绍提示词的编写规则和格式，仅为用户提供“单图模式”与“绘本模式”两个选项进行创作。
    
    ## Helpful tags I use (generating images with subject):
    SFW (can be used for NSFW as well)
    solo / solo focus: only one subject in image / focus on one subject

    intricate details: gives small details

    4k / 8k / 16k: really depends on the model but it's useful when capturing wide angle view such as scenery. It also slightly helps when characters are slightly far from viewer (full body).

    close-up: you usually want to add detailed tags to the place you want a close-up shot of (ex: close-up shot of open mouth would be [open mouth, uvula, throat]), but sometimes there aren't as much details you can put into and that's when I use them.

    *subject or body part* focus: I usually use it with close-up tag but use it when I want to capture and focus specific parts but still captures others in the background (ex: when its overhead view of subjects head but also captures their chest and feet).

    small face: usually gives smaller face of the subject by either shifting their body backwards or literally shrinking the face.

    Positions: this tag is bit more complicated depending on what kind of pose you want the character to take.

    lying on back / on stomach / on side. You can also add upside-down to have head focus.

    standing / walking: it does what it states.

    running: it runs! You can add motion lines or emphasis lines for action shots.

    etc: there's too many position for me to cover ;;

    Camera angles: (special thanks to NanashiAnon)
    This one is VERY important. It's also important to combine with "facing *direction*"

    from top / below / side / behind: where do you want to place the camera? These are basic tags but you can add more detailed angles such as:

    full body: captures the subject from head to toe

    low angle view: shots from below

    overhead view: great top-down view

    dutch angle: Angled shot. Helps add movement to the image.

    Partially capturing subject:

    upper body / lower body: captures the subject's waist-ish and up / captures the subject's waist-ish and below

    portrait: captures the subject's chest or armpit and above

    cowboy shot: captures the subject's thigh and above

    *body part* out of frame: specific body part will be excluded from the frame

    head / hand(s) / foot / feet / etc...

    *Clothing*: I'll go over this in another article since it is a bit complicated depending on the model

    NSFW
    mature / adult: it's an etiquette. Let's generate and experience pleasant NSFW images.

    completely nude: butt naked!

    *size* breasts: small / medium / large: Breast size correlates to character size so beware when using "small breasts". It should be fine as long as it has mature and adult tag in it but it really depends on the model. AI isn't perfect. Personally I like medium to semi large :)

    pussy / clitoris / anus: really depends on model. NSFW model will auto generate it if other tags are stating that the person is flashing the area (ex: spread legs)

    vaginal / anal: more important than "sex" tag. Make sure to add "penis" or other object tag.

    pov: you are the one in action.

    disembodied *body part*: one of my favorite tag. It sounds SUS but it's not. It gives flexibility to angles and positions without blocking views.

    hands: "breast grab", "spread pussy", "leg grab"... whatever you want to grab.
    You can also grab me a cup of coffee!

    tongue: usually I use it for licking body parts. Useful for "cunnilingus" as well

    penis: another great tag for penetration from impossible angles. Quite useful for group sex as well.

    motion lines: You'd want movement and action in your image.

    bouncing *body parts*: breasts / ass / testicles

    unaligned *body parts*: breasts / ass / testicles

    ## Một số background, trang phục ,tư thế sử dụng;
    1. Background (Nền) – Đủ mọi loại

    Trong nhà: bedroom, living room, kitchen, bathroom, toilet, onsen, hot spring, shower, bathtub, office, classroom, school desk, library, throne room, royal chamber, hotel room, luxury suite
    Ngoài trời: park, forest, jungle, mountain, beach, seaside, swimming pool, street, alley, rooftop, balcony, garden, cherry blossom tree, snow field, desert, spaceship interior, moon surface, outer space, castle balcony
    Khác: stage, runway, gym, dojo, temple, ancient ruin, cyberpunk city, fantasy tavern, dungeon, laboratory

    Ví dụ dùng: (blurry background:1.2), detailed background, indoor, dim lighting, outdoor, sunset, golden hour
    2. Trang phục & Outfit (Đủ mọi thể loại)

    Cổ điển / Công sở: school uniform, sailor uniform, office lady, pencil skirt, blouse, suit jacket, secretary outfit, teacher outfit
    Sexy / Lingerie: bikini, micro bikini, lingerie, lace lingerie, babydoll, see-through lingerie, bra and panties, garter belt, stockings, pantyhose, fishnet
    Cosplay / Fantasy: maid outfit, bunny suit (rabbit ears + leotard), nurse outfit, cheongsam (china dress), kimono, yukata, off-shoulder kimono, hanfu, miko outfit, magical girl, fairy dress, queen dress, battle armor (sexy version)
    Khác: naked, nude, fully nude, bottomless, topless, open shirt, unbuttoned shirt, torn clothes, wet clothes, sweaty clothes, cowboy hat + bikini, police uniform, swimsuit, sportswear, hoodie only, apron only, collar + leash

    Ví dụ dùng: naked towel, open robe, see-through clothes, (bra visible through clothes:0.7)
    3. Góc nhìn (Camera Angles) – Rất quan trọng cho SDXL

    looking at viewer, pov, from below (low angle), from above (high angle), bird's eye view, worm's eye view
    from side, profile, three quarter view, rear view, back view, looking back
    cowboy shot, medium shot, upper body, full body, close-up face, close-up breasts

    4. Tư thế cơ bản + Sexy (Pose)
    Đứng (Standing): standing, standing straight, legs together, legs apart, contrapposto, weight shift, hands on hips, arms crossed, leaning against wall
    Ngồi (Sitting): sitting, sitting on chair, sitting on bed, sitting on desk, legs crossed, knees together, legs spread while sitting, straddling chair
    Nằm (Lying): lying on back, lying on stomach, lying on side, supine, prone, on bed, (lying:1.2), fetal position
    Dạng háng / Spread: spread legs, wide spread legs, knees up, M shaped legs, bowlegged, legs apart
    Dơ nách (Armpit): arms up, hands behind head, armpits, spread armpit, armpit focus
    Chổng mông / Ass: bent over, all fours, on all fours, hands and knees, ass focus, hips pushed back, ass up face down, from behind
    Khác: arched back, chest out, leaning forward, squatting, kneeling, hands on knees, stretching, walking, running pose
    
    5. Tư thế làm tình (Sex Poses) – Phổ biến & thực tế trên Civitai
    Missionary: missionary position, legs on shoulders, mating press, deep missionary, full nelson, legs together missionary
    Cowgirl: cowgirl position, reverse cowgirl, straddling, woman on top, riding, bouncing
    Doggy: doggystyle, standing doggy, prone bone, from behind, rear entry, ass up face down
    Standing: standing sex, standing missionary, against wall, pinned against wall, lifted leg sex, carry sex
    Side / Khác: spooning, side fuck, piledriver, amazon position, lotus position sex, facesitting, 69 position, paizuri (titjob), blowjob pose, handjob pose
    POV: pov missionary, pov cowgirl, pov doggystyle, pov from below, pov looking down, pov hands

    ### Nội dung chương:
    ---
    ${chapterContent}
    ---
    ${characterInfoBlock}

    Vui lòng trích xuất từ nội dung chương và tạo một mảng JSON gồm ${numScenes} cảnh để vẽ minh họa.
    Mỗi cảnh cần có:
    - "scene_description": Mô tả ngắn gọn cảnh bằng tiếng Việt.
    - "NearestPromptExample": Từ danh sách "Prompt Examples" của các nhân vật xuất hiện trong cảnh (được cung cấp trong phần thông tin tham khảo), BẮT BUỘC chọn ra 1 prompt example gần nhất với "scene_description". Bạn PHẢI COPY PASTE CHÍNH XÁC TUYỆT ĐỐI prompt example đó vào đây. CẤM THAY ĐỔI, THÊM, SỬA, XÓA, CẮT BỚT HOẶC THÊM MỚI. Nếu không có prompt example nào, hãy để trống.
    - "TruePrompt": Đây là bản sửa lại của "NearestPromptExample" để phù hợp chính xác với "scene_description". Yêu cầu sửa chỉ ở mức độ THIỂU SỐ, ít nhất có thể. Chỉ được sửa các từ khóa về: background, trang phục, tư thế nhân vật để giống với scene_description. Còn lại các từ khóa khác (đặc biệt là trigger words, lora tag, đặc điểm ngoại hình cốt lõi) vẫn phải giữ nguyên, BÊ NGUYÊN Y XỲ ĐÚC TỪ "NearestPromptExample". Nếu "NearestPromptExample" trống, hãy tự viết một prompt hoàn toàn mới theo quy tắc đã cho, và BẮT BUỘC phải thêm toàn bộ "Trigger Words" và "LoRA Tag" của nhân vật vào cuối prompt.
    - "insertion_line_number": Số thứ tự dòng (tính từ 1, dựa trên các đoạn văn được phân tách bằng dấu xuống dòng) phù hợp nhất để chèn ảnh này.
    - "appearing_characters": Mảng tên các nhân vật xuất hiện trong cảnh.

    Chỉ trả về mảng JSON.
    `;
    return prompt;
  }

  async generateIllustrationPrompts(
    chapterContent: string,
    numScenes: number,
    characters: Character[],
  ): Promise<{ scenes: any[]; prompt: string }> {
    const ai = this.getAI();
    const prompt = this.getIllustrationPrompt(chapterContent, numScenes, characters);

    try {
      const response = await ai.models.generateContent({
        model: this.getModel(),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scene_description: { type: Type.STRING },
                NearestPromptExample: { type: Type.STRING },
                TruePrompt: { type: Type.STRING },
                insertion_line_number: { type: Type.INTEGER },
                appearing_characters: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                "scene_description",
                "NearestPromptExample",
                "TruePrompt",
                "insertion_line_number",
                "appearing_characters",
              ],
            },
          },
        },
      });
      const parsed = cleanAndParseJSON(response.text || "[]");
      // Map TruePrompt to prompt for backward compatibility with the rest of the app
      const scenes = parsed.map((scene: any) => ({
        ...scene,
        prompt: scene.TruePrompt || scene.prompt || scene.NearestPromptExample || "",
      }));
      return { scenes, prompt };
    } catch (e) {
      console.error("generateIllustrationPrompts failed", e);
      return { scenes: [], prompt };
    }
  }

  async generateImage(
    prompt: string,
    aspectRatio: string = "1:1",
    referenceImages?: { data: string; mimeType: string }[],
    onProgress?: (progress: number, previewBase64: string | null) => void,
  ): Promise<string | null> {
    try {
      if (!this.config?.sdWebuiUrl) {
        throw new Error("SD WebUI URL is not configured in Settings.");
      }
      let sdWebuiUrl = this.config.sdWebuiUrl.replace(/\/$/, "");

      const payload = {
        prompt: prompt,
        negative_prompt:
          "(worst quality:1.4), (low quality:1.4), (normal quality:1.2), lowres, bad anatomy, bad hands, bad feet, bad proportions, bad face, deformed, disfigured, mutated, ugly, mutated hands, mutated fingers, extra fingers, fewer fingers, extra limbs, missing limbs, extra arms, extra legs, fused fingers, too many fingers, long neck, long body, gross proportions, malformed limbs, blurry, out of focus, jpeg artifacts, compression artifacts, watermark, text, signature, username, artist name, logo, scan artifacts, monochrome, greyscale, sketch, comic, multiple views, 2koma, 4koma, error, cropped, worst face, poorly drawn face, poorly drawn hands, deformed eyes, bad eyes, extra digits, fewer digits",
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
          if (!res.ok)
            throw new Error(`SD API error: ${res.status} ${res.statusText}`);
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
          const progressRes = await fetch(
            `${sdWebuiUrl}/sdapi/v1/progress?skip_current_image=false`,
            { headers },
          );
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            if (onProgress) {
              const progress = progressData.progress || 0;
              const currentImage = progressData.current_image
                ? `data:image/png;base64,${progressData.current_image}`
                : null;
              onProgress(progress, currentImage);
            }
          }
        } catch (e) {
          // Ignore polling errors
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      if (fetchError) {
        console.error("SD WebUI fetch error:", fetchError);
        throw new Error(
          `Không thể kết nối đến SD WebUI (${fetchError.message}). Vui lòng kiểm tra lại URL trong Cài đặt, đảm bảo server đang chạy và đã bật CORS (--api --cors-allow-origins="*").`,
        );
      }

      if (finalResult && finalResult.images && finalResult.images.length > 0) {
        return `data:image/png;base64,${finalResult.images[0]}`;
      }

      throw new Error("SD WebUI returned no images.");
    } catch (sdErr) {
      console.error(
        "Stable Diffusion generation failed, falling back to Gemini:",
        sdErr,
      );

      // Default to Gemini Image Generation
      try {
        const ai = this.getAI();
        const parts: any[] = [];

        if (referenceImages && referenceImages.length > 0) {
          for (const ref of referenceImages) {
            parts.push({
              inlineData: {
                data: ref.data.split(",")[1] || ref.data,
                mimeType: ref.mimeType,
              },
            });
          }
        }

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: this.config?.geminiImageModel || "gemini-2.5-flash-image",
          contents: {
            parts: parts,
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
            },
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }

        return null;
      } catch (geminiErr) {
        console.error("Gemini Image generation failed:", geminiErr);
        return null;
      }
    }
  }

  async updateStoryBible(chapterContent: string): Promise<{
    chapter_core: string;
    new_chars?: import("../../types").StoryBibleChar[];
    arc_update?: string;
  }> {
    const ai = this.getAI();
    const prompt = `
    Hãy đọc lại chương mà bạn vừa viết xong. Vui lòng trả về dưới dạng JSON, trích xuất các sự kiện chính của chương này, xác định bất kỳ nhân vật mới nào (nếu có) và cập nhật trạng thái hiện tại của chương (nếu có bất kỳ thay đổi đáng kể nào). Toàn bộ nội dung phải được xuất ra bằng tiếng Việt.
    
    【Nội dung chương】
    ${chapterContent}
    `;

    try {
      const response = await ai.models.generateContent({
        model: this.getModel(),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chapter_core: {
                type: Type.STRING,
                description:
                  "Tóm tắt các sự kiện chính của chương này trong một câu",
              },
              new_chars: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    core: { type: Type.STRING },
                  },
                  required: ["name", "role", "core"],
                },
                description:
                  "Chương này giới thiệu một nhân vật mới quan trọng lần đầu tiên; nếu không, mảng sẽ trống.",
              },
              arc_update: {
                type: Type.STRING,
                description:
                  "Thông tin cập nhật ngắn gọn về tình trạng hiện tại của chương; để trống nếu không có thay đổi lớn.",
              },
            },
            required: ["chapter_core"],
          },
        },
      });
      const parsed = cleanAndParseJSON(response.text || "{}");
      if (parsed.new_chars && Array.isArray(parsed.new_chars)) {
        parsed.new_chars = autoAssignLoraToCharacters(parsed.new_chars);
      }
      return parsed;
    } catch (e) {
      console.error("updateStoryBible failed", e);
      return { chapter_core: "" };
    }
  }

  async *generateSachHiepStoryStream(
    recentContext: string,
    oldCores: string,
    charSnippet: string,
    storyBible: import("../../types").StoryBible,
    genre: string,
    writingStyle: string,
    pov: string,
    pronounStyle: string,
    negativePrompt: string,
    nsfw: boolean,
    userInstruction: string,
    currentChapterTitle: string,
    modelName?: string,
  ): AsyncGenerator<{
    text: string;
    thought?: string;
    usageMetadata: any;
    storyContinuePlan?: import("../../types").StoryContinuePlan;
    raw?: string;
  }> {
    const systemInstruction =
      sachHiepPromptBuilderService.buildSystemInstruction(
        genre,
        storyBible.world,
        pov,
        pronounStyle,
        writingStyle,
        negativePrompt,
        nsfw,
      );

    const prompt = sachHiepPromptBuilderService.buildContinuePrompt(
      recentContext,
      oldCores,
      storyBible.world,
      charSnippet, // Pass the enriched character snippet here
      storyBible.arc, // synopsis
      [], // characters
      [], // worldLore
      userInstruction,
      pronounStyle,
      currentChapterTitle,
      modelName || this.getModel(),
    );

    const ai = this.getAI();
    const config = {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          part1: {
            type: Type.OBJECT,
            properties: {
              part_script: { type: Type.STRING },
              thought_process: { type: Type.STRING },
              part_story_content: { type: Type.STRING },
            },
            required: ["part_script", "thought_process", "part_story_content"],
          },
          part2: {
            type: Type.OBJECT,
            properties: {
              part_script: { type: Type.STRING },
              thought_process: { type: Type.STRING },
              part_story_content: { type: Type.STRING },
            },
            required: ["part_script", "thought_process", "part_story_content"],
          },
          part3: {
            type: Type.OBJECT,
            properties: {
              part_script: { type: Type.STRING },
              thought_process: { type: Type.STRING },
              part_story_content: { type: Type.STRING },
            },
            required: ["part_script", "thought_process", "part_story_content"],
          },
          story_continue_plan: {
            type: Type.OBJECT,
            properties: {
              LoveOrGoodRoute: {
                type: Type.OBJECT,
                properties: {
                  CharacterComment: { type: Type.STRING },
                  ContinuePlan: { type: Type.STRING },
                },
                required: ["CharacterComment", "ContinuePlan"],
              },
              NtrOrBadRoute: {
                type: Type.OBJECT,
                properties: {
                  CharacterComment: { type: Type.STRING },
                  ContinuePlan: { type: Type.STRING },
                },
                required: ["CharacterComment", "ContinuePlan"],
              },
              SupriseOrNeutralRoute: {
                type: Type.OBJECT,
                properties: {
                  CharacterComment: { type: Type.STRING },
                  ContinuePlan: { type: Type.STRING },
                },
                required: ["CharacterComment", "ContinuePlan"],
              },
            },
            required: [
              "LoveOrGoodRoute",
              "NtrOrBadRoute",
              "SupriseOrNeutralRoute",
            ],
          },
        },
        required: ["part1", "part2", "part3", "story_continue_plan"],
      },
    };

    const responseStream = await ai.models.generateContentStream({
      model: this.getModel(),
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: config,
    });

    let fullRawText = "";
    let lastStoryContent = "";
    let lastThoughtProcess = "";

    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullRawText += chunk.text;
        try {
          const partial = partialParse(fullRawText);

          // Handle thought process (combined from parts)
          const p1_thought = partial.part1?.thought_process || "";
          const p2_thought = partial.part2?.thought_process || "";
          const p3_thought = partial.part3?.thought_process || "";
          const currentThought =
            p1_thought +
            (p2_thought ? "\n" + p2_thought : "") +
            (p3_thought ? "\n" + p3_thought : "");

          if (currentThought.length > lastThoughtProcess.length) {
            const delta = currentThought.substring(lastThoughtProcess.length);
            yield {
              text: "",
              thought: delta,
              usageMetadata: chunk.usageMetadata,
              raw: fullRawText,
            };
            lastThoughtProcess = currentThought;
          }

          // Handle story content (combined from parts)
          const p1_content = partial.part1?.part_story_content || "";
          const p2_content = partial.part2?.part_story_content || "";
          const p3_content = partial.part3?.part_story_content || "";
          const currentStoryContent =
            p1_content +
            (p2_content ? "\n\n" + p2_content : "") +
            (p3_content ? "\n\n" + p3_content : "");

          if (currentStoryContent.length > lastStoryContent.length) {
            const delta = currentStoryContent.substring(
              lastStoryContent.length,
            );
            yield {
              text: delta,
              usageMetadata: chunk.usageMetadata,
              raw: fullRawText,
            };
            lastStoryContent = currentStoryContent;
          }
        } catch (e) {
          // Silent catch for partial parsing errors during streaming
        }
      }
    }

    // Final pass to ensure everything is captured and yield the plan
    try {
      const finalData = cleanAndParseJSON(fullRawText);
      if (finalData.story_continue_plan) {
        yield {
          text: "",
          usageMetadata: {},
          storyContinuePlan: finalData.story_continue_plan,
          raw: fullRawText,
        };
      }
    } catch (e) {
      console.error("Final JSON parse failed", e);
    }
  }
}

