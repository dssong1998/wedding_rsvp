import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async lookupByName(name: string): Promise<{ status: "ok"; name: string; seats: number } | { status: "not_found" }> {
    const guest = await this.prisma.guest.findUnique({
      where: { name },
      select: { name: true, seats: true }
    });
    if (!guest) {
      return { status: "not_found" };
    }
    return {
      status: "ok",
      name: guest.name,
      seats: guest.seats
    };
  }
}
