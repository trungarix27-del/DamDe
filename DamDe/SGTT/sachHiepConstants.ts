export interface SachHiepPronounStyleConfig {
    pronouns: string;
    relations: string;
    blacklist: string;
    tone: string;
    notes?: string;
}

export interface SachHiepPronounStyleDef {
    id: string;
    label: string;
    description: string;
    config?: SachHiepPronounStyleConfig; // undefined for 'custom'
}

export const compileSachHiepPronounStyle = (styleName: string, config?: SachHiepPronounStyleConfig): string => {
    if (!config) return "";
    return `!!! LƯU Ý QUAN TRỌNG: Tuân thủ nghiêm ngặt phong cách [${styleName.toUpperCase()}] !!!

1. Hệ thống xưng hô (Bắt buộc):
${config.pronouns}

2. Quan hệ xã hội và địa vị:
${config.relations}

3. Danh sách từ cấm (Blacklist) - Vi phạm sẽ bị coi là lỗi:
${config.blacklist}
-> Nếu gặp từ cấm trong ngữ cảnh cũ, hãy tự động sửa lại thành từ đúng khi viết nội dung mới.

4. Giọng điệu đối thoại (Tone):
${config.tone}
${config.notes ? `\n5. Các lưu ý khác:\n${config.notes}` : ''}`;
};

export const SACH_HIEP_PRONOUN_STYLES: SachHiepPronounStyleDef[] = [
    {
        id: "do_thi_sac",
        label: "Đô Thị Dâm Sắc 18+ (Anh - Em / Chị - Em / Tôi - Nàng)",
        description: "Gợi cảm, nhục dục, ướt át. Tả chi tiết da thịt và khoái cảm hoan lạc.",
        config: {
            pronouns: `   - Giao tiếp nam nữ: Anh - Em (thân mật) / Chị - Em (phi công - máy bay, thục nữ) / Tôi - Cô (xa lạ, sau đổi thành Anh - Em) / Cháu - Chú (hoặc Dì - Cháu).
   - Ngôi thứ ba: Hắn (nhân vật nam chính) / Nàng / Cô ấy / Mỹ phụ / Thiếu nữ / Kiều thê (nhân vật nữ).
   - Khi ân ái, hoan lạc: Anh / Em / Cưng / Bảo bối / Bé ngoan / Tiểu dâm phụ.`,
            relations: `   - Quan hệ đô thị hiện đại: Sếp - Nữ nhân viên, Hàng xóm quyến rũ, Chị dâu, Vợ người ta, Nữ tổng tài, Cô chủ nhà bốc lửa, Bạn gái nóng bỏng.`,
            blacklist: `   - Tuyệt đối KHÔNG dùng xưng hô kiếm hiệp/cổ trang: Tại hạ, Các hạ, Huynh đài, Bổn tọa, Đạo hữu, Bần đạo.
   - Không được dùng ngôn ngữ kiểm duyệt. Phải miêu tả chân thật, gợi tình, nóng bỏng.`,
            tone: `   - Gợi cảm, táo bạo, miêu tả chi tiết đường cong thể xác, cảm giác da thịt và khoái cảm hoan lạc, tả chi tiết cơ thể phụ nữ và các hành vi dâm dục gợi cảm.`
        }
    },
    {
        id: "co_trang_general",
        label: "Cổ Trang (Chung / Dã Sử)",
        description: "Ta/Huynh/Muội. Trung tính, tránh từ Kiếm Hiệp/Cung Đấu đặc thù.",
        config: {
            pronouns: `   - Ngôi thứ nhất: Ngươi (Ta, phổ biến) / Tiểu nữ (Tiểu nữ, nữ giới, khiêm tốn) / Thiếp thân (Thiếp, vợ đối với chồng) / Lão phu (Lão phu, người già).
   - Ngôi thứ hai: Huynh (Huynh) / Đệ (Đệ) / Tỷ (Tỷ) / Muội (Muội, thân mật) / Công tử (Công tử) / Cô nương (Cô nương) / Tiên sinh (Tiên sinh).
   - Xưng hô cha mẹ: Phụ thân (Phụ thân) / Mẫu thân (Mẫu thân, không gọi bố/mẹ).`,
            relations: `   - Kính ngữ dựa trên tuổi tác.
   - Gọi người lạ là "Các hạ (Các hạ)" hoặc "Vị này (Vị này)".`,
            blacklist: `   - Nghiêm cấm: "Anh/Em/Chị (Anh/Em/Chị, xưng hô hiện đại)" (trừ khi là huynh/muội/tỷ).
   - Nghiêm cấm: "Bố/Mẹ/Cha/Má" -> Phải dùng "Phụ thân/Mẫu thân (Phụ thân/Mẫu thân)".
   - Nghiêm cấm: "Cháu/Bác/Cô/Chú (Cháu/Bác/Cô/Chú, xưng hô hiện đại)" -> Phải dùng "Tiểu tử/Tiểu nữ/Thúc/Bá (Tiểu tử/Tiểu nữ/Thúc/Bá)".
   - Nghiêm cấm: "Tại hạ (Tại hạ, kiếm hiệp)", "Trẫm (Trẫm, cung đấu)".`,
            tone: `   - Văn phong nhẹ nhàng, cổ kính. Tránh khẩu ngữ hiện đại (như: "ok", "được thôi", "nói nhảm").`
        }
    },
    {
        id: "tien_hiep",
        label: "Tiên Hiệp / Tu Chân (Hán Việt)",
        description: "Đạo hữu, Tiền bối, Vãn bối. Nghiêm ngặt...",
        config: {
            pronouns: `   - Ngang hàng: Đạo hữu (Đạo hữu) / Các hạ (Các hạ) / Sư huynh (Sư huynh) / Sư tỷ (Sư tỷ).
   - Bề trên: Tiền bối (Tiền bối) / Lão tổ (Lão tổ) / Sư thúc (Sư thúc) / Sư bá (Sư bá).
   - Bề dưới: Vãn bối (Vãn bối) / Tiểu hữu (Tiểu hữu) / Tiểu tử (Tiểu tử) / Ngươi (Ngươi).
   - Tự xưng: Tại hạ (Tại hạ) / Bần đạo (Bần đạo) / Lão hủ (Lão hủ) / Ta (Ta) / Bổn tọa (Bổn tọa).`,
            relations: `   - Quan hệ dựa trên cảnh giới tu luyện (mạnh được yếu thua).
   - Phu thê: Đạo lữ (Đạo lữ). Cha con: Phụ thân/Mẫu thân (Phụ thân/Mẫu thân).`,
            blacklist: `   - Nghiêm cấm: "Anh/Em/Cậu/Tớ (Anh/Em/Cậu/Tớ, xưng hô hiện đại)".
   - Nghiêm cấm: "Cháu (Cháu)" (dùng Vãn bối/Tiểu tử).
   - Nghiêm cấm: "Bố/Mẹ (Bố/Mẹ)" (dùng Phụ thân/Mẫu thân).
   - Nghiêm cấm: "Cô ấy/Anh ấy (Cô ấy/Anh ấy)" (dùng Y/Hắn/Nữ tu kia (Y/Hắn/Nữ tu kia)).`,
            tone: `   - Trọng từ Hán Việt. Lạnh lùng, tàn nhẫn. Không sử dụng các từ ngữ cảm thán đời thường.`
        }
    },
    {
        id: "kiem_hiep",
        label: "Kiếm Hiệp / Giang Hồ",
        description: "Tại hạ, Các hạ, Tiểu tử. Hào sảng, bụi bặm...",
        config: {
            pronouns: `   - Giao tiếp: Tại hạ (Tại hạ) / Các hạ (Các hạ) / Huynh đài (Huynh đài) / Cô nương (Cô nương).
   - Thân mật/Giận dữ: Ta (Ta) / Ngươi (Ngươi) / Lão tử (Lão tử) / Tiểu tử (Tiểu tử).
   - Tiền bối: Lão tiền bối (Lão tiền bối) / Cao nhân (Cao nhân).`,
            relations: `   - Tứ hải giai huynh đệ. Trọng nghĩa khí.`,
            blacklist: `   - Nghiêm cấm: "Anh/Em (Anh/Em)" (trừ khi là tình nhân).
   - Nghiêm cấm: "Cháu (Cháu)" (dùng Tiểu tử/Tiểu nha đầu).
   - Nghiêm cấm: "Bố/Mẹ (Bố/Mẹ)" (nếu là bình dân có thể chấp nhận dùng Cha/Nương (Cha/Mẹ), nhưng ưu tiên dùng Phụ thân/Mẫu thân (Phụ thân/Mẫu thân)).`,
            tone: `   - Phong trần, hào sảng, khẩu khí lớn.`
        }
    },
    {
        id: "myth_oriental",
        label: "Huyền Ảo Đông Á (Yêu Linh/Thần Thoại)",
        description: "Đại nhân, Tiểu yêu. Ma mị...",
        config: {
            pronouns: `   - Thần/Yêu: Ta (Ta) / Ngươi (Ngươi) / Nhân loại (Nhân loại) / Tiểu yêu (Tiểu yêu) / Đại nhân (Đại nhân).
   - Kính ngữ: Tôn thần (Tôn thần) / Đại vương (Đại vương) / Nương nương (Nương nương).`,
            relations: `   - Phân biệt Người và Yêu/Thần.`,
            blacklist: `   - Nghiêm cấm: "Ngài (Ngài, phong cách phương Tây)". Dùng "Đại nhân (Đại nhân)".
   - Nghiêm cấm: "Anh/Em/Cháu (Anh/Em/Cháu)".`,
            tone: `   - Quái dị, cổ xưa, huyền bí.`
        }
    },
    {
        id: "anime_jp",
        label: "Anime / Light Novel (Nhật Bản)",
        description: "Cậu/Tớ, Onii-chan, Sensei. Văn phong dịch Nhật...",
        config: {
            pronouns: `   - Bạn bè: Cậu - Tớ (Cậu - Tớ / Cậu - Mình).
   - Kính ngữ: Tiền bối (Senpai) / Lão sư (Sensei) / Đại nhân (Sama) / Tiên sinh/Nữ sĩ (San) / Quân (Kun) / Chan (Chan).
   - Người nhà: Ca ca (Anh hai) / Tỷ tỷ (Chị hai) / Đệ đệ/Muội muội (Em) / Onii-chan (Onii-chan).`,
            relations: `   - Học đường, nhà mạo hiểm.`,
            blacklist: `   - Nghiêm cấm: "Tại hạ/Các hạ/Thí chủ (Tại hạ/Các hạ/Thí chủ)".
   - Nghiêm cấm: "Mày/Tao (Mày/Tao, ngôn ngữ thô tục)" (trừ khi rất thô lỗ).`,
            tone: `   - Trực quan, nhiều từ tượng thanh, độc thoại nội tâm.`
        }
    },
    {
        id: "cung_dau",
        label: "Cung Đấu / Hoàng Gia",
        description: "Trẫm, Thần thiếp, Nô tì. Tôn ti trật tự...",
        config: {
            pronouns: `   - Hoàng đế: Trẫm (Trẫm) / Hoàng thượng (Hoàng thượng).
   - Hậu phi: Thần thiếp (Thần thiếp) / Bổn cung (Bổn cung) / Nô tì (Nô tì, khiêm xưng) / Tỷ tỷ (Tỷ tỷ) / Muội muội (Muội muội).
   - Con cái đối với cha mẹ: Nhi thần (Nhi thần) / Hài nhi (Con, hạn chế sử dụng) / Phụ hoàng (Phụ hoàng) / Mẫu hậu (Mẫu hậu) / Phụ thân (Phụ thân) / Mẫu thân (Mẫu thân).
   - Người hầu: Nô tài (Nô tài) / Nô tì (Nô tì) / Vi thần (Vi thần).`,
            relations: `   - Trật tự tôn ti là chuyện sống còn. Nói năng phải cẩn trọng, hàm súc.`,
            blacklist: `   - Tuyệt đối nghiêm cấm: "Vợ/Chồng (Vợ/Chồng)" (phải dùng Phu quân/Ái phi/Nàng/Chàng (Phu quân/Ái phi/Nàng/Chàng)).
   - Tuyệt đối nghiêm cấm: "Bố/Mẹ/Cha/Má" (phải dùng Phụ thân/Phụ hoàng/Mẫu thân/Mẫu hậu (Phụ thân/Phụ hoàng/Mẫu thân/Mẫu hậu)).
   - Tuyệt đối nghiêm cấm: "Cháu (Cháu)" (dùng Nhi thần/Tiểu nữ/Nô tì hoặc tên riêng). Trong cung đình tuyệt đối không tự xưng "Cháu".
   - Tuyệt đối nghiêm cấm: "Anh/Em (Anh/Em)" (giữa quân thần hoặc người không thân thiết).
   - Tuyệt đối nghiêm cấm: "Tôi (Tôi)" (phải dùng Ta/Bổn cung/Bản quan (Ta/Bổn cung/Bản quan)).`,
            tone: `   - Trang trọng, cổ điển, thâm trầm. Không sử dụng từ ngữ bình dân.`
        }
    },
    {
        id: "fantasy_western",
        label: "Phương Tây / Fantasy (Văn học dịch)",
        description: "Ta/Ngươi, Ngài, Gã/Hắn. Không dùng Anh/Cô...",
        config: {
            pronouns: `   - Thông dụng: Ta (Ta) / Ngươi (Ngươi).
   - Quý tộc: Ngài (Ngài, Sir/Lord) / Phu nhân (Phu nhân, Lady) / Tiểu thư (Tiểu thư).
   - Ngôi thứ ba: Hắn (Hắn/Gã/Y) / Cô ta (Nàng/Ả).`,
            relations: `   - Phong cách quý tộc châu Âu.`,
            blacklist: `   - Nghiêm cấm: "Anh/Cô/Chị/Em (Anh/Cô/Chị/Em, phong cách hiện đại)".
   - Nghiêm cấm: "Tiền bối/Hậu bối/Tại hạ (Tiền bối/Hậu bối/Tại hạ)".`,
            tone: `   - Sử thi, trang trọng, văn học dịch.`
        }
    },
    {
        id: "hien_dai",
        label: "Hiện Đại (Việt Nam)",
        description: "Tôi/Bạn, Anh/Em, Cậu/Tớ. Tự nhiên...",
        config: {
            pronouns: `   - Tôi / Bạn / Anh / Chị / Em / Mày / Tao.`,
            relations: `   - Đời sống thường ngày tự nhiên.`,
            blacklist: `   - Nghiêm cấm: "Tại hạ/Các hạ/Huynh đài (Tại hạ/Các hạ/Huynh đài)".`,
            tone: `   - Hiện đại, ngắn gọn.`
        }
    },
    {
        id: "quan_su",
        label: "Quân Sự / Nghiêm Túc",
        description: "Tôi/Đồng chí, Chỉ huy. Kỷ luật...",
        config: {
            pronouns: `   - Tôi (Tôi) / Đồng chí (Đồng chí) / Chỉ huy (Chỉ huy) / Báo cáo (Báo cáo).`,
            relations: `   - Cấp trên - Cấp dưới.`,
            blacklist: `   - Nghiêm cấm các từ ngữ ủy mị.`,
            tone: `   - Đanh thép, dứt khoát.`
        }
    },
    {
        id: "custom",
        label: "Tùy chỉnh (Thủ công)",
        description: "Tự nhập quy tắc riêng...",
        config: undefined
    }
];
