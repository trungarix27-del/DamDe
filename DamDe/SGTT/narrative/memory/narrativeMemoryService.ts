import { VectorData } from '../../types';

/**
 * Tính toán độ lớn của Vector (Magnitude)
 */
export const getMagnitude = (vec: number[]): number => {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
};

/**
 * Tính toán độ tương đồng Cosine tối ưu hóa
 */
const cosineSimilarityOptimized = (vecA: number[], vecB: number[], normA: number, normB: number): number => {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
};

export interface SearchOptions {
  topK?: number;
  focusCharacterIds?: string[]; 
  minScore?: number;
  currentPov?: string;
  maxChunksPerSource?: number; 
}

// Cấu hình (Memory Decay) - Canon Data không bao giờ bị quên (Decay = 0)
const DECAY_RATES: Record<string, number> = {
  'lore': 0,           
  'canon_core': 0,     // Tuyệt đối không quên tính cách nhân vật
  'canon_rule': 0,     // Tuyệt đối không quên luật thế giới
  'canon_rel': 0,      // Tuyệt đối không quên quan hệ
  'source_material': 0.001, // Dữ liệu thô ít quan trọng hơn
  'character': 0,      
  'summary': 0.002,    
  'chapter': 0.015,    
  'beat': 0.08,        
};

/**
 * Điểm số tối thiểu cho phép đối với từng loại dữ liệu
 */
const MIN_SCORE_BY_TYPE: Record<string, number> = {
  'canon_core': 0.50, // Ưu tiên tìm thấy hơn là chính xác tuyệt đối
  'canon_rule': 0.52,
  'canon_rel': 0.52,
  'lore': 0.60,
  'source_material': 0.60, 
  'character': 0.58,
  'summary': 0.55,
  'chapter': 0.52,
  'beat': 0.48,
};

export const narrativeMemoryService = {
  /**
   * Tìm kiếm các đoạn ký ức
   */
  search: (
    queryEmbedding: number[], 
    vectors: VectorData[], 
    options: SearchOptions = {}
  ): VectorData[] => {
    if (vectors.length === 0) return [];
    
    const { 
      topK = 6, 
      focusCharacterIds = [], 
      minScore = 0.52, 
      currentPov = "",
      maxChunksPerSource = 2 
    } = options;

    const queryNorm = getMagnitude(queryEmbedding);
    if (queryNorm === 0) return [];

    const now = Date.now();
    const ONE_DAY_MS = 86400000;

    const scored = vectors.map(v => {
      const vecNorm = v.magnitude || getMagnitude(v.embedding);
      const baseScore = cosineSimilarityOptimized(queryEmbedding, v.embedding, queryNorm, vecNorm);
      
      // 1. Tăng cường dựa trên độ quan trọng (Importance Boost)
      // Canon Core (Importance = 5) sẽ được boost rất mạnh
      const importanceBoost = 1 + ((v.metadata.importance || 1) - 1) * 0.08;

      // 2. Conditional Retrieval: Tăng cường nếu đúng loại nhân vật đang cần tìm
      let charBoost = 1.0;
      if (focusCharacterIds.length > 0 && v.metadata.characterIds) {
        if (v.metadata.characterIds.some(id => focusCharacterIds.includes(id))) {
          // Nếu là Canon Core của nhân vật đang focus -> Boost cực mạnh
          if (v.metadata.type === 'canon_core' || v.metadata.type === 'canon_rel') {
              charBoost = 1.4; 
          } else {
              charBoost = 1.2;
          }
        }
      }

      // 3. Chiến lược khớp Góc nhìn (POV)
      let povBoost = 1.0;
      if (currentPov && v.metadata.pov) {
        povBoost = v.metadata.pov === currentPov ? 1.1 : 0.9;
      }

      // 4. Tính toán Decay
      const type = v.metadata.type;
      const decayRate = DECAY_RATES[type] ?? 0.02; 
      
      let decayMult = 1.0;
      if (decayRate > 0) {
        const daysOld = (now - v.createdAt) / ONE_DAY_MS;
        decayMult = Math.max(0.6, 1 - (daysOld * decayRate));
      }

      // 5. Trọng số cơ bản theo loại dữ liệu (Type Priority)
      let typeMult = 1.0;
      if (type === 'canon_core') typeMult = 1.3; // Tính cách nhân vật là quan trọng nhất
      if (type === 'canon_rule') typeMult = 1.25; // Luật chơi quan trọng nhì
      if (type === 'lore') typeMult = 1.15;
      if (type === 'source_material') typeMult = 0.9; // Hạ thấp ưu tiên của văn bản thô

      const finalScore = baseScore * importanceBoost * charBoost * povBoost * decayMult * typeMult;

      return { item: v, score: finalScore };
    });

    // Sắp xếp theo điểm số giảm dần
    scored.sort((a, b) => b.score - a.score);

    const sourceCounter = new Map<string, number>();
    const results: VectorData[] = [];

    // Filter Logic: Đảm bảo Canon Core luôn xuất hiện nếu điểm đủ cao
    for (const s of scored) {
      const typeMinScore = MIN_SCORE_BY_TYPE[s.item.metadata.type] ?? minScore;
      if (s.score < typeMinScore) continue; 
      
      if (results.length >= topK) break;
      
      // Đảm bảo tính đa dạng (nhưng nới lỏng cho Canon Rule)
      const sourceId = s.item.metadata.referenceId || s.item.id;
      const currentSourceCount = sourceCounter.get(sourceId) || 0;
      
      const typeLimit = (s.item.metadata.type === 'canon_rule' || s.item.metadata.type === 'canon_core') ? 4 : maxChunksPerSource;

      if (currentSourceCount < typeLimit) {
        results.push(s.item);
        sourceCounter.set(sourceId, currentSourceCount + 1);
      }
    }

    return results;
  }
};