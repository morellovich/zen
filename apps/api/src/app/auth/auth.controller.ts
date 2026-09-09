import { URLSearchParams } from 'url';

import { Controller, Get, Res, UseFilters, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, RequestUser } from '@zen/nest-auth';
import { FastifyReply } from 'fastify';

import { ConfigService } from '../config';
import { AuthService } from './auth.service';
import { EmailTakenExceptionFilter } from './strategies/email-taken-exception.filter';

@Controller('auth')
@UseFilters(EmailTakenExceptionFilter)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@CurrentUser() user: RequestUser, @Res() res: FastifyReply) {
    const url = await this.getLoginConfirmedURL(user);
    res.redirect(url);
  }

  async getLoginConfirmedURL(user: RequestUser) {
    // A short lived exchange token, immediately traded for a session by the
    // portal.  It carries no roles, so exposing it in a redirect URL grants
    // nothing on its own.
    const exchangeToken = this.auth.signExchangeToken(user.id, 3 * 60); // 3 minutes
    const token = encodeURIComponent(exchangeToken);
    const queryParams = new URLSearchParams({ token });
    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
    return this.config.oauth!.loginConfirmedURL + '?' + queryParams;
  }
}
