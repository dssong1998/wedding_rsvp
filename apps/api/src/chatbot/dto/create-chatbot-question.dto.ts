import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateChatbotQuestionDto {
  @IsString()
  @MaxLength(300)
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  inviteName?: string;
}
