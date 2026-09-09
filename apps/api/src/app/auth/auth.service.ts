import { Injectable } from '@nestjs/common';
import {
  CaslFactory,
  JwtAccessPayload,
  JwtExchangePayload,
  JwtPasswordResetPayload,
  RequestUser,
} from '@zen/nest-auth';
import { bcrypt } from 'hash-wasm';

import { ConfigService } from '../config';
import { AuthSession } from '../graphql/models/auth-session';
import { JwtService } from '../jwt';
import { accessibleBy } from './casl/casl-prisma';
import { AppAbility } from './casl/casl.factory';
import { JwtStrategy } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtStrategy: JwtStrategy,
    private readonly config: ConfigService,
    private readonly caslFactory: CaslFactory
  ) {}

  /**
   * Issues a session as a pair of tokens:
   *
   * - a short lived **access token** carrying the user's roles, sent with every
   *   authenticated request
   * - a longer lived **exchange token** carrying no roles, whose only power is
   *   to obtain a new pair via `authRefreshSession`
   */
  async getAuthSession(user: RequestUser, rememberMe = false): Promise<AuthSession> {
    const exchangeTokenExpiresIn = rememberMe
      ? this.config.jwt.exchangeTokenLifetimeRememberMe
      : this.config.jwt.exchangeTokenLifetimeDontRememberMe;

    const exchangeToken = this.signExchangeToken(user.id, exchangeTokenExpiresIn);

    const jwtAccessPayload: JwtAccessPayload = {
      use: 'access',
      aud: this.config.siteUrl,
      sub: user.id,
      roles: user.roles,
    };

    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
    const accessTokenExpiresIn = this.config.jwt.options.signOptions!.expiresIn as number;

    const accessToken = this.jwtService.sign(jwtAccessPayload, {
      expiresIn: accessTokenExpiresIn,
    });

    const ability = await this.createAbility(user);

    return {
      userId: user.id,
      roles: user.roles,
      rules: ability.rules,
      rememberMe,
      exchangeToken,
      exchangeTokenExpiresIn,
      accessToken,
      accessTokenExpiresIn,
    };
  }

  signExchangeToken(userId: RequestUser['id'], expiresIn: number) {
    const jwtExchangePayload: JwtExchangePayload = {
      use: 'exchange',
      aud: this.config.siteUrl,
      sub: userId,
    };

    return this.jwtService.sign(jwtExchangePayload, { expiresIn });
  }

  signPasswordResetToken(userId: RequestUser['id'], expiresIn: number) {
    const jwtPasswordResetPayload: JwtPasswordResetPayload = {
      use: 'password reset',
      aud: this.config.siteUrl,
      sub: userId,
    };

    return this.jwtService.sign(jwtPasswordResetPayload, { expiresIn });
  }

  /**
   * Verifies signature and expiry, then checks the token is of `use` and is
   * addressed to this site.
   *
   * @returns the payload if valid, `null` otherwise
   */
  async verifyJwt<T extends { use: string; aud: string }>(
    token: string,
    use: T['use']
  ): Promise<T | null> {
    let payload: T;

    try {
      // `decode` performs no signature check, so only `verifyAsync` may be used here
      payload = await this.jwtService.verifyAsync<T>(token, {
        secret: this.config.jwt.options.publicKey
          ? undefined
          : (this.config.jwt.options.secret as string),
        publicKey: this.config.jwt.options.publicKey as string | undefined,
      });
    } catch {
      return null;
    }

    if (!payload || payload.use !== use || payload.aud !== this.config.siteUrl) return null;

    return payload;
  }

  async createAbility(user: RequestUser): Promise<AppAbility> {
    return this.caslFactory.createAbility(user);
  }

  accessibleBy = accessibleBy;

  /**
   * Verifies an access token before validating its claims.
   *
   * @returns `RequestUser` if valid and `null` otherwise
   */
  async authorizeJwt(accessToken: string): Promise<RequestUser | null> {
    const payload = await this.verifyJwt<JwtAccessPayload>(accessToken, 'access');
    if (!payload) return null;

    return this.jwtStrategy.validate(payload);
  }

  async hashPassword(password: string) {
    return bcrypt({
      costFactor: this.config.bcrypt?.costFactor ?? 12,
      password,
      salt: crypto.getRandomValues(new Uint8Array(this.config.bcrypt?.saltSize ?? 16)),
    });
  }
}
