import { RequestUser } from './request-user';

export interface JwtExchangePayload {
  readonly use: 'exchange';
  readonly sub: RequestUser['id'];
  readonly iat?: number;
  readonly exp?: number;
}

export interface JwtAccessPayload {
  readonly use: 'access';
  readonly sub: RequestUser['id'];
  readonly roles: RequestUser['roles'];
  readonly iat?: number;
  readonly exp?: number;
}

export interface JwtPasswordResetPayload {
  readonly use: 'password reset';
  readonly sub: RequestUser['id'];
  readonly iat?: number;
  readonly exp?: number;
}
