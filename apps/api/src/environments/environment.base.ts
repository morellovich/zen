import { FastifyHelmetOptions } from '@fastify/helmet';
import { MailerOptions } from '@nestjs-modules/mailer';
import { NestApplicationOptions } from '@nestjs/common';
import { JwtModuleOptions } from '@nestjs/jwt';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import processRequest from 'graphql-upload/processRequest.mjs';
import { StrategyOptions as GoogleStrategyOptions } from 'passport-google-oauth20';

export abstract class EnvironmentBase {
  readonly siteUrl: string;
  readonly production: boolean;
  readonly port: string | number;
  readonly expressPort?: string | number;
  readonly cors?: NestApplicationOptions['cors'];
  readonly helmet?: boolean | FastifyHelmetOptions;
  readonly graphql: {
    readonly subscriptions?: boolean;
    readonly sandbox?: boolean;
    readonly introspection?: boolean;
    readonly csrfPrevention?: boolean;
    readonly uploads?: Parameters<typeof processRequest>[2];
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
