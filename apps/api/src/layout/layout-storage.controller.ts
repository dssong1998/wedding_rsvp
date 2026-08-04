import { Controller, Get } from "@nestjs/common";
import { LayoutService } from "./layout.service";

@Controller("layout")
export class LayoutStorageController {
  constructor(private readonly layoutService: LayoutService) {}

  @Get("storage/status")
  getStorageStatus() {
    return this.layoutService.getStorageStatus();
  }
}
