import { MailerOptions } from '@nestjs-modules/mailer';
import { NestApplicationOptions } from '@nestjs/common';
import { JwtModuleOptions } from '@nestjs/jwt';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import { HelmetOptions } from 'helmet';
import { StrategyOptions as GoogleStrategyOptions } from 'passport-google-oauth20';

export abstract class EnvironmentBase {
  readonly siteUrl: string;
  readonly production: boolean;
  readonly expressPort: string | number;
  /** [Docs for options](https://docs.nestjs.com/security/cors) */
  readonly cors?: NestApplicationOptions['cors'];
  /** [Docs for options](https://helmetjs.github.io/#get-started) */
  readonly helmet?: boolean | HelmetOptions;
  readonly graphql: {
    readonly subscriptions?: boolean;
    readonly sandbox?: boolean;
    readonly introspection?: boolean;
    readonly csrfPrevention?: boolean;
    readonly uploads?: Parameters<typeof graphqlUploadExpress>[0];
  };
  /** Setting to allow for public registration.  If set to false, it will deny any requests made to the GraphQL endpoint:
   * ```graphql
   * type Mutation {
   *   authRegister(data: AuthRegisterInput!): AuthSession!
   * }
   * ```
   */
  readonly publicRegistration: boolean;
  readonly jwt: {
    /** [Docs for options](https://www.passportjs.org/packages/passport-jwt/) */
    readonly options: JwtModuleOptions;
    readonly exchangeTokenLifetimeRememberMe: number;
  };
  /** [Docs for options](https://nodemailer.com/smtp/) */
  readonly mail: Omit<MailerOptions, 'template'>;
  /** [Docs for options](https://docs.nestjs.com/security/rate-limiting#rate-limiting) */
  readonly throttle: ThrottlerModuleOptions;
  /** We are utilizing [hash-wasm](https://github.com/Daninet/hash-wasm) for our implementation of bcrypt */
  readonly bcrypt?: {
    /** @default 12 bytes */
    costFactor?: number;
    /** @default 16 bytes */
    saltSize?: number;
  };
  readonly oauth?: {
    loginConfirmedURL: string;
    /** [Docs for options](https://www.passportjs.org/packages/passport-google-oauth20/) */
    google?: GoogleStrategyOptions;
  };
}
