import { IsString, MaxLength } from "class-validator";

export class RespondChatbotQuestionDto {
  @IsString()
  @MaxLength(80)
  ticketId!: string;

  @IsString()
  @MaxLength(500)
  response!: string;
}
