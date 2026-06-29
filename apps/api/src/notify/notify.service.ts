import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface DiscordPayload {
  content: string;
}

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(private readonly config: ConfigService) {}

  private async post(webhookUrl: string | undefined, payload: DiscordPayload): Promise<void> {
    if (!webhookUrl) {
      return;
    }
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        this.logger.warn(`Discord webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.logger.warn(
        `Discord webhook error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async sendRsvpNotification(message: string): Promise<void> {
    const webhook = this.config.get<string>("DISCORD_WEBHOOK_URL");
    await this.post(webhook, { content: message });
  }

  async sendOtpNotification(message: string): Promise<void> {
    const webhook = this.config.get<string>("DISCORD_OTP_WEBHOOK_URL");
    await this.post(webhook, { content: message });
  }
}
