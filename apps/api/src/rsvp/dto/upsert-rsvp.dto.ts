import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

function trimToEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export class UpsertRsvpDto {
  @Transform(({ value }) => trimToEmpty(value))
  @IsString()
  @MaxLength(40)
  name!: string;

  @IsBoolean()
  weddingAttend!: boolean;

  @IsBoolean()
  afterAttend!: boolean;

  @IsInt()
  @Min(1)
  headcount!: number;

  @Transform(({ value }) => trimToEmpty(value))
  @IsString()
  @MaxLength(140)
  addrRoad!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : undefined))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  addrZip?: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : undefined))
  @IsOptional()
  @IsString()
  @MaxLength(140)
  addrDetail?: string;
}
