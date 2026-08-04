import { Module } from "@nestjs/common";
import { LayoutController } from "./layout.controller";
import { LayoutStorageController } from "./layout-storage.controller";
import { LayoutService } from "./layout.service";
import { S3Service } from "./s3.service";

@Module({
  controllers: [LayoutController, LayoutStorageController],
  providers: [LayoutService, S3Service]
})
export class LayoutModule {}
