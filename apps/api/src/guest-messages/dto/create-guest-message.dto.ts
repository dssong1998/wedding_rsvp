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

export class CreateGuestMessageDto {
  @Transform(({ value }) => trimToEmpty(value))
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  nickname!: string;

  @Transform(({ value }) => trimToEmpty(value))
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  message!: string;

  @Transform(({ value }) => trimToOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  inviteName?: string;
}
