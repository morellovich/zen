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
      jwt: {
        exchangeTokenLifetimeRememberMe: 7_776_000,
        exchangeTokenLifetimeDontRememberMe: 86_400,
        options: { secret: SECRET, signOptions: { algorithm: 'HS256', expiresIn: 900 } },
      },
    } as unknown as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtStrategy,
        { provide: JwtService, useValue: new JwtService(config.jwt.options) },
        { provide: ConfigService, useValue: config },
        { provide: CaslFactory, useValue: { createAbility: () => ({ rules: [] }) } },
      ],
    }).compile();

    auth = module.get(AuthService);
    jwt = module.get(JwtService);
  });

  it('accepts a correctly signed access token', async () => {
    const { accessToken } = await auth.getAuthSession({ id: 'user-1', roles: [] });
    await expect(auth.authorizeJwt(accessToken)).resolves.toEqual({ id: 'user-1', roles: [] });
  });

  it('rejects a token signed with the wrong key', async () => {
    const forged = new JwtService({ secret: 'attacker-key' }).sign({
      use: 'access',
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
    const expired = jwt.sign(
      { use: 'access', aud: SITE_URL, sub: 'user-1', roles: [] },
      { expiresIn: -10 }
    );
    await expect(auth.authorizeJwt(expired)).resolves.toBeNull();
  });

  it('rejects a token issued for a different audience', async () => {
    const token = jwt.sign({ use: 'access', aud: 'https://evil.example', sub: 'user-1', roles: [] });
    await expect(auth.authorizeJwt(token)).resolves.toBeNull();
  });

  it('rejects an exchange token presented as an access token', async () => {
    const { exchangeToken } = await auth.getAuthSession({ id: 'user-1', roles: [] });
    await expect(auth.authorizeJwt(exchangeToken)).resolves.toBeNull();
  });

  it('rejects a password reset token presented as an access token', async () => {
    const resetToken = auth.signPasswordResetToken('user-1', 3600);
    await expect(auth.authorizeJwt(resetToken)).resolves.toBeNull();
  });

  it('issues a longer lived exchange token when rememberMe is set', async () => {
    const remembered = await auth.getAuthSession({ id: 'user-1', roles: [] }, true);
    const notRemembered = await auth.getAuthSession({ id: 'user-1', roles: [] }, false);

    expect(remembered.exchangeTokenExpiresIn).toBe(7_776_000);
    expect(notRemembered.exchangeTokenExpiresIn).toBe(86_400);
    // The access token lifetime does not depend on rememberMe
    expect(remembered.accessTokenExpiresIn).toBe(notRemembered.accessTokenExpiresIn);
  });

  it('verifyJwt only accepts a token of the requested use', async () => {
    const { exchangeToken } = await auth.getAuthSession({ id: 'user-1', roles: [] });

    await expect(auth.verifyJwt(exchangeToken, 'exchange')).resolves.toMatchObject({
      use: 'exchange',
      sub: 'user-1',
    });
    await expect(auth.verifyJwt(exchangeToken, 'access')).resolves.toBeNull();
  });
});
