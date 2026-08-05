import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FinalizeCreateLayoutVersionDto } from "./dto/finalize-create-layout-version.dto";
import { FinalizeUpdateLayoutVersionDto } from "./dto/finalize-update-layout-version.dto";
import { GetLayoutVersionQueryDto } from "./dto/get-layout-version-query.dto";
import { PresignAppendLayoutUploadDto } from "./dto/presign-append-layout-upload.dto";
import { PresignCreateLayoutUploadDto } from "./dto/presign-create-layout-upload.dto";
import { S3Service } from "./s3.service";

type VersionRow = {
  id: number;
  name: string;
  s3Prefix: string;
  venueId: string | null;
  label: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type HistoryRow = {
  id: number;
  versionId: number;
  s3Key: string;
  savedAt: Date;
  label: string | null;
};

type PresignUploadResponse = {
  uploadUrl: string;
  s3Key: string;
  savedAt: string;
  headers: { "Content-Type": string };
  expiresIn: number;
};

const HISTORY_KEY_PATTERN = /^\d{4}\/\d{2}\/\d{2}\/\d{6}\.json$/;

@Injectable()
export class LayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  getStorageStatus() {
    return {
      configured: this.s3.isConfigured(),
      bucket: this.s3.isConfigured() ? this.s3.getBucketName() : null,
      prefix: this.s3.getLayoutPrefix(),
      layout: "client presigned PUT to S3 + finalize metadata in API"
    };
  }

  async listVersions() {
    const rows = await this.prisma.layoutVersion.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        history: {
          orderBy: { savedAt: "desc" },
          take: 1,
          select: { id: true, savedAt: true }
        }
      }
    });

    return {
      items: rows.map((row) => ({
        name: row.name,
        s3Prefix: row.s3Prefix,
        venueId: row.venueId,
        label: row.label,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        latestHistory: row.history[0]
          ? {
              id: row.history[0].id,
              savedAt: row.history[0].savedAt.toISOString()
            }
          : null
      }))
    };
  }

  async listVersionHistory(name: string) {
    const version = await this.findByNameOrThrow(name);
    const rows = await this.prisma.layoutVersionHistory.findMany({
      where: { versionId: version.id },
      orderBy: { savedAt: "desc" }
    });

    return {
      version: this.toVersionMeta(version),
      items: rows.map((row) => this.toHistoryMeta(row))
    };
  }

  async getVersionLayout(name: string, query: GetLayoutVersionQueryDto) {
    const version = await this.findByNameOrThrow(name);
    const history = await this.resolveHistoryEntry(version.id, query);
    const layout = await this.loadLayoutFromHistory(history);

    return {
      meta: this.toVersionMeta(version),
      history: this.toHistoryMeta(history),
      layout
    };
  }

  async getHistoryLayout(name: string, historyId: number) {
    const version = await this.findByNameOrThrow(name);
    const history = await this.prisma.layoutVersionHistory.findFirst({
      where: { id: historyId, versionId: version.id }
    });
    if (!history) {
      throw new NotFoundException(
        `History #${historyId} not found for layout version "${name}".`
      );
    }

    const layout = await this.loadLayoutFromHistory(history);
    return {
      meta: this.toVersionMeta(version),
      history: this.toHistoryMeta(history),
      layout
    };
  }

  async presignCreateUpload(dto: PresignCreateLayoutUploadDto): Promise<PresignUploadResponse> {
    const existing = await this.prisma.layoutVersion.findUnique({
      where: { name: dto.name }
    });
    if (existing) {
      throw new ConflictException(`Layout version "${dto.name}" already exists.`);
    }

    return this.buildPresignUpload(dto.name);
  }

  async presignAppendUpload(
    name: string,
    _dto: PresignAppendLayoutUploadDto
  ): Promise<PresignUploadResponse> {
    await this.findByNameOrThrow(name);
    return this.buildPresignUpload(name);
  }

  async finalizeCreateVersion(dto: FinalizeCreateLayoutVersionDto) {
    const existing = await this.prisma.layoutVersion.findUnique({
      where: { name: dto.name }
    });
    if (existing) {
      throw new ConflictException(`Layout version "${dto.name}" already exists.`);
    }

    this.assertValidHistoryKey(dto.name, dto.s3Key);
    const savedAt = this.parseSavedAtFromKey(dto.s3Key);
    await this.ensureUploadedObject(dto.s3Key);
    const venueId = await this.loadVenueIdFromS3Key(dto.s3Key);
    const s3Prefix = this.s3.versionFolderPrefix(dto.name);

    const saved = await this.prisma.layoutVersion.create({
      data: {
        name: dto.name,
        s3Prefix,
        venueId,
        label: dto.label ?? null
      }
    });

    const history = await this.recordHistory(saved, dto.s3Key, savedAt, dto.label);

    return {
      meta: this.toVersionMeta(saved),
      history: this.toHistoryMeta(history)
    };
  }

  async finalizeUpdateVersion(name: string, dto: FinalizeUpdateLayoutVersionDto) {
    const version = await this.findByNameOrThrow(name);
    this.assertValidHistoryKey(name, dto.s3Key);
    const savedAt = this.parseSavedAtFromKey(dto.s3Key);
    await this.ensureUploadedObject(dto.s3Key);
    const venueId = await this.loadVenueIdFromS3Key(dto.s3Key);

    const saved = await this.prisma.layoutVersion.update({
      where: { id: version.id },
      data: {
        venueId,
        label: dto.label !== undefined ? dto.label ?? null : version.label
      }
    });

    const history = await this.recordHistory(saved, dto.s3Key, savedAt, dto.label);

    return {
      meta: this.toVersionMeta(saved),
      history: this.toHistoryMeta(history)
    };
  }

  async deleteVersion(name: string) {
    const version = await this.findByNameOrThrow(name);
    await this.s3.deleteByPrefix(version.s3Prefix);
    await this.prisma.layoutVersion.delete({ where: { id: version.id } });
    return { ok: true as const, name };
  }

  private async buildPresignUpload(versionName: string): Promise<PresignUploadResponse> {
    const savedAt = new Date();
    const s3Key = this.s3.historyObjectKey(versionName, savedAt);
    const uploadUrl = await this.s3.createPresignedLayoutUpload(s3Key);
    const contentType = this.s3.layoutJsonContentType();

    return {
      uploadUrl,
      s3Key,
      savedAt: savedAt.toISOString(),
      headers: { "Content-Type": contentType },
      expiresIn: 900
    };
  }

  private async recordHistory(
    version: VersionRow,
    s3Key: string,
    savedAt: Date,
    label?: string
  ): Promise<HistoryRow> {
    return this.prisma.layoutVersionHistory.create({
      data: {
        versionId: version.id,
        s3Key,
        savedAt,
        label: label ?? null
      }
    });
  }

  private async ensureUploadedObject(s3Key: string): Promise<void> {
    const exists = await this.s3.objectExists(s3Key);
    if (!exists) {
      throw new BadRequestException(
        "Layout file was not found in S3. Upload to the presigned URL before finalize."
      );
    }
  }

  private assertValidHistoryKey(versionName: string, s3Key: string): void {
    const expectedPrefix = this.s3.versionFolderPrefix(versionName);
    if (!s3Key.startsWith(expectedPrefix)) {
      throw new BadRequestException("Invalid s3Key for this layout version.");
    }

    const suffix = s3Key.slice(expectedPrefix.length);
    if (!HISTORY_KEY_PATTERN.test(suffix)) {
      throw new BadRequestException("Invalid layout history object key format.");
    }
  }

  private parseSavedAtFromKey(s3Key: string): Date {
    const match = /(\d{4})\/(\d{2})\/(\d{2})\/(\d{2})(\d{2})(\d{2})\.json$/.exec(s3Key);
    if (!match) {
      throw new BadRequestException("Could not parse savedAt from s3Key.");
    }

    const [, y, m, d, h, min, s] = match;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s)));
  }

  private async loadVenueIdFromS3Key(s3Key: string): Promise<string | null> {
    const json = await this.s3.getJson(s3Key);
    try {
      const layout = JSON.parse(json) as Record<string, unknown>;
      return this.extractVenueId(layout);
    } catch {
      throw new BadRequestException("Uploaded layout JSON is invalid.");
    }
  }

  private async resolveHistoryEntry(
    versionId: number,
    query: GetLayoutVersionQueryDto
  ): Promise<HistoryRow> {
    if (query.historyId !== undefined) {
      const row = await this.prisma.layoutVersionHistory.findFirst({
        where: { id: query.historyId, versionId }
      });
      if (!row) {
        throw new NotFoundException(`History #${query.historyId} not found.`);
      }
      return row;
    }

    if (query.savedAt) {
      const at = new Date(query.savedAt);
      if (Number.isNaN(at.getTime())) {
        throw new BadRequestException("Invalid savedAt query parameter.");
      }
      const row = await this.prisma.layoutVersionHistory.findFirst({
        where: { versionId, savedAt: { lte: at } },
        orderBy: { savedAt: "desc" }
      });
      if (!row) {
        throw new NotFoundException("No history at or before the requested savedAt.");
      }
      return row;
    }

    const latest = await this.prisma.layoutVersionHistory.findFirst({
      where: { versionId },
      orderBy: { savedAt: "desc" }
    });
    if (!latest) {
      throw new NotFoundException("This version has no saved history yet.");
    }
    return latest;
  }

  private async loadLayoutFromHistory(history: HistoryRow): Promise<unknown> {
    const json = await this.s3.getJson(history.s3Key);
    try {
      return JSON.parse(json);
    } catch {
      throw new BadRequestException("Stored layout JSON is invalid.");
    }
  }

  private async findByNameOrThrow(name: string): Promise<VersionRow> {
    const row = await this.prisma.layoutVersion.findUnique({ where: { name } });
    if (!row) {
      throw new NotFoundException(`Layout version "${name}" not found.`);
    }
    return row;
  }

  private extractVenueId(layout: Record<string, unknown>): string | null {
    if (layout.version === 3 && layout.venues && typeof layout.venues === "object") {
      const active = layout.activeVenueId;
      if (typeof active === "string" && active.trim()) return active.trim();
      return "campus_map";
    }
    const venueId = layout.venueId;
    return typeof venueId === "string" && venueId.trim() ? venueId.trim() : null;
  }

  private toVersionMeta(row: VersionRow) {
    return {
      name: row.name,
      s3Prefix: row.s3Prefix,
      venueId: row.venueId,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private toHistoryMeta(row: HistoryRow) {
    return {
      id: row.id,
      s3Key: row.s3Key,
      savedAt: row.savedAt.toISOString(),
      label: row.label
    };
  }
}
