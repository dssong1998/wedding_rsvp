import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

function trimToEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimToOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export class FinalizeUpdateLayoutVersionDto {
  @Transform(({ value }) => trimToEmpty(value))
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  s3Key!: string;

  @Transform(({ value }) => trimToOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
