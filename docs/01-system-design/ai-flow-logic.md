# 01 - AI Generation Flow Logic (Groq / Gemini)

## 1. AI Stack & Configuration
- **Provider (runtime):** Nếu có `GROQ_API_KEY` trong env → **Groq** (`groq-sdk`), model mặc định `llama-3.3-70b-versatile` (override bằng `GROQ_MODEL`). Nếu không → **Google Gemini** (`@google/generative-ai`).
- **Gemini:** `GEMINI_API_KEY` qua `ConfigService`; dùng cho `generateGameConfig` (khi không dùng Groq) và cho **`GET /ai/models`**.
- **Chung:** Cùng `SYSTEM_INSTRUCTION` + user prompt; output là text → parse JSON → Zod → normalize.

## 2. Luồng xử lý (Pipeline)
1. **User Input:** Nhận prompt + `projectId`.
2. **Context:** Backend truy vấn `rawPrompt` cũ để Gemini biết người dùng đang muốn "sửa" hay "tạo mới".
3. **AI Call:** Groq `chat.completions` (system + user) **hoặc** Gemini `generateContent` kèm **System Instruction** trên model.
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
- **Retry:** Tự động gọi lại LLM (Groq hoặc Gemini) thêm tối đa 1 lần nếu parse/validate thất bại.
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
```

## 6. Đồng bộ với code hiện tại (`GameConfigSchema`)

- Validate bằng Zod tại `source-code/backend/src/modules/ai-engine/schemas/game-config.schema.ts`: bắt buộc `source_color`, `theme`, `entities` với `shapeType` enum `Square | Circle | Triangle`, và **ít nhất một entity** có `type === "player"`.
- **`EntitySchema` dùng `.passthrough()`** — các field bổ sung (ví dụ `assetUrl`, `width`, `height`) không bị loại bỏ khi parse; frontend Studio có thể thêm entity **`type: "sprite"`** + `assetUrl` khi lưu `gameConfig` (xem `SYSTEM_ARCHITECTURE.md` mục Frontend).