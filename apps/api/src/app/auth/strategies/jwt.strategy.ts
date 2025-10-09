import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ApiError } from '@zen/common';
import { JwtAccessPayload, RequestUser } from '@zen/nest-auth';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';

import { ConfigService } from '../../config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      /** @see [passport-jwt docs](http://www.passportjs.org/packages/passport-jwt/) */
      secretOrKey: config.jwt.options.publicKey
        ? config.jwt.options.publicKey
        : (config.jwt.options.secret as string | Buffer),

      jwtFromRequest: (req: Request & { token?: string }) => {
        // Websocket connection
        if (req.token) return req.token;
        // HTTP request
        let authHeader = req.header('Authorization');
        if (!authHeader) authHeader = req.header('authorization');
        if (!authHeader) throw new UnauthorizedException(ApiError.JwtErrors.NO_HEADER);

        if (authHeader.startsWith('Bearer '))
          throw new UnauthorizedException(ApiError.JwtErrors.NO_BEARER);

        return authHeader.substring(7); // Strips `'Bearer '` and returns only the token
      },
    });
  }

  async validate(payload: JwtAccessPayload): Promise<RequestUser | null> {
    // Validate if it is an access token
    if (payload.use !== 'access') return null;

    return {
      id: payload.sub,
      roles: payload.roles,
    };
  }
}
