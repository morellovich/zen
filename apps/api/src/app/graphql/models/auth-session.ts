import { User } from '../../prisma';

export interface AuthSession {
  userId: User['id'];
  roles: string[];
  rules: object[];
  rememberMe: boolean;
  exchangeToken: string;
  exchangeTokenExpiresIn: number;
  accessToken: string;
  accessTokenExpiresIn: number;
}
