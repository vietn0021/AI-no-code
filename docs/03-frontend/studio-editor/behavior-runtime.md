# Behavior runtime (Phaser) — Studio Play

Tài liệu mô tả **chế độ Play** khi `gameConfig` dùng **entity + `behaviors[]`**, không dùng `templateId` của các game mẫu (Snake, Flappy, …).

## File chính

| File | Vai trò |
|------|---------|
| `source-code/frontend/src/pages/studio/components/BehaviorRuntime.tsx` | Scene Phaser `studioBehavior`: đọc `entities`, `behaviors`, `rules`, `lives`, `level`. |
| `source-code/frontend/src/pages/studio/components/GameRuntime.tsx` | Chọn scene: template → template scene; có behaviors (không template) → `BehaviorRuntime`; còn lại → `StudioRuntimeScene` (legacy). |

## Điều kiện chọn scene (`GameRuntime`)

1. Có `templateId` hợp lệ (`snake`, `flappy`, `breakout`, `platformer`, `shooter`, `memory`) → **template scene** (không đổi).
2. **Không** template **và** ít nhất một entity có `behaviors` (mảng không rỗng) → **`BehaviorScene`** (`gameConfigUsesBehaviors`).
3. Ngược lại → **scene cũ** (`studioRuntime`): player động, entity khác static, va chạm đơn giản.

## Behavior được runtime hỗ trợ

- **Movement:** `move`, `patrol`, `follow`, `bounce`, `circular`
- **Physics:** `gravity` (world hoặc body), `jump`, `float`
- **Tương tác:** `shoot` (chuột trái, hướng theo pointer), `onCollide`, `onCollect`
- **Spawn:** `spawnRandom`, `spawnOnTimer`

## Rules (`gameConfig.rules`)

Mảng object `{ trigger, action?, value? }` ví dụ:

- `scoreReach` + `value` → `winGame` / `nextLevel`
- `livesZero` → `gameOver`
- `allCollected` → `winGame`
- `timer` + `value` (giây) → đếm ngược UI; hết giờ xử lý `timerEnd` / `gameOver`

## Actions (`executeAction`)

`addScore`, `loseLife`, `gameOver`, `winGame`, `nextLevel` (restart scene với `level` tăng).

## AI Chat (`AiChatPanel`)

Prompt gửi API luôn kèm full `gameConfig` JSON. Hướng dẫn trả lời:

- **Có `templateId` và chưa có `behaviors`:** ưu tiên chỉnh `templateConfig` / giữ template; đổi mechanic nặng → bỏ `templateId`, thêm `behaviors[]`.
- **Đã có behaviors hoặc scene entity-based:** ưu tiên **behavior system**, không dùng `templateId`.

Backend `ProjectsService.generate` nhận diện “chỉnh template” qua chuỗi con trong prompt (xem `docs/02-backend/project-module/readme.md`).

## Đồng bộ backend AI

`AiEngineService` (`SYSTEM_INSTRUCTION`) và Zod `GameConfigSchema` (`behaviors` trên entity, `rules` top-level) mô tả cùng bộ behavior — xem `docs/02-backend/ai-engine-module/readme.md`.
