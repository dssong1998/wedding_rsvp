import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { UpsertRsvpDto } from "./dto/upsert-rsvp.dto";
import { RsvpService } from "./rsvp.service";

@Controller("rsvp")
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  @Post()
  async upsert(@Body() body: UpsertRsvpDto) {
    return this.rsvpService.upsert(body);
  }

  @Get("me")
  async me(@Query("name") name?: string) {
    const normalized = name?.trim();
    if (!normalized) {
      throw new BadRequestException("name 파라미터가 필요합니다.");
    }
    return this.rsvpService.getMine(normalized);
  }
}
