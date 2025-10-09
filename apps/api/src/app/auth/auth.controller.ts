import { URLSearchParams } from 'url';

import { Controller, Get, Res, UseFilters, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, JwtExchangePayload, RequestUser } from '@zen/nest-auth';
import { Response } from 'express';

import { ConfigService } from '../config';
import { JwtService } from '../jwt';
import { EmailTakenExceptionFilter } from './strategies/email-taken-exception.filter';

@Controller('auth')
@UseFilters(EmailTakenExceptionFilter)
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@CurrentUser() user: RequestUser, @Res() res: Response) {
    const url = await this.getLoginConfirmedURL(user);
    res.redirect(url);
  }

  async getLoginConfirmedURL(user: RequestUser) {
    const jwtExchangePayload: JwtExchangePayload = {
      use: 'exchange',
      sub: user.id,
    };

    // Create a short lived exchange token to be used for the users' redirection
    const exchangeToken = this.jwtService.sign(jwtExchangePayload, {
      expiresIn: 3 * 60, // 3 minutes (in seconds)
    });

    const token = encodeURIComponent(exchangeToken);
    const queryParams = new URLSearchParams({ token });
    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
    return this.config.oauth!.loginConfirmedURL + '?' + queryParams;
  }
}
