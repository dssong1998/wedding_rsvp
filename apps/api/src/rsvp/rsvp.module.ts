import { Module } from "@nestjs/common";
import { NotifyModule } from "../notify/notify.module";
import { RsvpController } from "./rsvp.controller";
import { RsvpService } from "./rsvp.service";

@Module({
  imports: [NotifyModule],
  controllers: [RsvpController],
  providers: [RsvpService]
})
export class RsvpModule {}
