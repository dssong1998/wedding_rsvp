import { Module } from "@nestjs/common";
import { NotifyModule } from "../notify/notify.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [NotifyModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
