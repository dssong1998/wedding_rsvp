import { Transform } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

function toOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class ListGuestMessagesQueryDto {
  @Transform(({ value }) => toOptionalInt(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  cursor?: number;

  @Transform(({ value }) => toOptionalInt(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
