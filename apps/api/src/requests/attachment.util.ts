import * as path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { Request as ExpressRequest } from 'express';

/** Allowed upload types: PDF, Word, Excel, and common images. */
export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
];

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (
    _req: ExpressRequest,
    file: { originalname: string },
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      cb(
        new BadRequestException(
          `File type "${ext || 'unknown'}" is not allowed. Allowed: PDF, Word, Excel, CSV, images.`,
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
};

/** Absolute base directory where uploads are stored. */
export function uploadBaseDir(): string {
  const configured = process.env.UPLOAD_DIR;
  return configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), 'uploads');
}

/** Make a string safe to use as a folder name. */
export function safeFolder(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Unknown';
}

/**
 * Build the relative storage path: <Dept>/<YY>/<MM>/<storedName>.
 * Grouped by the requester's department and the request's creation date.
 */
export function buildStoredPath(
  deptName: string | undefined,
  requestCreatedAt: Date,
  storedName: string,
): string {
  const dept = safeFolder(deptName ?? 'Unknown');
  const yy = String(requestCreatedAt.getFullYear()).slice(-2);
  const mm = String(requestCreatedAt.getMonth() + 1).padStart(2, '0');
  return path.posix.join(dept, yy, mm, storedName);
}
