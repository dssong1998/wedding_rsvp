import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

function trimToOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export class PresignAppendLayoutUploadDto {
  @Transform(({ value }) => trimToOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
