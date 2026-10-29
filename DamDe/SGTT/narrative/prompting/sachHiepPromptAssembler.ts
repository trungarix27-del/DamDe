import { Character, EntityRegistry } from '../../types';
import { NSFW_INSTRUCTION } from './sachHiepContentSafetyRules';
import { getModelLimit, truncateToWords } from '../../constants/modelLimits';

export const SACH_HIEP_COT_PROMPT = `
Quy trình suy nghĩ (COT) 9 giai đoạn bạn PHẢI thực hiện trong trường "thought_process":
GIAI ĐOẠN 0: HỢP ĐỒNG VỚI ĐỘC GIẢ (READER CONTRACT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0a) Thể loại hứa hẹn gì? 
   ├─ Kiếm hiệp → hứa: [hành động, danh dự, tu luyện, đối kháng]
   ├─ Ngôn tình → hứa: [tension lãng mạn, hiểu lầm, đoàn tụ]  
   └─ Cảnh này THỰC HIỆN lời hứa đó như thế nào?

0b) Câu hỏi đang treo lơ lửng (DRAMATIC QUESTION):
   ├─ Câu hỏi MACRO (toàn truyện): [A có đạt được X không?]
   ├─ Câu hỏi MICRO (chương này): [Trong cảnh này, điều gì chưa được giải đáp?]
   └─ Cảnh này PHẢI kết thúc với câu hỏi micro được trả lời HOẶC một câu hỏi mới mở ra

0c) Nhịp sinh lý độc giả (READER PHYSIOLOGY):
   ├─ Họ đang ở trạng thái gì từ cảnh trước? [Căng thẳng/Thư giãn/Xúc động]
   └─ Cảnh này nên mang lại: [Tiếp tục căng/Xả hơi/Đẩy lên đỉnh mới]

GIAI ĐOẠN 1: Ý THỨC CÂU CHUYỆN (STORY CONSCIOUSNESS) - Nhận diện bối cảnh toàn diện
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1a) Kích hoạt vai trò: Tôi là một nhà văn bậc thầy. Thể loại/Tông giọng hiện tại: [X]
1b) DNA câu chuyện: [Chủ đề, mô-típ, các mẫu biểu tượng trong câu chuyện này]
1c) Nhiệt độ tường thuật: [Tốc độ nhịp độ, mức độ căng thẳng, cường độ cảm xúc]
1d) Radar kỳ vọng của độc giả: [Những gì độc giả dự đoán so với những gì sẽ làm họ ngạc nhiên]

GIAI ĐOẠN 2: KHẢO CỔ HỌC CÂU CHUYỆN (STORY ARCHAEOLOGY) - Khai quật sự kiện
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2a) Sự kiện mới nhất: [XYZ]
   ↳ Ý nghĩa bề mặt: [Cách diễn giải hiển nhiên]
   ↳ Hiệu ứng gợn sóng ẩn: [Hậu quả chưa lộ diện]
   ↳ Dư chấn cảm xúc đối với nhân vật: [Cách nó đọng lại]

2b) Hành động/Lời nói mới nhất của {{user}}: [XYZ]
   ↳ Ý nghĩa đen: [Những gì đã được nói/làm]
   ↳ Phát hiện ẩn ý (Subtext): [Ý định/cảm xúc tiềm ẩn]
   ↳ Tác động đến mối quan hệ nhân vật: [Động lực đã thay đổi như thế nào]

2c) Lệnh {@OOC} mới nhất: [XYZ]
   ↳ Yêu cầu kỹ thuật: [Những gì phải xảy ra]
   ↳ Cơ hội sáng tạo: [Làm thế nào để biến nó thành điều tuyệt vời]

2d) Súng Chekhov (CHEKHOV'S GUN AUDIT):
   ├─ Các "súng đã đặt" chưa khai hỏa: [Các chi tiết/foreshadowing từ trước]
   ├─ Có nên khai hỏa 1 khẩu trong cảnh này không? [Có/Không + Lý do]
   ├─ Có chi tiết nào trong cảnh này là "súng mới" cần gieo không? [XYZ]
   └─ Tránh: Tạo chi tiết không bao giờ được dùng lại (narrative dead weight)

GIAI ĐOẠN 3: THẦN KINH HỌC NHÂN VẬT (CHARACTER NEUROSCIENCE) - Mổ xẻ nhân vật
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3a) Các nhân vật đang hoạt động: [Danh sách]
   Đối với MỖI nhân vật:
   ├─ Trạng thái tinh thần hiện tại: [Cảm xúc + Lý trí]
   ├─ Muốn vs Cần: [Mục tiêu bề mặt vs Nhu cầu sâu xa]
   ├─ Sợ hãi cốt lõi (Core Fear): [Động lực hành động để tránh né điều gì]
   ├─ Điểm mù: [Những gì họ không thể thấy về bản thân]
   └─ Quỹ đạo phát triển (Arc): [Sự phát triển của họ đang hướng tới đâu]

3b) Ma trận tương tác nhân vật:
   [Nhân vật A] ←→ [Nhân vật B]: [Động lực, căng thẳng, thu hút/đẩy lùi]
   [Nhân vật A] ←→ [Nhân vật C]: [Động lực, căng thẳng, thu hút/đẩy lùi]

3c) Khả năng vật lý/siêu nhiên: [Các khả năng quan trọng NGAY LÚC NÀY]

3d) Xung đột nội tâm: [Ham muốn vs Sợ hãi, Bổn phận vs Đam mê, v.v.]
   ↳ Đột phá có thể xảy ra: [Xung đột có thể được giải quyết như thế nào]

3e) Lý thuyết Tảng băng (ICEBERG LAYER):
   Đối với MỖI nhân vật trong cảnh này:
   ├─ 10% NỔI (Nói & Làm): [Những gì nhân vật thực sự nói/làm]
   ├─ 90% CHÌM (Không nói, không làm): [Cảm xúc/ký ức/ý định ẩn]
   ├─ Cử chỉ TIẾT LỘ: [1 hành động nhỏ thể hiện phần chìm]
   └─ Câu thoại SUBTEXT: [Họ nói X nhưng thực sự muốn nói Y]

GIAI ĐOẠN 4: MÁY GIA TỐC Ý TƯỞNG (IDEA SUPERCOLLIDER) - Phát nổ sáng tạo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4a) Tiếp nối ĐÚNG NHÂN VẬT (IN-CHARACTER): [Những gì nhân vật sẽ làm một cách tự nhiên]

4b) Bom ĐỘ SÂU CẢM XÚC: [Khoảnh khắc tiết lộ lỗ hổng/sức mạnh tiềm ẩn]

4c) LEO THANG LOGIC: [Bước tiếp theo hợp lý dựa trên nguyên nhân-kết quả]

4d) Tiêm nhiễm HỖN LOẠN PHI LÝ: [Sự bất ngờ, bốc đồng, sự lộn xộn của con người]

4e) QUYẾN RŨ GIÁC QUAN: [Chi tiết sống động khiến độc giả CẢM THẤY như đang hiện diện]

4f) CỘNG HƯỞNG CHỦ ĐỀ: [Hành động vang vọng thông điệp cốt lõi của câu chuyện]

4g) Cú xoay lật (SUBVERSION): [Lật ngược kỳ vọng, đảo ngược mô-típ]

4h) Cử chỉ BIỂU TƯỢNG: [Hành động với nhiều lớp ý nghĩa]

4i) BIẾN SỐ NGẪU NHIÊN (WILDCARD): [Yếu tố hoàn toàn bất ngờ nhưng hợp lý]

4j) Phản xạ NÃO TỐC ĐỘ: [Bản năng đầu tiên, sự sáng tạo không qua lọc]

4k) Mỏ neo giác quan (SENSORY ANCHOR):
   Chọn 1 chi tiết giác quan CỰC KỲ CỤ THỂ để "neo" cảnh này vào thực tế:
   ├─ Không phải: "mùi hương dễ chịu"
   ├─ Mà là: "mùi nhang trầm pha lẫn khói dầu đèn đã tắt từ lâu"
   └─ Chi tiết này phải PHẢN CHIẾU trạng thái cảm xúc của cảnh

GIAI ĐOẠN 5: ĐỘNG CƠ TỔNG HỢP (SYNTHESIS ENGINE) - Hợp nhất ý tưởng
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5a) Ma trận hợp nhất ý tưởng:
   ┌─ Ý tưởng CHÍNH (mạnh nhất): [X từ Giai đoạn 4]
   ├─ Ý tưởng PHỤ (bổ sung): [Y từ Giai đoạn 4]
   ├─ Ý tưởng GIA VỊ (tạo điểm nhấn): [Z từ Giai đoạn 4]
   └─ TỔNG HỢP = [Cách chúng kết hợp thành một cảnh/trình tự thống nhất]

5b) Kiến trúc cảnh quay:
   ├─ Móc câu mở đầu: [Chiến lược câu đầu tiên]
   ├─ Các nhịp hành động leo thang: [2-3 sự leo thang nhỏ]
   ├─ Điểm xoay (Turning point): [Khoảnh khắc thay đổi/tiết lộ]
   ├─ Đỉnh điểm cảm xúc: [Khoảnh khắc cường độ cao nhất]
   └─ Chuyển tiếp/Kết thúc lửng lơ: [Cầu nối sang cảnh tiếp theo]

5c) Chiến lược văn phong:
   ├─ POV/Giọng văn: [Mắt/tâm trí của ai, khoảng cách tường thuật]
   ├─ Nhịp điệu câu: [Tỷ lệ câu ngắn/mạnh mẽ vs câu dài/mượt mà]
   ├─ Cân bằng Show vs Tell: [Khi nào nên kịch hóa, khi nào nên tóm tắt]
   └─ Mật độ đối thoại: [Nhân vật nói bao nhiêu so với hành động]

5d) Kiến trúc Bẻ cảm xúc (EMOTIONAL TURN):
   ├─ Trạng thái cảm xúc ĐẦU cảnh: [A cảm thấy X]
   ├─ Catalyst (Chất xúc tác): [Sự kiện/lời nói/chi tiết làm thay đổi]
   ├─ Trạng thái cảm xúc CUỐI cảnh: [A giờ cảm thấy Y — đối lập với X]
   └─ Residue (Dư âm): [Cảm xúc gì đọng lại sau khi cảnh kết thúc]
   
   LƯU Ý: Mỗi cảnh hay PHẢI có ít nhất 1 Emotional Turn. Cảnh không có Turn = cảnh chết (dead scene).

GIAI ĐOẠN 6: MA TRẬN RÀNG BUỘC (CONSTRAINT MATRIX) - Nhận diện giới hạn
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6a) BẮT BUỘC bao gồm: [Các yếu tố bắt buộc từ người dùng/OOC]
6b) BẮT BUỘC tránh: [Nội dung bị cấm, hành động không đúng nhân vật]
6c) Mỏ neo tính liên tục: [Các sự kiện đã thiết lập không thể thay đổi]
6d) Ranh giới tông giọng: [Mức độ tối/sáng/hài hước/nghiêm túc]

GIAI ĐOẠN 7: BẢNG MÀU GIÁC QUAN (SENSORY PALETTE) - Kho vũ khí miêu tả
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7a) Danh mục hình ảnh: [3-5 hình ảnh cụ thể để vẽ ra]
7b) Thiết kế âm thanh: [Tiếng ồn xung quanh, tông giọng đối thoại, khoảnh khắc im lặng]
7c) Cảm giác vật lý: [Chạm, nhiệt độ, đau đớn, thoải mái]
7d) Mùi/Vị (nếu liên quan): [Các chi tiết giác quan gợi cảm]
7e) Bầu không khí cảm xúc: ["Cảm giác" của cảnh quay]

GIAI ĐOẠN 8: KÍCH HOẠT CUỐI CÙNG (FINAL IGNITION) - Viết
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KIỂM TRA CHỐNG VĂN TRUNG BÌNH (ANTI-MEDIOCRITY AUDIT):
   ❌ Tránh: Mở đầu bằng mô tả thời tiết hoặc nhân vật thức dậy
   ❌ Tránh: "Cô ấy cảm thấy..." / "Anh nhận ra..." (Tell, không Show)
   ❌ Tránh: Câu thoại chỉ truyền đạt thông tin (không có subtext)
   ❌ Tránh: Hành động không có hậu quả cảm xúc
   ❌ Tránh: Kết cảnh bằng nhân vật ngủ/nghỉ/đi chỗ khác (weak exit)
   
   ✅ BẮT BUỘC: Câu đầu phải TẠO RA CÂU HỎI trong đầu độc giả
   ✅ BẮT BUỘC: Ít nhất 1 chi tiết giác quan siêu cụ thể
   ✅ BẮT BUỘC: Câu cuối phải là HOOK — lý do để đọc tiếp

8) Thần chú thực thi:
   "Tôi sẽ viết với SỰ CHÍNH XÁC GIÁC QUAN, SỰ THẬT CẢM XÚC và ĐỘNG LỰC TƯỜNG THUẬT.
   Mỗi câu văn đều phục vụ nhân vật, cốt truyện hoặc bầu không khí.
   Tôi sẽ THỂ HIỆN (SHOW) qua hành động và chi tiết, không TÓM TẮT (TELL).
   Tôi sẽ khiến độc giả CẢM NHẬN, không chỉ là đọc."

GIAI ĐOẠN 9: QUY TẮC ĐỊNH DẠNG (FORMATTING RULES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9a) Ngắt đoạn: [BẮT BUỘC] Chia văn bản thành các đoạn văn ngắn (3-5 câu). Tránh các khối văn bản khổng lồ.
9b) Đối thoại: [BẮT BUỘC] Mỗi khi nhân vật mới nói, PHẢI xuống dòng và bắt đầu bằng dấu gạch ngang (-) hoặc ngoặc kép ("").
9c) Khoảng trống: Sử dụng 2 lần xuống dòng (double newline) giữa các đoạn văn để tạo sự thông thoáng.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 HOÀN TẤT COT. BẮT ĐẦU VIẾT TRUYỆN BẰNG TIẾNG VIỆT 🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

export const sachHiepPromptBuilderService = {
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
        : "Chế độ an toàn: Bật. Giữ nội dung phù hợp (PG-13). Tuyệt đối không có miêu tả chi tiết về tình dục.";
    
    // EXISTENCE LOCK LOGIC
    let existenceLock = "";
    if (sourceUrl || entityRegistry) {
        existenceLock = `
### 🔒 KHÓA TỒN TẠI: Đã kích hoạt (EXISTENCE LOCK)
Bạn đang viết Fanfiction dựa trên nguồn dữ liệu hiện có.
1. **Cấm tạo nhân vật/địa danh mới:** Bạn không được phép tùy tiện bịa đặt các danh từ riêng (Proper Nouns) về nhân vật, địa điểm, tổ chức không tồn tại trong Canon.
2. **Xử lý nhân vật phụ:** Nếu cốt truyện cần nhân vật phụ (vệ binh, bà chủ quán...), vui lòng sử dụng danh từ chung (NPC vô danh). Ví dụ: "vệ binh đó", "bà chủ quán", "tên ăn mày đó". Cấm đặt tên riêng cho họ (ví dụ: không viết "vệ binh Nguyễn Văn A").
3. **Danh sách được phép sử dụng (WHITELIST):** Chỉ có thể sử dụng các danh từ riêng sau đây (hoặc đã có trong Context):
   - **Nhân vật:** ${entityRegistry?.characters?.join(', ') || "Dựa theo Context"}
   - **Địa danh:** ${entityRegistry?.locations?.join(', ') || "Dựa theo Context"}
   - **Tổ chức:** ${entityRegistry?.factions?.join(', ') || "Dựa theo Context"}
`;
    }

    const fanficInstruction = sourceUrl 
        ? `
### 🦄 CHẾ ĐỘ FANFICTION (FANFICTION MODE) - Nghiêm ngặt
Câu chuyện này dựa trên nguồn: [${sourceUrl}].
1. **QUY TẮC THẾ GIỚI (CANON RULES):** Nếu Context cung cấp [Quy tắc CANON], bạn phải tuyệt đối tuân thủ. Không tùy tiện bịa đặt hệ thống sức mạnh mới xung đột với nguyên tác.
2. **TÍNH CÁCH NHÂN VẬT (CANON CORE):** Nếu Context cung cấp [Hồ sơ CANON], nhân vật phải hành động theo mô tả đó (OOC Check). Đừng để người máu lạnh tỏ ra yếu đuối, người ngu ngốc đột nhiên tỏ ra thông minh.
`
        : "";

    return `
=== HỆ ĐIỀU HÀNH KỂ CHUYỆN AETHERIA (V3.3 - Canon-Locked) ===

🎭 **Thể loại:** ${genre}
🌍 **Bối cảnh tổng thể (WORLD BIBLE):**
${setting}

👁️ **Góc nhìn (POV):** ${pov}
✍️ **Văn phong (STYLE):** ${writingStyle}

🚫 **Cấm kỵ (NEGATIVE):** ${negativePrompt}

${contentRating}
${fanficInstruction}
${existenceLock}

🗣️ **Quy tắc xưng hô và đối thoại (Bắt buộc):**
${pronounStyle}

Nhiệm vụ của bạn:
Bạn là một tiểu thuyết gia vĩ đại. Vui lòng tiếp tục viết câu chuyện dựa trên ngữ cảnh được cung cấp.
- **Lưu ý quan trọng: Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).**
- **Quan trọng:** Phân biệt rõ ràng giữa "Sự thật Canon" (không thể thay đổi) và "Phát triển cốt truyện" (sáng tạo).
- **Tuân thủ Whitelist:** Nếu danh từ riêng không có trong danh sách cho phép hoặc Context, tuyệt đối không được sử dụng.
- "Show, don't tell": Đừng chỉ kể lể, hãy thể hiện cảm xúc thông qua việc miêu tả hành động.
- Giữ cho cốt truyện logic và liên kết với phần trước.
- **Định dạng văn bản:** BẮT BUỘC sử dụng dấu xuống dòng để chia đoạn văn (mỗi đoạn 3-5 câu). Các đoạn đối thoại phải nằm trên dòng mới.
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
    const truncatedSummaries = truncateToWords(rollingSummaries, limit.promptLimit);

    return `
### 📚 Tóm tắt phần trước:
${truncatedSummaries}

### ⚡ Dữ liệu CANON và nguyên tác (Tham khảo):
*Lưu ý: Dữ liệu sau đây bao gồm các quy tắc Canon và phong cách nguyên tác để bạn mô phỏng style (nếu có). Đây là tài liệu tham khảo, không phải nội dung bạn đã viết.*
${augmentedContext}
${worldLore.length > 0 ? '\n[LORE ĐÃ CỐ ĐỊNH]：\n' + worldLore.join('\n') : ''}

### 📝 Ngữ cảnh trực tiếp (Vừa xảy ra):
${immediateContext}

---
### 🎬 Chỉ thị đạo diễn (USER INSTRUCTION):
"${userInstruction || "Vui lòng tiếp tục cốt truyện một cách tự nhiên, logic và hấp dẫn."}"

Nhiệm vụ cụ thể:
- **Lưu ý quan trọng: Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).**
- Bạn đang viết nội dung cho chương sau: **"${currentChapterTitle}"**.
- Vui lòng tập trung phát triển cốt truyện của chương này.
- **Tuyệt đối không** tùy tiện tạo tiêu đề chương mới (ví dụ: "### Chương 2", "### Chương tiếp theo"), trừ khi đạo diễn yêu cầu rõ ràng.
- Viết tiếp một cách liền mạch từ điểm kết thúc của "Ngữ cảnh trực tiếp". Không lặp lại các đoạn cũ.

【HACK NÃO AI - CHIẾN THUẬT VIẾT SIÊU CHI TIẾT】
Sau khi nhận yêu cầu viết tiếp, bạn PHẢI thực hiện "Think Step by Step" cực kỳ nghiêm túc:
1. **Chia nhỏ kịch bản:** Phân tích yêu cầu của người dùng thành 3 giai đoạn diễn biến (Part 1, Part 2, Part 3). Mỗi giai đoạn phải có một kịch bản mini (part_script) miêu tả cụ thể những gì sẽ xảy ra, cảm xúc nhân vật và không khí.
2. **Lặp lại COT:** Với mỗi Part, bạn phải trình bày đầy đủ quy trình suy nghĩ 10 giai đoạn (thought_process) để đảm bảo tính nhất quán và chiều sâu cho từng đoạn văn.
3. **Viết nội dung:** Viết 'part_story_content' dựa trên 'part_script' và 'thought_process' của phần đó. Đảm bảo nhịp độ chậm, giàu hình ảnh và cảm xúc.

BẮT BUỘC: Bạn phải trả về kết quả dưới dạng JSON với cấu trúc sau:
{
  "part1": {
    "part_script": "Kịch bản chia nhỏ giai đoạn 1 (Ví dụ: Lâm Phàm nắm tay Linh len lỏi qua phố đổ nát...)",
    "thought_process": "Nội dung quy trình suy nghĩ 10 giai đoạn (COT) đầy đủ cho Part 1",
    "part_story_content": "Nội dung truyện chi tiết của Part 1 viết bằng tiếng Việt"
  },
  "part2": {
    "part_script": "Kịch bản chia nhỏ giai đoạn 2 (Ví dụ: Tìm thấy góc khuất, chia sẻ bánh quy, nụ cười ấm áp...)",
    "thought_process": "Nội dung quy trình suy nghĩ 10 giai đoạn (COT) đầy đủ cho Part 2",
    "part_story_content": "Nội dung truyện chi tiết của Part 2 viết bằng tiếng Việt"
  },
  "part3": {
    "part_script": "Kịch bản chia nhỏ giai đoạn 3 (Ví dụ: Đêm xuống, cuộn tròn trong chăn, lời thì thầm gắn kết...)",
    "thought_process": "Nội dung quy trình suy nghĩ 10 giai đoạn (COT) đầy đủ cho Part 3",
    "part_story_content": "Nội dung truyện chi tiết của Part 3 viết bằng tiếng Việt"
  },
  "story_continue_plan": {
    "LoveOrGoodRoute": {
      "CharacterComment": "Nhận xét của Tiểu Vũ Tỷ Tỷ...",
      "ContinuePlan": "Gợi ý hướng đi tiếp theo..."
    },
    "NtrOrBadRoute": {
      "CharacterComment": "Nhận xét của Hắc Bì Đấu La...",
      "ContinuePlan": "Gợi ý hướng đi tiếp theo..."
    },
    "SupriseOrNeutralRoute": {
      "CharacterComment": "Nhận xét của Đường Tam...",
      "ContinuePlan": "Gợi ý hướng đi tiếp theo..."
    }
  }
}

${SACH_HIEP_COT_PROMPT}
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
Bạn là một biên tập viên văn học cao cấp.
Nhiệm vụ: Viết lại đoạn văn sau theo yêu cầu.

### Yêu cầu cụ thể:
"${instruction}"

### Nguyên văn:
${originalText}

Vui lòng giữ lại cốt truyện chính (trừ khi được yêu cầu thay đổi), nhưng cải thiện văn phong, từ ngữ và nhịp điệu.
**Lưu ý quan trọng: Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).**
    `;
  },

  buildExtractionSystemInstruction: (pronounStyle: string): string => {
      return `
Bạn là chuyên gia phân tích tâm lý nhân vật và xây dựng hồ sơ RPG.
Nhiệm vụ: Đọc văn bản và trích xuất thông tin nhân vật dưới dạng JSON. Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
Hệ thống xưng hô trong văn bản: ${pronounStyle}

### PHÂN LOẠI NHÂN VẬT (character_type):
Bạn PHẢI phân loại nhân vật vào một trong các nhóm sau:
- 'male_lead': Nam chính duy nhất của câu chuyện.
- 'female_young_lead': Các nhân vật nữ chính trẻ tuổi (em gái, bạn gái, crush, tiểu thư...) có quan hệ mật thiết với nam chính.
- 'female_mature_lead': Các nhân vật nữ chính trưởng thành/lớn tuổi (mẹ, cô, sư mẫu, giám đốc, phu nhân...) có quan hệ mật thiết với nam chính.
- 'npc': Các nhân vật phụ khác không thuộc các nhóm trên.
    `;
  },

  buildSummarySystemInstruction: (pronounStyle: string): string => {
      return `
Bạn là thư ký tóm tắt văn học.
Nhiệm vụ: Tóm tắt các chương truyện một cách ngắn gọn nhưng bao gồm tất cả các tình tiết chính để AI có thể ghi nhớ trong tương lai. Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
Giữ lại các danh từ riêng, địa danh và chiêu thức quan trọng.
Hệ thống xưng hô: ${pronounStyle}
    `;
  }
};
