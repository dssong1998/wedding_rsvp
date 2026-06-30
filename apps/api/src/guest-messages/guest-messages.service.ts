import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGuestMessageDto } from "./dto/create-guest-message.dto";
import { ListGuestMessagesQueryDto } from "./dto/list-guest-messages-query.dto";

@Injectable()
export class GuestMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListGuestMessagesQueryDto) {
    const take = Math.max(1, Math.min(50, query.limit ?? 12));
    const cursorId = query.cursor;
    const rows = await this.prisma.guestMessage.findMany({
      where: typeof cursorId === "number" ? { id: { lt: cursorId } } : undefined,
      orderBy: { id: "desc" },
      take: take + 1,
      select: {
        id: true,
        nickname: true,
        message: true,
        createdAt: true
      }
    });

    const hasMore = rows.length > take;
    const sliced = hasMore ? rows.slice(0, take) : rows;
    return {
      items: sliced,
      hasMore,
      nextCursor: hasMore ? sliced[sliced.length - 1]?.id ?? null : null
    };
  }

  async create(dto: CreateGuestMessageDto) {
    const nickname = dto.nickname.trim();
    const message = dto.message.trim();
    if (!nickname) {
      throw new BadRequestException("닉네임을 입력해 주세요.");
    }
    if (!message) {
      throw new BadRequestException("메시지를 입력해 주세요.");
    }

    const saved = await this.prisma.guestMessage.create({
      data: {
        nickname,
        message,
        inviteName: dto.inviteName?.trim() || null
      }
    });

    return {
      id: saved.id,
      nickname: saved.nickname,
      message: saved.message,
      createdAt: saved.createdAt
    };
  }
}
