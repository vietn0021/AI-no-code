# AI Engine Module

## 1) Mục tiêu

Module **`AiEngineModule`** tạo / cập nhật **`gameConfig`** (JSON game) từ prompt người dùng, validate bằng **Zod** (`GameConfigSchema`), chuẩn hóa màu HEX và tọa độ entity.

---

## 2) Provider LLM (Groq hoặc Gemini)

Triển khai tại `source-code/backend/src/modules/ai-engine/ai-engine.service.ts`.

| Điều kiện env | Hành vi `generateGameConfig` |
|----------------|------------------------------|
| `GROQ_API_KEY` có giá trị (sau trim) | Dùng **`groq-sdk`**: `chat.completions.create`, model từ `GROQ_MODEL` hoặc mặc định **`llama-3.3-70b-versatile`**. System message = `SYSTEM_INSTRUCTION` (cùng nội dung quy tắc như Gemini). |
| Không có `GROQ_API_KEY` | Dùng **Google Gemini** (`@google/generative-ai`), `systemInstruction` trên model, `generateContent(userText)`. Cần **`GEMINI_API_KEY`**. |

- **`listModels()`** (`GET /api/ai/models`): vẫn gọi API danh sách model **Gemini** — cần `GEMINI_API_KEY` cho route này.
- Sau khi nhận **chuỗi text** từ Groq hoặc Gemini, pipeline **giống hệt**: `extractLikelyJson` → `JSON.parse` → xử lý `logic` → Zod → `clampEntityPositions` → `normalizeThemeAndEntityHexColors` → retry tối đa 2 lần nếu parse/validate lỗi.

---

## 3) Biến môi trường

| Biến | Mô tả |
|------|--------|
| `GROQ_API_KEY` | Bật nhánh Groq khi có giá trị. |
| `GROQ_MODEL` | Tuỳ chọn; mặc định `llama-3.3-70b-versatile`. |
| `GEMINI_API_KEY` | Bắt buộc khi không dùng Groq cho generate; dùng cho `listModels`. |

Xem mẫu trong `source-code/backend/.env.example`.

---

## 4) API

| Method | Path | Guard | Ghi chú |
|--------|------|-------|---------|
| GET | `/api/ai/models` | None | Liệt kê model Gemini |
| POST | `/api/ai/generate` | None | Generate `gameConfig` (debug; Studio chính thường dùng `POST /projects/:id/generate`) |

Luồng project-driven: `ProjectsService.generate` → `AiEngineService.generateGameConfig(prompt, projectId?)`.

---

## 5) Tài liệu liên quan

- `docs/01-system-design/ai-flow-logic.md`
- `SYSTEM_ARCHITECTURE.md` (mục Data Flow AI, Integration Rules)
- `docs/03-frontend/studio-editor/readme.md` (context prompt từ frontend)
