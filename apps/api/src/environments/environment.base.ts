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
  readonly cors?: NestApplicationOptions['cors'];
  readonly helmet?: boolean | HelmetOptions;
  readonly graphql: {
    readonly subscriptions?: boolean;
    readonly sandbox?: boolean;
    readonly introspection?: boolean;
    readonly csrfPrevention?: boolean;
    readonly uploads?: Parameters<typeof graphqlUploadExpress>[0];
  };
  readonly publicRegistration: boolean;
  readonly jwtOptions: JwtModuleOptions;
  readonly expiresInRememberMe: number;
  readonly mail: Omit<MailerOptions, 'template'>;
  readonly throttle: ThrottlerModuleOptions;
  /** We are utilizing [hash-wasm](https://github.com/Daninet/hash-wasm) for our implementation of bcrypt */
  readonly bcrypt?: {
    /** @default 12 */
    costFactor?: number;
    /**
     * In bytes (there are 8 bits in a byte)
     * @default 16 (128 bits)
     **/
    saltSize?: number;
  };
  readonly oauth?: {
    loginConfirmedURL: string;
    google?: GoogleStrategyOptions;
  };
}
