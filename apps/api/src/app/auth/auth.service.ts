import { Injectable } from '@nestjs/common';
import { CaslFactory, JwtAccessPayload, JwtExchangePayload, RequestUser } from '@zen/nest-auth';
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

  async getAuthSession(user: RequestUser, rememberMe = false): Promise<AuthSession> {
    const jwtExchangePayload: JwtExchangePayload = {
      use: 'exchange',
      sub: user.id,
    };

    const exchangeTokenExpiresIn = rememberMe
      ? this.config.jwt.exchangeTokenLifetimeRememberMe
      : this.config.jwt.exchangeTokenLifetimeDontRememberMe;

    const exchangeToken = this.jwtService.sign(jwtExchangePayload, {
      expiresIn: exchangeTokenExpiresIn,
    });

    const jwtAccessPayload: JwtAccessPayload = {
      use: 'access',
      sub: user.id,
      roles: user.roles,
    };

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

  async createAbility(user: RequestUser): Promise<AppAbility> {
    return this.caslFactory.createAbility(user);
  }

  accessibleBy = accessibleBy;

  /**
   * @returns `RequestUser` if valid and `null` otherwise
   */
  async authorizeJwt(accessToken: string): Promise<RequestUser | null> {
    const jwtPayload = this.jwtService.decode(accessToken) as JwtAccessPayload;
    return this.jwtStrategy.validate(jwtPayload);
  }

  async hashPassword(password: string) {
    return bcrypt({
      // @default 12 bytes
      costFactor: this.config.bcrypt?.costFactor ?? 12,
      password,
      salt: crypto.getRandomValues(
        // @default 16 bytes
        new Uint8Array(this.config.bcrypt?.saltSize ?? 16)
      ),
    });
  }
}
