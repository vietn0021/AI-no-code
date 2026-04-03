# 04-testing

Gợi ý kiểm thử tay (Studio):

- **Template Play:** project có `templateId` → Play phải vào đúng scene template.
- **Behavior Play:** xóa `templateId`, thêm `behaviors[]` trên entity → Play dùng `BehaviorRuntime` (score, va chạm, rules nếu có).
- **Legacy Play:** không `templateId`, không `behaviors` → scene `studioRuntime`.
- **AI Chat:** gửi prompt sau khi chỉnh scene — `gameConfig` cập nhật; kiểm tra nhánh template vs full generate qua response.

Chi tiết runtime: `docs/03-frontend/studio-editor/behavior-runtime.md`.
