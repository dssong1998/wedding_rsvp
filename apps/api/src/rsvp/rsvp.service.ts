import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotifyService } from "../notify/notify.service";
import { UpsertRsvpDto } from "./dto/upsert-rsvp.dto";

@Injectable()
export class RsvpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifyService: NotifyService
  ) {}

  async getMine(name: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { name },
      include: { rsvp: true }
    });
    if (!guest) {
      throw new NotFoundException("등록된 하객을 찾을 수 없습니다.");
    }
    return {
      guest: { id: guest.id, name: guest.name, seats: guest.seats },
      rsvp: guest.rsvp
    };
  }

  async upsert(dto: UpsertRsvpDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("이름은 필수입니다.");
    }
    if (!dto.addrRoad.trim()) {
      throw new BadRequestException("주소는 필수입니다.");
    }

    const guest = await this.prisma.guest.findUnique({
      where: { name }
    });
    if (!guest) {
      throw new NotFoundException("초대 명단에서 이름을 찾을 수 없습니다.");
    }

    if (dto.weddingAttend && dto.headcount > guest.seats) {
      throw new BadRequestException(
        `참석 인원(${dto.headcount})이 확보 좌석(${guest.seats})을 초과했습니다.`
      );
    }

    const normalizedHeadcount = dto.weddingAttend ? dto.headcount : 0;
    const saved = await this.prisma.rsvp.upsert({
      where: { guestId: guest.id },
      create: {
        guestId: guest.id,
        weddingAttend: dto.weddingAttend,
        afterAttend: dto.afterAttend,
        headcount: normalizedHeadcount,
        addrRoad: dto.addrRoad.trim(),
        addrZip: dto.addrZip?.trim() || null,
        addrDetail: dto.addrDetail?.trim() || null
      },
      update: {
        weddingAttend: dto.weddingAttend,
        afterAttend: dto.afterAttend,
        headcount: normalizedHeadcount,
        addrRoad: dto.addrRoad.trim(),
        addrZip: dto.addrZip?.trim() || null,
        addrDetail: dto.addrDetail?.trim() || null
      }
    });

    const aggregate = await this.prisma.rsvp.aggregate({
      where: { weddingAttend: true },
      _sum: { headcount: true }
    });
    const totalAttendees = aggregate._sum.headcount ?? 0;

    const labelAttend = dto.weddingAttend ? "참석" : "불참";
    const labelAfter = dto.afterAttend ? "참석" : "불참";
    const notify = `${guest.name}님 RSVP · 결혼식 ${labelAttend} (${normalizedHeadcount}명), 애프터 ${labelAfter} · 현재 누적 ${totalAttendees}명`;
    await this.notifyService.sendRsvpNotification(notify);

    return {
      guestId: guest.id,
      name: guest.name,
      seats: guest.seats,
      weddingAttend: saved.weddingAttend,
      afterAttend: saved.afterAttend,
      headcount: saved.headcount,
      addrRoad: saved.addrRoad,
      addrZip: saved.addrZip,
      addrDetail: saved.addrDetail,
      totalAttendees,
      updatedAt: saved.updatedAt
    };
  }
}
