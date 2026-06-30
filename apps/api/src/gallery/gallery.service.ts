import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";

type GalleryPhoto = { fileName: string; index: number };

@Injectable()
export class GalleryService {
  private readonly exts = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

  private async resolveGalleryDir(): Promise<string | null> {
    const candidates = [
      process.env.GALLERY_DIR,
      path.resolve(process.cwd(), "../web/public/assets/images/gallery"),
      path.resolve(process.cwd(), "../../apps/web/public/assets/images/gallery"),
      path.resolve(process.cwd(), "../../../apps/web/public/assets/images/gallery"),
      "/app/apps/web/public/assets/images/gallery"
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      try {
        const stat = await fs.stat(candidate);
        if (stat.isDirectory()) {
          return candidate;
        }
      } catch {
        // continue
      }
    }
    return null;
  }

  async listPhotos(): Promise<{ photos: string[] }> {
    const galleryDir = await this.resolveGalleryDir();
    if (!galleryDir) {
      return { photos: [] };
    }

    let fileNames: string[];
    try {
      fileNames = await fs.readdir(galleryDir);
    } catch {
      return { photos: [] };
    }

    const photos: GalleryPhoto[] = [];
    for (const fileName of fileNames) {
      const parsed = path.parse(fileName);
      const ext = parsed.ext.toLowerCase();
      if (!this.exts.has(ext)) continue;
      const match = /^pic-(\d+)$/i.exec(parsed.name);
      if (!match) continue;
      photos.push({ fileName, index: Number.parseInt(match[1], 10) });
    }

    photos.sort((a, b) => (a.index === b.index ? a.fileName.localeCompare(b.fileName) : a.index - b.index));
    return {
      photos: photos.map((photo) => `/assets/images/gallery/${encodeURIComponent(photo.fileName)}`)
    };
  }
}
