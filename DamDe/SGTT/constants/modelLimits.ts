
export interface ModelLimit {
  chapterLimit: number;
  promptLimit: number;
}

export const MODEL_LIMITS: Record<string, ModelLimit> = {
  'gemini-3.1-flash-lite-preview': {
    chapterLimit: 5000,
    promptLimit: 10000,
  },
  'gemini-3-flash-preview': {
    chapterLimit: 10000,
    promptLimit: 15000,
  },
  'gemini-3.1-pro-preview': {
    chapterLimit: 30000,
    promptLimit: 40000,
  },
  'gemini-2.5-pro': {
    chapterLimit: 30000,
    promptLimit: 40000,
  },
  'gemini-2.5-flash': {
    chapterLimit: 10000,
    promptLimit: 15000,
  },
  'gemini-2.5-flash-lite': {
    chapterLimit: 5000,
    promptLimit: 10000,
  },
  'gemini-3.5-flash-lite': {
    chapterLimit: 5000,
    promptLimit: 10000,
  },
  'gemma-4-31b-it': {
    chapterLimit: 10000,
    promptLimit: 15000,
  },
};

export const DEFAULT_LIMIT: ModelLimit = {
  chapterLimit: 10000,
  promptLimit: 15000,
};

export function getModelLimit(modelName: string): ModelLimit {
  if (!modelName) return DEFAULT_LIMIT;
  const lower = modelName.toLowerCase();
  
  // Specific matches first
  if (MODEL_LIMITS[modelName]) return MODEL_LIMITS[modelName];
  
  // Pattern matching
  if (lower.includes('lite')) return MODEL_LIMITS['gemini-3.5-flash-lite'];
  if (lower.includes('pro')) return MODEL_LIMITS['gemini-3.1-pro-preview'];
  
  // Default to Flash limits for anything else (including "flash" in name or unknown)
  return MODEL_LIMITS['gemini-3-flash-preview'];
}

export function truncateToWords(text: string, maxChars: number): string {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return "..." + text.substring(text.length - maxChars);
}
