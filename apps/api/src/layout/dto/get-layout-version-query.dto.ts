import { Transform } from "class-transformer";
import { IsInt, IsISO8601, IsOptional } from "class-validator";

export class GetLayoutVersionQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    const n = Number.parseInt(String(value), 10);
    return Number.isFinite(n) ? n : undefined;
  })
  @IsInt()
  historyId?: number;

  /** ISO 8601 — 특정 시점 스냅샷 (가장 가까운 savedAt 이하) */
  @IsOptional()
  @IsISO8601()
  savedAt?: string;
}
