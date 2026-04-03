# 01 - AI Generation Flow Logic (Groq / Gemini)

## 1. AI Stack & Configuration
- **Provider (runtime):** Nếu có `GROQ_API_KEY` trong env → **Groq** (`groq-sdk`), model mặc định `llama-3.3-70b-versatile` (override bằng `GROQ_MODEL`). Nếu không → **Google Gemini** (`@google/generative-ai`).
- **Gemini:** `GEMINI_API_KEY` qua `ConfigService`; dùng cho `generateGameConfig` (khi không dùng Groq) và cho **`GET /ai/models`**.
- **Chung:** Cùng `SYSTEM_INSTRUCTION` + user prompt; output là text → parse JSON → Zod → normalize.

## 2. Luồng xử lý (Pipeline)

### 2.1 `POST /api/projects/:id/generate` (Studio)

1. **User Input:** Body `{ prompt }` — prompt thường là **`contextPrompt`** từ `AiChatPanel` (full `gameConfig` JSON + hướng dẫn).
2. **`detectGameTemplate(prompt)`:** LLM trả `templateId` + patch config + `confidence`.
3. **Nhánh template:** Nếu `confidence > 0.7` và template ≠ `none` → merge với `templateDefaults` project, `buildTemplateGameConfig`.
4. **Nhánh full config:** Ngược lại → `generateGameConfig` (bước 2.2).
5. **Heuristic chỉnh template:** Nếu prompt chứa marker Studio (ví dụ `Đang dùng template:` hoặc `CHỈ update templateConfig`) và khớp template hiện tại → có thể tăng nhẹ confidence để không rơi nhầm sang full generate.

### 2.2 `generateGameConfig` (entity-based)

1. **Context:** Truy vấn `rawPrompt` cũ của project (nếu có `projectId`).
2. **AI Call:** Groq `chat.completions` **hoặc** Gemini `generateContent` + **System Instruction** (có block **BEHAVIOR SYSTEM**: `behaviors[]`, `rules`, `lives`, …).
3. **Output Parsing:** Trích JSON → `preprocessLogicArray` → **Zod** `GameConfigSchema`.
4. **Normalization:** HEX, tọa độ entity [0..100].
5. **Persistence:** Transaction snapshot + cập nhật `Project` (xem `ProjectsService.generate`).

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
- **`EntitySchema` dùng `.passthrough()`** — các field bổ sung (ví dụ `assetUrl`, `width`, `height`, **`behaviors`**) không bị loại bỏ khi parse.
- **`BehaviorSchema`:** object có `type` và các tham số tùy loại (`speed`, `force`, `onCollide`, …) — `.passthrough()`.
- **Rules / lives:** `gameConfig` có thể có **`rules`** (mảng `{ trigger, action, value? }`) và **`lives`** (số) cho **behavior runtime** phía frontend (`docs/03-frontend/studio-editor/behavior-runtime.md`).
- Frontend Studio: entity **`type: "sprite"`** + `assetUrl`; upload ảnh qua API → URL dưới `/uploads/` (xem `docs/02-backend/asset-module/readme.md`).