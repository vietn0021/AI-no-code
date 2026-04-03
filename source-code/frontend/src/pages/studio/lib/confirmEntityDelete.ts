/** Hỏi xác nhận trước khi xóa entity (tránh lỡ tay). */
export function confirmEntityDelete(displayName: string): boolean {
  return window.confirm(
    `Xóa vật thể "${displayName}"?\n\nBạn có thể Lưu dự án sau để đồng bộ lên máy chủ.`,
  )
}
