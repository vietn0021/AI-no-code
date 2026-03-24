/**
 * Ví dụ định dạng logic cho prompt Gemini (không dùng mảng string thuần).
 */
export const LOGIC_ARRAY_EXAMPLE = `[
  {
    "id": "0",
    "description": "Khi player va chạm vật cản thì kết thúc game",
    "trigger": "onCollide",
    "action": "gameOver"
  },
  {
    "id": "1",
    "description": "Thu thập vật phẩm để tăng điểm",
    "trigger": "onCollect",
    "action": "addScore"
  }
]`;
