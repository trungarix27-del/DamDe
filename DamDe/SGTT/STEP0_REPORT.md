# BÁO CÁO PHÂN TÍCH & KẾ HOẠCH CLONE "TẠO TRUYỆN SẮC HIỆP" (STEP 0)

Dưới đây là báo cáo phân tích chi tiết toàn bộ cấu trúc và luồng hoạt động của chức năng "Tạo truyện" hiện tại, cùng với kế hoạch clone thành "Tạo truyện Sắc Hiệp" theo đúng yêu cầu độc lập 100% và chỉ dịch prompt.

## [A] Luồng hoạt động đầy đủ của "Tạo truyện" (Create Story Workflow)
1. **Khởi tạo (UI):** Người dùng thao tác từ `FeatureList` hoặc `StoryLibrary` để mở `CreateWizard`.
2. **Thu thập dữ liệu:** `CreateWizard` lấy các thông tin: Tiêu đề, Thể loại, Tóm tắt, Bối cảnh, Văn phong, Góc nhìn, Xưng hô, Prompt phủ định, NSFW, v.v.
3. **Xử lý Logic (Context):** Gọi hàm `createStory` trong `StoryContext.tsx`.
4. **Lưu trữ sơ bộ:** Tạo object `Story` mới và lưu vào IndexedDB thông qua `storageService` (bảng `stories`).
5. **Trích xuất & Vector hóa (AI):**
   - Dựa vào loại truyện (Original/Fanfic), gọi `ProviderFactory` để lấy AI Provider (Gemini/LocalLLM).
   - AI Provider thực hiện các tác vụ: `extractCanonData`, `ingestFanficData`, `extractCharacters` bằng các prompt mặc định.
   - Dữ liệu trích xuất được vector hóa (`embedText`) và lưu vào IndexedDB (bảng `vectors`).
6. **Chuyển hướng:** Sau khi hoàn tất, cập nhật state `story` hiện tại và chuyển giao diện sang `MainWorkspace` (gồm `Sidebar` và `Editor`).
7. **Tương tác AI (Workspace):** Trong quá trình viết, các hàm `generateContinue`, `generateRewrite` gọi AI Provider, sử dụng prompt được lắp ráp từ `narrativePromptAssembler` và `contentSafetyRules`.

## [B] Danh sách các file cần Clone và Tên mới
Để đảm bảo tính độc lập hoàn toàn (không share state, không bug chéo), ta cần clone toàn bộ chuỗi file liên quan đến luồng trên:

**1. State & Storage:**
- `state/StoryContext.tsx` ➔ `state/SachHiepContext.tsx`
- `infra/storage.ts` ➔ `infra/sachHiepStorage.ts` (Sử dụng DB/Store mới)

**2. AI Providers & Prompting:**
- `infra/providers/ProviderFactory.ts` ➔ `infra/providers/SachHiepProviderFactory.ts`
- `infra/providers/GeminiProvider.ts` ➔ `infra/providers/SachHiepGeminiProvider.ts`
- `infra/providers/LocalLLMProvider.ts` ➔ `infra/providers/SachHiepLocalLLMProvider.ts`
- `narrative/prompting/narrativePromptAssembler.ts` ➔ `narrative/prompting/sachHiepPromptAssembler.ts`
- `narrative/prompting/contentSafetyRules.ts` ➔ `narrative/prompting/sachHiepContentSafetyRules.ts`

**3. UI Components (Cần dùng Context mới):**
- `components/CreateWizard.tsx` ➔ `components/CreateSachHiepWizard.tsx`
- `components/StoryLibrary.tsx` ➔ `components/SachHiepLibrary.tsx`
- `components/MainWorkspace.tsx` ➔ `components/SachHiepWorkspace.tsx`
- `components/Sidebar.tsx` ➔ `components/SachHiepSidebar.tsx`
- `components/Editor.tsx` ➔ `components/SachHiepEditor.tsx`
- `components/StorySettingsModal.tsx` ➔ `components/SachHiepSettingsModal.tsx`

**4. File cần Modify (Không clone, chỉ thêm logic định tuyến):**
- `App.tsx` (Thêm Provider mới, Route/ViewMode mới)
- `components/FeatureList.tsx` (Thêm nút "Tạo truyện Sắc Hiệp")
- `components/GlobalNav.tsx` (Thêm menu điều hướng)

## [C] Danh sách Prompt Strings cần dịch (Preview)
Các chuỗi này sẽ được dịch sang Tiếng Trung Giản Thể (Simplified Chinese) ở Step 2:

1. **Trong `contentSafetyRules.ts`:**
   - `NSFW_INSTRUCTION`: "### 🔞 HƯỚNG DẪN NỘI DUNG TRƯỞNG THÀNH (NSFW GUIDELINES)..."
2. **Trong `narrativePromptAssembler.ts`:**
   - `buildSystemInstruction`: "CHẾ ĐỘ AN TOÀN: BẬT...", "### 🔒 EXISTENCE LOCK: ENGAGED...", "### 🦄 CHẾ ĐỘ ĐỒNG NHÂN...", "=== HỆ ĐIỀU HÀNH KỂ CHUYỆN AETHERIA..."
   - `buildContinuePrompt`: "### 📚 TÓM TẮT CÁC CHƯƠNG TRƯỚC:...", "### ⚡ DỮ LIỆU CANON & NGUYÊN TÁC...", "### 📝 NGỮ CẢNH TRỰC TIẾP...", "### 🎬 CHỈ ĐẠO CỦA ĐẠO DIỄN..."
   - `buildRewritePrompt`: "Bạn là biên tập viên văn học cao cấp..."
   - `buildExtractionSystemInstruction`: "Bạn là chuyên gia phân tích tâm lý nhân vật..."
   - `buildSummarySystemInstruction`: "Bạn là thư ký tóm tắt văn học..."
3. **Trong `GeminiProvider.ts` & `LocalLLMProvider.ts`:**
   - `extractCanonData`: "Phân tích đoạn văn bản thô từ tiểu thuyết gốc sau đây và trích xuất dữ liệu cốt lõi..."
   - `extractCharacters`: "Phân tích văn bản và trích xuất danh sách JSON các nhân vật quan trọng..."
   - `ingestFanficData`: "Task 1: Summarize the World Building, Power System... Task 2: Extract key characters..."
   - `summarize`: "Hãy đọc văn bản sau và tạo bản tóm tắt nén cho AI..."

## [D] Database Keys / Collections
- **Bản gốc:** IndexedDB `AetheriaDB` với 2 object stores: `stories` và `vectors`.
- **Bản clone (Sắc Hiệp):** Sẽ tạo IndexedDB mới `SachHiepDB` (hoặc dùng chung DB nhưng tạo stores mới: `sach_hiep_stories` và `sach_hiep_vectors`) để đảm bảo cách ly dữ liệu 100%.

## [E] State / Context Variables
- **Bản gốc:** `StoryContext` cung cấp `story`, `storiesList`, `isGenerating`, `generationStatus`, `vectors`, v.v.
- **Bản clone:** `SachHiepContext` sẽ cung cấp các biến y hệt (`sachHiepStory`, `sachHiepStoriesList`, v.v. hoặc giữ nguyên tên biến bên trong scope của Provider mới) để các component clone sử dụng mà không đụng chạm đến state gốc.

## [F] Rủi ro tiềm ẩn & Điểm dễ gây lỗi (Error-prone areas)
1. **Quên cập nhật Import Paths:** Các file clone (VD: `SachHiepWorkspace`) nếu quên sửa import sẽ vô tình gọi về `StoryContext` gốc thay vì `SachHiepContext`.
2. **Xung đột Provider:** Trong `App.tsx`, việc lồng ghép `StoryProvider` và `SachHiepProvider` cần cẩn thận để không gây re-render không cần thiết hoặc rò rỉ state.
3. **Hardcode Strings trong UI:** Một số text loading hoặc thông báo trong UI component có thể bị sót chưa đổi tên (VD: "Đang tải truyện..." -> "Đang tải truyện Sắc Hiệp..."). Tuy nhiên theo yêu cầu "chỉ thay đổi DUY NHẤT nội dung prompt", ta sẽ giữ nguyên các text UI này, chỉ đổi prompt gửi cho AI.
4. **Provider Factory Singleton:** `ProviderFactory.getInstance()` là singleton. Nếu dùng chung cho cả 2 luồng, nó có thể gọi nhầm prompt gốc. Do đó, việc clone `ProviderFactory` thành `SachHiepProviderFactory` là bắt buộc để trỏ đúng vào các Provider đã được clone (chứa prompt tiếng Trung).
