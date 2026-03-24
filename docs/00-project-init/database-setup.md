# Database Setup & Connection Guide

## 1. Provider
- **Platform:** MongoDB Atlas (Cloud)
- **Library:** `@nestjs/mongoose` (Mongoose ODM)

## 2. Configuration Strategy
Hệ thống sử dụng **Async Configuration** để đảm bảo biến môi trường được tải trước khi kết nối Database.

### Environment Variables (.env)
- `MONGODB_URI`: mongodb+srv://ai-no-code:<vietn0021>@cluster0.dau6aiq.mongodb.net/?appName=Cluster0
- `DB_NAME`: ai-nocode-studio

## 3. NestJS Implementation Structure
- **Module:** `DatabaseModule` đặt tại `src/providers/database/`.
- **Logic:** - Sử dụng `MongooseModule.forRootAsync`.
    - Inject `ConfigService` để lấy `MONGODB_URI`.
    - Bật `autoIndex: true` trong môi trường development để tự động tạo Index từ Schema.

## 4. Connection Success Check
- Khi ứng dụng khởi chạy, Logger phải in ra dòng: `🚀 Database connected successfully to MongoDB Atlas`.
- Nếu lỗi, Logger phải in ra chi tiết lỗi và dừng tiến trình: `❌ Database connection failed`.

## 5. Global Schema Settings
Tất cả các Schema khi được tạo phải tuân thủ:
- `timestamps: true` (Tự động có createdAt, updatedAt).
- Transform JSON: Xóa `__v` và chuyển `_id` thành `id` khi trả về API.