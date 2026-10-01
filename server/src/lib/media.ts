import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { badRequest } from './errors.js';

// Refuse "decompression bombs": a tiny file that expands to an enormous bitmap.
const MAX_INPUT_PIXELS = 50_000_000;

/**
 * Re-encodes an uploaded image: applies EXIF orientation, then drops all metadata (EXIF GPS, camera
 * serials) so a photo can never reveal where it was taken. Writes a display size and a list thumbnail.
 * The original upload is always deleted.
 */
export async function processPhoto(input: string, outDir: string, { thumb = true } = {}) {
  const id = crypto.randomUUID();
  const file = `${id}.jpg`;
  const thumbFile = `${id}-t.jpg`;
  try {
    const base = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' }).rotate();
    const meta = await base.metadata();
    if (!meta.width || !meta.height || meta.width < 200 || meta.height < 200) throw badRequest('image_too_small');
    await base.clone()
      .resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(path.join(outDir, file));
    if (thumb) {
      await base.clone()
        .resize({ width: 480, height: 640, fit: 'cover', position: sharp.strategy.attention })
        .jpeg({ quality: 78, mozjpeg: true })
        .toFile(path.join(outDir, thumbFile));
    }
    return { file, thumbFile: thumb ? thumbFile : null };
  } catch (err) {
    fs.rmSync(path.join(outDir, file), { force: true });
    fs.rmSync(path.join(outDir, thumbFile), { force: true });
    if (err instanceof Error && 'status' in err) throw err;
    throw badRequest('invalid_image');
  } finally {
    fs.rmSync(input, { force: true });
  }
}

/** Deletes a stored photo and its thumbnail, given their public URLs. */
export function removeStored(dir: string, ...urls: (string | null | undefined)[]) {
  for (const url of urls) if (url) fs.rmSync(path.join(dir, path.basename(url)), { force: true });
}
