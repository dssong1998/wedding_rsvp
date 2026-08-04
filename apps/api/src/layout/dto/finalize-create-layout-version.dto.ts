import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

function trimToEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimToOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export class FinalizeCreateLayoutVersionDto {
  @Transform(({ value }) => trimToEmpty(value))
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, {
    message: "version name must start with alphanumeric and contain only letters, numbers, ., _, -"
  })
  name!: string;

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
