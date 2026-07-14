import { Body, Controller, Get, Post, Query, Sse, UseGuards } from "@nestjs/common";
import { AdminSessionGuard } from "../common/admin-session.guard";
import { ChatbotService } from "./chatbot.service";
import { ChatbotSubscribeQueryDto } from "./dto/chatbot-subscribe-query.dto";
import { CreateChatbotQuestionDto } from "./dto/create-chatbot-question.dto";
import { RespondChatbotQuestionDto } from "./dto/respond-chatbot-question.dto";

@Controller("chatbot")
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post("ask")
  ask(@Body() body: CreateChatbotQuestionDto) {
    return this.chatbotService.askUnknownQuestion({
      question: body.question,
      sessionId: body.sessionId,
      inviteName: body.inviteName
    });
  }

  @Sse("subscribe")
  subscribe(@Query() query: ChatbotSubscribeQueryDto) {
    return this.chatbotService.streamForSession(query.sessionId);
  }

  @UseGuards(AdminSessionGuard)
  @Get("admin/tickets")
  tickets() {
    return this.chatbotService.listTickets();
  }

  @UseGuards(AdminSessionGuard)
  @Post("admin/respond")
  respond(@Body() body: RespondChatbotQuestionDto) {
    return this.chatbotService.respondToTicket(body.ticketId, body.response);
  }

  @UseGuards(AdminSessionGuard)
  @Sse("admin/subscribe")
  adminSubscribe() {
    return this.chatbotService.streamForAdmin();
  }
}
