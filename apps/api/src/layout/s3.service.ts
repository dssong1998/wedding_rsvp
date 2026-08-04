import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Readable } from "node:stream";

const LAYOUT_JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const PRESIGN_EXPIRES_SECONDS = 900;

@Injectable()
export class S3Service {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly layoutPrefix: string;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>("AWS_REGION");
    const accessKeyId = this.config.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.config.get<string>("AWS_SECRET_ACCESS_KEY");
    this.bucket = this.config.get<string>("AWS_S3_BUCKET") ?? null;
    this.layoutPrefix = (this.config.get<string>("AWS_S3_LAYOUT_PREFIX") ?? "layouts").replace(
      /^\/+|\/+$/g,
      ""
    );

    if (region && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey }
      });
    } else {
      this.client = null;
    }
  }

  isConfigured(): boolean {
    return this.client !== null && this.bucket !== null;
  }

  /** S3 folder: layouts/{versionName}/ */
  versionFolderPrefix(versionName: string): string {
    return `${this.layoutPrefix}/${versionName}/`;
  }

  /** layouts/{versionName}/{YYYY}/{MM}/{DD}/{HHmmss}.json */
  historyObjectKey(versionName: string, savedAt: Date): string {
    const y = savedAt.getUTCFullYear();
    const m = String(savedAt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(savedAt.getUTCDate()).padStart(2, "0");
    const h = String(savedAt.getUTCHours()).padStart(2, "0");
    const min = String(savedAt.getUTCMinutes()).padStart(2, "0");
    const s = String(savedAt.getUTCSeconds()).padStart(2, "0");
    return `${this.versionFolderPrefix(versionName)}${y}/${m}/${d}/${h}${min}${s}.json`;
  }

  getBucketName(): string | null {
    return this.bucket;
  }

  getLayoutPrefix(): string {
    return this.layoutPrefix;
  }

  async putJson(key: string, body: string): Promise<void> {
    this.ensureConfigured();
    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket!,
        Key: key,
        Body: body,
        ContentType: LAYOUT_JSON_CONTENT_TYPE
      })
    );
  }

  layoutJsonContentType(): string {
    return LAYOUT_JSON_CONTENT_TYPE;
  }

  async createPresignedLayoutUpload(key: string): Promise<string> {
    this.ensureConfigured();
    const command = new PutObjectCommand({
      Bucket: this.bucket!,
      Key: key,
      ContentType: LAYOUT_JSON_CONTENT_TYPE
    });
    return getSignedUrl(this.client!, command, { expiresIn: PRESIGN_EXPIRES_SECONDS });
  }

  async objectExists(key: string): Promise<boolean> {
    this.ensureConfigured();
    try {
      await this.client!.send(
        new HeadObjectCommand({
          Bucket: this.bucket!,
          Key: key
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async getJson(key: string): Promise<string> {
    this.ensureConfigured();
    const response = await this.client!.send(
      new GetObjectCommand({
        Bucket: this.bucket!,
        Key: key
      })
    );

    if (!response.Body) {
      throw new ServiceUnavailableException("S3 object body is empty.");
    }

    return this.readBodyAsString(response.Body);
  }

  async deleteObject(key: string): Promise<void> {
    this.ensureConfigured();
    await this.client!.send(
      new DeleteObjectCommand({
        Bucket: this.bucket!,
        Key: key
      })
    );
  }

  /** Delete all objects under a prefix (version folder). */
  async deleteByPrefix(prefix: string): Promise<void> {
    this.ensureConfigured();
    let continuationToken: string | undefined;

    do {
      const listed = await this.client!.send(
        new ListObjectsV2Command({
          Bucket: this.bucket!,
          Prefix: prefix,
          ContinuationToken: continuationToken
        })
      );

      const objects = listed.Contents?.filter((item) => item.Key).map((item) => ({
        Key: item.Key!
      }));

      if (objects && objects.length > 0) {
        await this.client!.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket!,
            Delete: { Objects: objects }
          })
        );
      }

      continuationToken = listed.NextContinuationToken;
    } while (continuationToken);
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "AWS S3 is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET."
      );
    }
  }

  private async readBodyAsString(body: unknown): Promise<string> {
    if (typeof body === "string") return body;
    if (body instanceof Uint8Array) return Buffer.from(body).toString("utf8");
    if (body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks).toString("utf8");
    }
    if (typeof (body as { transformToString?: () => Promise<string> }).transformToString === "function") {
      return (body as { transformToString: () => Promise<string> }).transformToString();
    }
    throw new ServiceUnavailableException("Unsupported S3 response body.");
  }
}
