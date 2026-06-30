import { Controller, Get } from "@nestjs/common";
import { GalleryService } from "./gallery.service";

@Controller("gallery")
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get("photos")
  async photos() {
    return this.galleryService.listPhotos();
  }
}
