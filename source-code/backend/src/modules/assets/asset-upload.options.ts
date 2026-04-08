import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { join } from 'path';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

/** Giữ path cho static `/uploads` (main.ts) — file mới lên Supabase, không ghi disk. */
export const ASSET_IMAGE_UPLOAD_DIR = join(process.cwd(), 'uploads');

export const assetImageMulterOptions = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(
        new BadRequestException(
          'Chỉ chấp nhận image/png, image/jpeg, image/gif, image/webp',
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
  storage: memoryStorage(),
};
