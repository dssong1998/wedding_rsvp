import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { FinalizeCreateLayoutVersionDto } from "./dto/finalize-create-layout-version.dto";
import { FinalizeUpdateLayoutVersionDto } from "./dto/finalize-update-layout-version.dto";
import { GetLayoutVersionQueryDto } from "./dto/get-layout-version-query.dto";
import { PresignAppendLayoutUploadDto } from "./dto/presign-append-layout-upload.dto";
import { PresignCreateLayoutUploadDto } from "./dto/presign-create-layout-upload.dto";
import { LayoutService } from "./layout.service";

@Controller(["layout/versions", "layout/version"])
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) {}

  @Get()
  async list() {
    return this.layoutService.listVersions();
  }

  @Post("presign")
  async presignCreate(@Body() body: PresignCreateLayoutUploadDto) {
    return this.layoutService.presignCreateUpload(body);
  }

  @Get(":name/history")
  async listHistory(@Param("name") name: string) {
    return this.layoutService.listVersionHistory(name.trim());
  }

  @Get(":name/history/:historyId")
  async getHistoryEntry(
    @Param("name") name: string,
    @Param("historyId", ParseIntPipe) historyId: number
  ) {
    return this.layoutService.getHistoryLayout(name.trim(), historyId);
  }

  @Post(":name/presign")
  async presignAppend(@Param("name") name: string, @Body() body: PresignAppendLayoutUploadDto) {
    return this.layoutService.presignAppendUpload(name.trim(), body);
  }

  @Get(":name")
  async getByName(@Param("name") name: string, @Query() query: GetLayoutVersionQueryDto) {
    return this.layoutService.getVersionLayout(name.trim(), query);
  }

  @Post()
  async create(@Body() body: FinalizeCreateLayoutVersionDto) {
    return this.layoutService.finalizeCreateVersion(body);
  }

  @Put(":name")
  async update(@Param("name") name: string, @Body() body: FinalizeUpdateLayoutVersionDto) {
    return this.layoutService.finalizeUpdateVersion(name.trim(), body);
  }

  @Delete(":name")
  async remove(@Param("name") name: string) {
    return this.layoutService.deleteVersion(name.trim());
  }
}
