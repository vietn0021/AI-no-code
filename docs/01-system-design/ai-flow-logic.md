# 01 - AI Generation Flow Logic (Gemini Integrated)

## 1. AI Stack & Configuration
- **Engine:** Google Gemini 1.5 Flash.
- **Library:** `@google/generative-ai`.
- **API Key:** Quản lý qua `ConfigService` (biến `GEMINI_API_KEY`).

## 2. Luồng xử lý (Pipeline)
1. **User Input:** Nhận prompt + `projectId`.
2. **Context:** Backend truy vấn `rawPrompt` cũ để Gemini biết người dùng đang muốn "sửa" hay "tạo mới".
3. **AI Call:** Sử dụng `model.generateContent` kèm theo **System Instruction**.
4. **Output Parsing:** - Loại bỏ rác (nếu có) để lấy chuỗi JSON.
   - Sử dụng `zod` để validate cấu trúc `gameConfig`.
5. **Normalization:** Ép màu về HEX, tọa độ `x,y` về dải 0-100.
6. **Persistence:** Lưu vào MongoDB (Project & ProjectVersions).

## 3. System Instruction (Dạy AI)
AI phải tuân thủ nghiêm ngặt các quy tắc:
- **No Markdown:** Trả về JSON string thô để `JSON.parse` không bị lỗi.
- **Vibe Studio Colors:** - Primary: `#E6E6FA` (Lavender)
    - Background: `#F3E5F5`
- **Logic:** Luôn phải có 1 entity `type: "player"`.

## 4. Xử lý lỗi & Trạng thái
- **Retry:** Tự động gọi lại Gemini 1 lần nếu JSON parse thất bại.
- **State:** Cập nhật `isProcessing: true` trong Project để Frontend hiển thị hiệu ứng Loading tím pastel.

## 5. Cấu trúc GameConfig Tiêu chuẩn (Vibe Studio)
AI phải luôn nỗ lực trả về JSON theo cấu trúc mẫu này:

```json
{
  "theme": {
    "primary": "#E6E6FA",
    "background": "#F3E5F5",
    "vibe": "lavender_pastel"
  },
  "entities": [
    {
      "id": "p_01",
      "type": "player",
      "position": { "x": 10, "y": 50 },
      "settings": { "speed": 5 }
    }
  ],
  "logic": [
    { "trigger": "onCollide", "action": "gameOver" }
  ]
}