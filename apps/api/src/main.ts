import "reflect-metadata";
import session = require("express-session");
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>("NODE_ENV") ?? "development";

  const allowedOrigins = (config.get<string>("CORS_ORIGIN") ??
    "https://dae-da.com,https://www.dae-da.com,http://localhost:3000,http://192.168.35.139:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowedOriginSet = new Set(allowedOrigins);
  const privateNetworkOriginRegex =
    /^https?:\/\/(?:(?:localhost|127\.0\.0\.1)|(?:192\.168(?:\.\d{1,3}){2})|(?:10(?:\.\d{1,3}){3})|(?:172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}))(?::\d{1,5})?$/i;

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOriginSet.has(origin)) {
        callback(null, true);
        return;
      }

      if (nodeEnv !== "production" && privateNetworkOriginRegex.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400
  });

  app.use(
    session({
      secret: config.get<string>("SESSION_SECRET") ?? "dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.get<string>("NODE_ENV") === "production",
        sameSite: config.get<string>("NODE_ENV") === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 8
      }
    })
  );

  await app.listen(Number.parseInt(config.get<string>("PORT") ?? "4000", 10));
}

bootstrap();
