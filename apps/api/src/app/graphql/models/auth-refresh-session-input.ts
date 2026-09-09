import { IsBoolean, IsJWT } from 'class-validator';

export class AuthRefreshSessionInput {
  @IsJWT()
  readonly exchangeToken: string;

  @IsBoolean()
  readonly rememberMe: boolean;
}
