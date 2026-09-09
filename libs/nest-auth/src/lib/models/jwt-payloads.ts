import { RequestUser } from './request-user';

interface JwtPayloadBase {
  /** The site URL the token was minted for */
  readonly aud: string;
  readonly sub: RequestUser['id'];
  readonly iat?: number;
  readonly exp?: number;
}

/**
 * Long lived token, used only to obtain a new session.  Carries no roles, so it
 * grants nothing on its own.
 */
export interface JwtExchangePayload extends JwtPayloadBase {
  readonly use: 'exchange';
}

/** Short lived token presented on every authenticated request */
export interface JwtAccessPayload extends JwtPayloadBase {
  readonly use: 'access';
  readonly roles: RequestUser['roles'];
}

/** Single purpose token emailed to a user to authorize a password reset */
export interface JwtPasswordResetPayload extends JwtPayloadBase {
  readonly use: 'password reset';
}

export type JwtPayload = JwtExchangePayload | JwtAccessPayload | JwtPasswordResetPayload;
