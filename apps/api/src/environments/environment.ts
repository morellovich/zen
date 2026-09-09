import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

import { EnvironmentBase } from './environment.base';

const logger = new Logger('EnvironmentDevelopment');
dotenv.config({ quiet: true });
logger.log(`.env file loaded`);

export const environment: EnvironmentBase = {
  siteUrl: 'http://localhost:4200/#',
  production: false,
  port: 7080,
  helmet: false,
  publicRegistration: true,
  cors: { credentials: true, origin: true },
  socketio: {
    port: 7081,
  },
  graphql: {
    subscriptions: true,
    sandbox: true,
    introspection: true,
    csrfPrevention: true,
    uploads: {
      maxFileSize: 20_000_000, // 20 MB
      maxFiles: 5,
    },
  },
  jwt: {
    exchangeTokenLifetimeRememberMe: 7_776_000, // 90 days (in seconds)
    exchangeTokenLifetimeDontRememberMe: 86_400, // 1 day (in seconds)
    options: {
      secret: process.env.JWT_PRIVATE_KEY,
      signOptions: {
        algorithm: 'HS256',
        /**
         * Access token lifetime.  The client refreshes ahead of this and also
         * reactively when a request is rejected for an expired token.
         * @see `libs\common\src\lib\environment` for `EnvironmentDev.jwtExchangeInterval`
         */
        expiresIn: 900, // 15 minutes (in seconds)
      },
    },
  },
  mail: {
    // Docs: https://nodemailer.com/smtp/
    transport: {
      host: process.env.SMTP_SERVER,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for port 465, false for other ports
      auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    defaults: {
      from: process.env.SMTP_FROM_NAME,
    },
  },
  throttle: {
    ignoreUserAgents: [/googlebot/gi, /bingbot/gi],
    throttlers: [
      {
        limit: 10,
        ttl: 30_000,
      },
    ],
  },
  bcrypt: {
    costFactor: 12,
    saltSize: 16,
  },
  oauth: {
    loginConfirmedURL: 'http://localhost:4200/#/login-confirmed',
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: 'http://localhost:7080/auth/google/redirect',
      scope: ['email'],
    },
  },
  openTelemetry: {
    serviceName: 'zen-api',
    exporters: {
      trace: {
        url: 'http://localhost:4318/v1/traces',
      },
      meter: {
        url: 'http://localhost:4318/v1/metrics',
      },
    },
  },
};
