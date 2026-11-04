import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export const multerOptions = {
  storage: diskStorage({
    destination: './uploads/products',

    filename: (req, file, callback) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
      callback(null, uniqueName);
    },
  }),

  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error('Only JPEG, PNG, and WebP images are allowed'),
        false,
      );
    }

    callback(null, true);
  },

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 12,
  },
};
