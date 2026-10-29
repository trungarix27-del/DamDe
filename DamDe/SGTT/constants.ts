
export interface PronounStyleConfig {
    pronouns: string;
    relations: string;
    blacklist: string;
    tone: string;
    notes?: string;
}

export interface PronounStyleDef {
    id: string;
    label: string;
    description: string;
    config?: PronounStyleConfig; // undefined for 'custom'
}

export const compilePronounStyle = (styleName: string, config?: PronounStyleConfig): string => {
    if (!config) return "";
    return `!!! QUAN TRỌNG: TUÂN THỦ NGHIÊM NGẶT VĂN PHONG [${styleName.toUpperCase()}] !!!

1. HỆ THỐNG XƯNG HÔ (BẮT BUỘC):
${config.pronouns}

2. QUAN HỆ XÃ HỘI & VAI VẾ:
${config.relations}

3. DANH SÁCH TỪ CẤM (BLACKLIST) - NẾU VI PHẠM SẼ BỊ COI LÀ LỖI:
${config.blacklist}
-> Nếu gặp từ cấm trong ngữ cảnh cũ, HÃY TỰ ĐỘNG SỬA lại thành từ đúng trong phần viết mới.

4. SẮC THÁI HỘI THOẠI (TONE):
${config.tone}
${config.notes ? `\n5. LƯU Ý KHÁC:\n${config.notes}` : ''}`;
};

export const PRONOUN_STYLES: PronounStyleDef[] = [
    {
        id: "co_trang_general",
        label: "Cổ Trang (Chung / Dã Sử)",
        description: "Ta/Huynh/Muội. Trung tính, tránh từ Kiếm Hiệp/Cung Đấu đặc thù.",
        config: {
            pronouns: `   - Ngôi thứ 1: Ta (Phổ biến) / Tiểu nữ (Nữ, khiêm tốn) / Thiếp (Vợ nói với chồng) / Lão phu (Người già).
   - Ngôi thứ 2: Huynh / Đệ / Tỷ / Muội (Thân thiết) / Công tử / Cô nương / Tiên sinh.
   - Gọi Cha/Mẹ: Phụ thân / Mẫu thân (Không gọi là Cha/Mẹ).`,
            relations: `   - Kính ngữ dựa trên tuổi tác.
   - Người không quen biết gọi là "Các hạ" hoặc "Vị này".`,
            blacklist: `   - CẤM TIỆT: "Anh/Em/Chị" (trừ khi là Huynh/Muội/Tỷ).
   - CẤM TIỆT: "Bố/Mẹ/Cha/Má" -> Phải dùng "Phụ thân/Mẫu thân".
   - CẤM TIỆT: "Cháu/Bác/Cô/Chú" (Xưng hô kiểu hiện đại) -> Phải dùng "Tiểu tử/Tiểu nữ/Thúc/Bá".
   - CẤM: "Tại hạ" (Kiếm hiệp), "Trẫm" (Cung đấu).`,
            tone: `   - Văn phong nhẹ nhàng, cổ kính. Tránh văn nói hiện đại (vd: "ok", "được thôi", "tào lao").`
        }
    },
    {
        id: "tien_hiep",
        label: "Tiên Hiệp / Tu Chân (Hán Việt)",
        description: "Đạo hữu, Tiền bối, Vãn bối. Nghiêm ngặt...",
        config: {
            pronouns: `   - Ngang hàng: Đạo hữu / Các hạ / Sư huynh / Sư tỷ.
   - Bề trên: Tiền bối / Lão tổ / Sư thúc / Sư bá.
   - Bề dưới: Vãn bối / Tiểu hữu / Tiểu tử / Ngươi.
   - Tự xưng: Tại hạ / Bần đạo / Lão hủ / Ta / Bổn tọa.`,
            relations: `   - Quan hệ dựa trên cảnh giới tu luyện (Mạnh là tôn).
   - Vợ chồng: Đạo lữ. Cha con: Phụ thân/Mẫu thân.`,
            blacklist: `   - CẤM: "Anh/Em/Cậu/Tớ".
   - CẤM: "Cháu" (Dùng Vãn bối/Tiểu tử).
   - CẤM: "Bố/Mẹ" (Dùng Phụ thân/Mẫu thân).
   - CẤM: "Cô ấy/Anh ấy" (Dùng Y/Hắn/Nữ tu kia).`,
            tone: `   - Hán Việt nặng. Lạnh lùng, tàn khốc. Không dùng từ ngữ tình cảm sướt mướt đời thường.`
        }
    },
    {
        id: "kiem_hiep",
        label: "Kiếm Hiệp / Giang Hồ",
        description: "Tại hạ, Các hạ, Tiểu tử. Hào sảng, bụi bặm...",
        config: {
            pronouns: `   - Xã giao: Tại hạ / Các hạ / Huynh đài / Cô nương.
   - Thân mật/Tức giận: Ta / Ngươi / Lão tử / Tiểu tử.
   - Tiền bối: Lão tiền bối / Cao nhân.`,
            relations: `   - Tứ hải giai huynh đệ. Trọng nghĩa khí.`,
            blacklist: `   - CẤM: "Anh/Em" (trừ khi là tình nhân).
   - CẤM: "Cháu" (Dùng Tiểu tử/Tiểu nha đầu).
   - CẤM: "Bố/Mẹ" (Dùng Cha/Mẹ chấp nhận được nếu là dân thường, nhưng ưu tiên Phụ thân/Mẫu thân).`,
            tone: `   - Bụi bặm, phong trần, khẩu khí lớn.`
        }
    },
    {
        id: "myth_oriental",
        label: "Huyền Ảo Đông Á (Yêu Linh/Thần Thoại)",
        description: "Đại nhân, Tiểu yêu. Ma mị...",
        config: {
            pronouns: `   - Thần/Yêu: Ta / Ngươi / Nhân loại / Tiểu yêu / Đại nhân.
   - Kính ngữ: Tôn thần / Đại vương / Nương nương.`,
            relations: `   - Phân biệt Người và Yêu/Thần.`,
            blacklist: `   - CẤM: "Ngài" (kiểu Tây). Dùng "Đại nhân".
   - CẤM: "Anh/Em/Cháu".`,
            tone: `   - Ma mị, cổ xưa, bí ẩn.`
        }
    },
    {
        id: "anime_jp",
        label: "Anime / Light Novel (Nhật Bản)",
        description: "Cậu/Tớ, Onii-chan, Sensei. Văn phong dịch Nhật...",
        config: {
            pronouns: `   - Bạn bè: Cậu - Tớ / Cậu - Mình.
   - Kính ngữ: Senpai / Sensei / Sama / San / Kun / Chan.
   - Gia đình: Anh hai / Chị hai / Em / Onii-chan.`,
            relations: `   - Học đường, mạo hiểm giả.`,
            blacklist: `   - CẤM: "Tại hạ/Các hạ/Thí chủ".
   - CẤM: "Mày/Tao" (trừ khi thô lỗ).`,
            tone: `   - Trực quan, nhiều từ tượng thanh, độc thoại nội tâm.`
        }
    },
    {
        id: "cung_dau",
        label: "Cung Đấu / Hoàng Gia",
        description: "Trẫm, Thần thiếp, Nô tì. Tôn ti trật tự...",
        config: {
            pronouns: `   - Vua: Trẫm / Hoàng thượng.
   - Hậu phi: Thần thiếp / Bổn cung / Nô tì (khiêm xưng) / Tỷ tỷ / Muội muội.
   - Con cái với Cha mẹ: Nhi thần / Con (hạn chế) / Phụ hoàng / Mẫu hậu / Phụ thân / Mẫu thân.
   - Kẻ dưới: Nô tài / Nô tì / Vi thần.`,
            relations: `   - Tôn ti trật tự là sống còn. Lời nói phải giữ kẽ, ẩn ý.`,
            blacklist: `   - CẤM TUYỆT ĐỐI: "Vợ/Chồng" (Phải dùng Phu quân/Ái phi/Nàng/Chàng).
   - CẤM TUYỆT ĐỐI: "Bố/Mẹ/Cha/Má" (Phải dùng Phụ thân/Phụ hoàng/Mẫu thân/Mẫu hậu).
   - CẤM TUYỆT ĐỐI: "Cháu" (Dùng Nhi thần/Tiểu nữ/Nô tì hoặc tên riêng). Không bao giờ xưng "Cháu" trong cung đình.
   - CẤM TUYỆT ĐỐI: "Anh/Em" (giữa vua tôi hoặc người không thân).
   - CẤM TUYỆT ĐỐI: "Tôi" (Phải dùng Ta/Bổn cung/Bản quan).`,
            tone: `   - Trang trọng, cổ điển, thâm sâu. Không dùng từ ngữ bình dân.`
        }
    },
    {
        id: "fantasy_western",
        label: "Phương Tây / Fantasy (Văn học dịch)",
        description: "Ta/Ngươi, Ngài, Gã/Hắn. Không dùng Anh/Cô...",
        config: {
            pronouns: `   - Chung: Ta / Ngươi.
   - Quý tộc: Ngài (Sir/Lord) / Phu nhân (Lady) / Tiểu thư.
   - Ngôi 3: Hắn / Gã / Y / Nàng / Ả.`,
            relations: `   - Phong cách Quý tộc Châu Âu.`,
            blacklist: `   - CẤM: "Anh/Cô/Chị/Em" (kiểu hiện đại).
   - CẤM: "Tiền bối/Hậu bối/Tại hạ".`,
            tone: `   - Sử thi, trang trọng, văn học dịch.`
        }
    },
    {
        id: "hien_dai",
        label: "Hiện Đại (Việt Nam)",
        description: "Tôi/Bạn, Anh/Em, Cậu/Tớ. Tự nhiên...",
        config: {
            pronouns: `   - Tôi / Bạn / Anh / Chị / Em / Mày / Tao.`,
            relations: `   - Tự nhiên đời thường.`,
            blacklist: `   - CẤM: "Tại hạ/Các hạ/Huynh đài".`,
            tone: `   - Hiện đại, gãy gọn.`
        }
    },
    {
        id: "quan_su",
        label: "Quân Sự / Nghiêm Túc",
        description: "Tôi/Đồng chí, Chỉ huy. Kỷ luật...",
        config: {
            pronouns: `   - Tôi / Đồng chí / Chỉ huy / Báo cáo.`,
            relations: `   - Cấp trên - Cấp dưới.`,
            blacklist: `   - CẤM từ ngữ ủy mị.`,
            tone: `   - Đanh thép, báo cáo.`
        }
    },
    {
        id: "custom",
        label: "Tùy chỉnh (Thủ công)",
        description: "Tự nhập quy tắc riêng...",
        config: undefined
    }
];
