import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  private readonly otpTtlMs = 5 * 60 * 1000;
  private readonly maxTries = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifyService: NotifyService
  ) {}

  async requestOtp(request: Request): Promise<{ ok: true }> {
    const code = String(Math.floor(Math.random() * 900000) + 100000);
    request.session.otpCode = code;
    request.session.otpExpiresAt = Date.now() + this.otpTtlMs;
    request.session.otpTries = 0;
    request.session.isAdmin = false;

    await this.notifyService.sendOtpNotification(
      `관리자 OTP 코드: ${code} (유효 5분)`
    );

    return { ok: true };
  }

  verifyOtp(request: Request, code: string): { ok: true } {
    const currentCode = request.session.otpCode;
    const expires = request.session.otpExpiresAt ?? 0;
    const tries = request.session.otpTries ?? 0;

    if (!currentCode || Date.now() > expires) {
      throw new UnauthorizedException("OTP가 만료되었습니다.");
    }
    if (tries >= this.maxTries) {
      throw new UnauthorizedException("OTP 시도 횟수를 초과했습니다.");
    }

    request.session.otpTries = tries + 1;
    if (code !== currentCode) {
      throw new UnauthorizedException("OTP 코드가 일치하지 않습니다.");
    }

    request.session.isAdmin = true;
    request.session.otpCode = undefined;
    request.session.otpExpiresAt = undefined;
    request.session.otpTries = 0;

    return { ok: true };
  }

  async getStats(): Promise<{ totalAttendees: number; totalResponses: number }> {
    const [attendees, responses] = await Promise.all([
      this.prisma.rsvp.aggregate({
        where: { weddingAttend: true },
        _sum: { headcount: true }
      }),
      this.prisma.rsvp.count()
    ]);

    return {
      totalAttendees: attendees._sum.headcount ?? 0,
      totalResponses: responses
    };
  }

  async getRsvps() {
    return this.prisma.rsvp.findMany({
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            seats: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
  }
}
