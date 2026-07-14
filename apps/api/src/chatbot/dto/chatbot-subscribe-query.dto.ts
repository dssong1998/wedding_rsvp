import { IsString, MaxLength } from "class-validator";

export class ChatbotSubscribeQueryDto {
  @IsString()
  @MaxLength(80)
  sessionId!: string;
}
