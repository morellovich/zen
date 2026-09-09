import { Logger } from '@nestjs/common';

import { EnvironmentBase } from './environment.base';

const logger = new Logger('EnvironmentProduction');
logger.log(`loaded`);

export const environment: EnvironmentBase = {
  siteUrl: 'https://site.com/#',
  production: true,
  port: process.env.PORT as string,
  helmet: true,
  publicRegistration: true,
  cors: {
    credentials: true,
    // `capacitor://localhost` is the iOS native origin, `https://localhost` the Android one
    origin: ['https://portal.site.com', 'capacitor://localhost', 'https://localhost'],
  },
  socketio: {
    port: +(process.env.SOCKETIO_PORT as string),
  },
  graphql: {
    subscriptions: true,
    sandbox: false,
    introspection: false,
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
      publicKey: process.env.JWT_PUBLIC_KEY,
      signOptions: {
        algorithm: 'ES256',
        /**
         * Access token lifetime.  The client refreshes ahead of this and also
         * reactively when a request is rejected for an expired token.
         * @see `libs\common\src\lib\environment` for `EnvironmentProd.jwtExchangeInterval`
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
    loginConfirmedURL: 'https://site.com/#/login-confirmed',
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: 'https://api.site.com/auth/google/redirect',
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
