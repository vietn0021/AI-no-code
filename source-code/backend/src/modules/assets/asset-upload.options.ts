import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

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
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, ASSET_IMAGE_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase() || '.bin';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
};
