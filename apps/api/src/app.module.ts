import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AdminModule } from "./admin/admin.module";
import { ChatbotModule } from "./chatbot/chatbot.module";
import { GalleryModule } from "./gallery/gallery.module";
import { GuestMessagesModule } from "./guest-messages/guest-messages.module";
import { GuestsModule } from "./guests/guests.module";
import { NotifyModule } from "./notify/notify.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RsvpModule } from "./rsvp/rsvp.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }]
    }),
    PrismaModule,
    NotifyModule,
    ChatbotModule,
    GalleryModule,
    GuestMessagesModule,
    GuestsModule,
    RsvpModule,
    AdminModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
