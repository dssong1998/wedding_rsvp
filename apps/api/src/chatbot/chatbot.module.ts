import { Module } from "@nestjs/common";
import { NotifyModule } from "../notify/notify.module";
import { ChatbotController } from "./chatbot.controller";
import { ChatbotService } from "./chatbot.service";

@Module({
  imports: [NotifyModule],
  controllers: [ChatbotController],
  providers: [ChatbotService]
})
export class ChatbotModule {}
