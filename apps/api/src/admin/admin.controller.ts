import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { IsString, Length } from "class-validator";
import type { Request } from "express";
import { AdminSessionGuard } from "../common/admin-session.guard";
import { AdminService } from "./admin.service";

class VerifyOtpDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("otp/request")
  async requestOtp(@Req() request: Request) {
    return this.adminService.requestOtp(request);
  }

  @Post("otp/verify")
  async verifyOtp(@Req() request: Request, @Body() body: VerifyOtpDto) {
    return this.adminService.verifyOtp(request, body.code.trim());
  }

  @UseGuards(AdminSessionGuard)
  @Get("stats")
  async stats() {
    return this.adminService.getStats();
  }

  @UseGuards(AdminSessionGuard)
  @Get("rsvps")
  async rsvps() {
    return this.adminService.getRsvps();
  }
}
