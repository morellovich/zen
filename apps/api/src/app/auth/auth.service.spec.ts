import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CaslFactory } from '@zen/nest-auth';

import { ConfigService } from '../config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

const SECRET = 'test-signing-key';
const SITE_URL = 'http://localhost:4200/#';

describe('AuthService.authorizeJwt', () => {
  let auth: AuthService;
  let jwt: JwtService;

  beforeEach(async () => {
    const config = {
      siteUrl: SITE_URL,
      jwtOptions: { secret: SECRET, signOptions: { algorithm: 'HS256', expiresIn: 3600 } },
    } as unknown as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtStrategy,
        { provide: JwtService, useValue: new JwtService(config.jwtOptions) },
        { provide: ConfigService, useValue: config },
        { provide: CaslFactory, useValue: { createAbility: () => ({}) } },
      ],
    }).compile();

    auth = module.get(AuthService);
    jwt = module.get(JwtService);
  });

  it('accepts a correctly signed token', async () => {
    const token = jwt.sign({ aud: SITE_URL, sub: 'user-1', roles: [] });
    await expect(auth.authorizeJwt(token)).resolves.toEqual({ id: 'user-1', roles: [] });
  });

  it('rejects a token signed with the wrong key', async () => {
    const forged = new JwtService({ secret: 'attacker-key' }).sign({
      aud: SITE_URL,
      sub: 'attacker',
      roles: ['Super'],
    });
    await expect(auth.authorizeJwt(forged)).resolves.toBeNull();
  });

  it('rejects a malformed token without throwing', async () => {
    await expect(auth.authorizeJwt('garbage.token.here')).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ aud: SITE_URL, sub: 'user-1', roles: [] }, { expiresIn: -10 });
    await expect(auth.authorizeJwt(expired)).resolves.toBeNull();
  });

  it('rejects a token issued for a different audience', async () => {
    const token = jwt.sign({ aud: 'https://evil.example', sub: 'user-1', roles: [] });
    await expect(auth.authorizeJwt(token)).resolves.toBeNull();
  });
});
