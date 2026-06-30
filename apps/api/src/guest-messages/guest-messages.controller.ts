import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CreateGuestMessageDto } from "./dto/create-guest-message.dto";
import { ListGuestMessagesQueryDto } from "./dto/list-guest-messages-query.dto";
import { GuestMessagesService } from "./guest-messages.service";

@Controller("guest-messages")
export class GuestMessagesController {
  constructor(private readonly guestMessagesService: GuestMessagesService) {}

  @Get()
  async list(@Query() query: ListGuestMessagesQueryDto) {
    return this.guestMessagesService.list(query);
  }

  @Post()
  async create(@Body() body: CreateGuestMessageDto) {
    return this.guestMessagesService.create(body);
  }
}
