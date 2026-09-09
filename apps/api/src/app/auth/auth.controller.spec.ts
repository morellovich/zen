import { Test, TestingModule } from '@nestjs/testing';

import { ConfigService } from '../config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('Auth Controller', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signExchangeToken: () => 'abc.def_+/ghi.jkl==',
          },
        },
        {
          provide: ConfigService,
          useValue: <ConfigService>{
            oauth: { loginConfirmedURL: 'http://site.com/login-confirmed' },
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('constructs a valid query string from an AuthSession', async () => {
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    const url = await controller.getLoginConfirmedURL({ id: 'user-1', roles: [] } as any);
    expect(url).toEqual(
      'http://site.com/login-confirmed?token=abc.def_%252B%252Fghi.jkl%253D%253D'
    );
  });
});
