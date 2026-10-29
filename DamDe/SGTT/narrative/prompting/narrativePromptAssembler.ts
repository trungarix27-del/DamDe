import { Character, EntityRegistry } from '../../types';
import { NSFW_INSTRUCTION } from './contentSafetyRules';
import { getModelLimit, truncateToWords } from '../../constants/modelLimits';

export const promptBuilderService = {
  buildSystemInstruction: (
    genre: string, 
    setting: string, 
    pov: string, 
    pronounStyle: string, 
    writingStyle: string,
    negativePrompt: string,
    nsfw: boolean = false,
    sourceUrl?: string,
    entityRegistry?: EntityRegistry
  ): string => {
    const contentRating = nsfw 
        ? NSFW_INSTRUCTION
        : "CHẾ ĐỘ AN TOÀN: BẬT. Giữ nội dung phù hợp (PG-13). Tuyệt đối không có mô tả chi tiết về tình dục.";
    
    // EXISTENCE LOCK LOGIC
    let existenceLock = "";
    if (sourceUrl || entityRegistry) {
        existenceLock = `
### 🔒 EXISTENCE LOCK: ENGAGED (KHÓA THỰC THỂ)
Bạn đang viết Đồng nhân (Fanfiction) dựa trên nguồn dữ liệu có sẵn.
1. **CẤM SÁNG TẠO NHÂN VẬT/ĐỊA DANH MỚI:** Bạn KHÔNG ĐƯỢC PHÉP tự ý bịa ra tên riêng (Proper Nouns) cho nhân vật, địa điểm, tổ chức không có trong Canon.
2. **XỬ LÝ VAI PHỤ:** Nếu cốt truyện cần nhân vật phụ (lính gác, chủ quán...), hãy dùng danh từ chung (NPC vô danh). VD: "tên lính gác", "bà chủ quán", "gã ăn mày". KHÔNG ĐƯỢC đặt tên riêng cho họ (VD: KHÔNG viết "Lính gác Nguyễn Văn A").
3. **DANH SÁCH ĐƯỢC PHÉP DÙNG (WHITELIST):** Chỉ được sử dụng các tên riêng dưới đây (hoặc đã có trong Context):
   - **Nhân vật:** ${entityRegistry?.characters?.join(', ') || "Theo Context"}
   - **Địa danh:** ${entityRegistry?.locations?.join(', ') || "Theo Context"}
   - **Tổ chức:** ${entityRegistry?.factions?.join(', ') || "Theo Context"}
`;
    }

    const fanficInstruction = sourceUrl 
        ? `
### 🦄 CHẾ ĐỘ ĐỒNG NHÂN (FANFICTION MODE) - NGHIÊM NGẶT
Truyện này dựa trên nguồn: [${sourceUrl}].
1. **LUẬT THẾ GIỚI (CANON RULES):** Nếu Context cung cấp [LUẬT CANON], bạn phải tuân thủ tuyệt đối. Không được tự ý chế ra hệ thống sức mạnh mới mâu thuẫn với bản gốc.
2. **TÍNH CÁCH NHÂN VẬT (CANON CORE):** Nếu Context cung cấp [HỒ SƠ CANON], nhân vật phải hành động đúng với mô tả đó (OOC Check). Không được để kẻ máu lạnh hành xử ủy mị, kẻ ngu ngốc hành xử thông minh đột xuất.
`
        : "";

    return `
=== HỆ ĐIỀU HÀNH KỂ CHUYỆN AETHERIA (V3.3 - Canon-Locked) ===

🎭 **THỂ LOẠI:** ${genre}
🌍 **BỐI CẢNH TỔNG QUÁT (WORLD BIBLE):**
${setting}

👁️ **GÓC NHÌN (POV):** ${pov}
✍️ **VĂN PHONG (STYLE):** ${writingStyle}

🚫 **ĐIỀU CẤM (NEGATIVE):** ${negativePrompt}

${contentRating}
${fanficInstruction}
${existenceLock}

🗣️ **QUY TẮC XƯNG HÔ & HỘI THOẠI (BẮT BUỘC):**
${pronounStyle}

NHIỆM VỤ CỦA BẠN:
Bạn là một tiểu thuyết gia đại tài. Hãy viết tiếp câu chuyện dựa trên ngữ cảnh được cung cấp.
- **Quan trọng:** Phân biệt rõ ràng giữa "Sự thật Canon" (không thể đổi) và "Diễn biến cốt truyện" (sáng tạo).
- **Tuân thủ Whitelist:** Nếu tên riêng không có trong danh sách cho phép hoặc Context, TUYỆT ĐỐI KHÔNG DÙNG.
- "Show, don't tell": Đừng kể lể, hãy miêu tả hành động để bộc lộ cảm xúc.
- Giữ mạch truyện logic, liền mạch với phần trước.
`;
  },

  buildContinuePrompt: (
    immediateContext: string,
    rollingSummaries: string,
    worldBible: string,
    augmentedContext: string,
    synopsis: string,
    characters: Character[],
    worldLore: string[],
    userInstruction: string,
    pronounStyle: string,
    currentChapterTitle: string,
    modelName: string = ""
  ): string => {
    const limit = getModelLimit(modelName);
    const contextLimit = Math.floor(limit.promptLimit * 0.7);
    const summaryLimit = Math.floor(limit.promptLimit * 0.3);
    
    const truncatedContext = truncateToWords(immediateContext, contextLimit);
    const truncatedSummaries = truncateToWords(rollingSummaries, summaryLimit);

    return `
### 📚 TÓM TẮT CÁC CHƯƠNG TRƯỚC:
${truncatedSummaries}

### ⚡ DỮ LIỆU CANON & NGUYÊN TÁC (THAM KHẢO):
*Lưu ý: Dữ liệu dưới đây chứa các Luật Canon và Văn phong gốc để bạn bắt chước style (nếu có). Đây là tư liệu tham khảo, KHÔNG phải là nội dung bạn đã viết.*
${augmentedContext}
${worldLore.length > 0 ? '\n[LORE ĐƯỢC GHIM]:\n' + worldLore.join('\n') : ''}

### 📝 NGỮ CẢNH TRỰC TIẾP (VỪA XẢY RA):
${truncatedContext}

---
### 🎬 CHỈ ĐẠO CỦA ĐẠO DIỄN (USER INSTRUCTION):
"${userInstruction || "Hãy viết tiếp mạch truyện một cách tự nhiên, logic và hấp dẫn."}"

NHIỆM VỤ CỤ THỂ:
- Bạn đang viết nội dung cho chương: **"${currentChapterTitle}"**.
- Hãy tập trung triển khai diễn biến cho riêng chương này.
- **TUYỆT ĐỐI KHÔNG** tự ý tạo tiêu đề chương mới (VD: "### Chương 2", "### Chương tiếp theo") trừ khi Đạo diễn yêu cầu rõ ràng.
- Viết tiếp liền mạch từ điểm kết thúc của "NGỮ CẢNH TRỰC TIẾP". Không lặp lại đoạn cũ.
    `;
  },

  buildRewritePrompt: (
    originalText: string,
    instruction: string,
    characters: Character[],
    worldLore: string[],
    worldBible: string,
    synopsis: string,
    pronounStyle: string
  ): string => {
     return `
Bạn là biên tập viên văn học cao cấp.
Nhiệm vụ: Viết lại đoạn văn sau theo yêu cầu.

### YÊU CẦU CỤ THỂ:
"${instruction}"

### VĂN BẢN GỐC:
${originalText}

Hãy giữ nguyên các tình tiết cốt lõi (trừ khi được yêu cầu thay đổi), nhưng cải thiện văn phong, từ ngữ và nhịp điệu.
    `;
  },

  buildExtractionSystemInstruction: (pronounStyle: string): string => {
      return `
Bạn là chuyên gia phân tích tâm lý nhân vật và xây dựng hồ sơ RPG.
Nhiệm vụ: Đọc văn bản và trích xuất thông tin nhân vật thành JSON.
Hệ thống xưng hô trong văn bản: ${pronounStyle}
    `;
  },

  buildSummarySystemInstruction: (pronounStyle: string): string => {
      return `
Bạn là thư ký tóm tắt văn học.
Nhiệm vụ: Tóm tắt lại chương truyện một cách cô đọng nhưng đầy đủ tình tiết chính để AI có thể nhớ được trong tương lai.
Giữ lại các tên riêng, địa danh, chiêu thức quan trọng.
Hệ thống xưng hô: ${pronounStyle}
    `;
  }
};