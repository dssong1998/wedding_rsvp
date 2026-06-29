import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { GuestsService } from "./guests.service";

@Controller("guests")
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get("lookup")
  async lookup(@Query("name") name?: string): Promise<{ status: "ok"; name: string; seats: number } | { status: "not_found" }> {
    const normalized = name?.trim();
    if (!normalized) {
      throw new BadRequestException("name 파라미터가 필요합니다.");
    }
    return this.guestsService.lookupByName(normalized);
  }
}
