import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ApiError } from '@zen/common';
import { JwtPayload, RequestUser } from '@zen/nest-auth';
import { FastifyRequest } from 'fastify';
import { Strategy } from 'passport-jwt';

import { ConfigService } from '../../config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      /** @see [passport-jwt docs](http://www.passportjs.org/packages/passport-jwt/) */
      secretOrKey: config.jwtOptions.publicKey
        ? (config.jwtOptions.publicKey as string)
        : (config.jwtOptions.secret as string),

      jwtFromRequest: (req: (FastifyRequest | { token?: string; headers?: Record<string, string | string[] | undefined> })) => {
        // Websocket connection
        if ('token' in req && req.token) return req.token;
        // HTTP request
        const headers = req.headers as Record<string, string | string[] | undefined> | undefined;
        let authHeader = headers?.authorization || headers?.Authorization;
        if (Array.isArray(authHeader)) authHeader = authHeader[0];
        if (!authHeader) throw new UnauthorizedException(ApiError.JwtErrors.NO_HEADER);

        if (authHeader.slice(0, 7) !== 'Bearer ')
          throw new UnauthorizedException(ApiError.JwtErrors.NO_BEARER);
        // Strips `'Bearer '` and returns only the token
        return authHeader.substring(7);
      },
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser | null> {
    // Validate the audience as the site URL
    if (payload.aud !== this.config.siteUrl) return null;

    return {
      id: payload.sub,
      roles: payload.roles,
    };
  }
}
