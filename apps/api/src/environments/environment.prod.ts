import { Logger } from '@nestjs/common';

import { EnvironmentBase } from './environment.base';

const logger = new Logger('EnvironmentProduction');
logger.log(`loaded`);

export const environment: EnvironmentBase = {
  siteUrl: 'https://site.com/#',
  production: true,
  expressPort: process.env.PORT as string,
  helmet: true,
  publicRegistration: true,
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
    options: {
      secret: process.env.JWT_PRIVATE_KEY,
      publicKey: process.env.JWT_PUBLIC_KEY,
      signOptions: {
        algorithm: 'ES256',
        /**
         * The client will exchange for a new access token every 3 minutes during active sessions
         * @see `libs\common\src\lib\environment` for `EnvironmentDev.jwtExchangeInterval`
         */
        expiresIn: 4 * 60, // 4 minutes (in seconds)
      },
    },
    exchangeTokenLifetimeRememberMe: 3 * 30 * 24 * 60 * 60, // 3 months (in seconds)
  },
  mail: {
    transport: {
      host: process.env.SMTP_SERVER,
      port: 587,
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
};
