import { Meta, moduleMetadata } from '@storybook/angular';
import { AccountInfo, AuthPasswordChangeGQL } from '@zen/graphql';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from '../auth.service';
import { ZenPasswordChangeComponent } from './zen-password-change.component';

export default {
  title: 'ZenPasswordChangeComponent',
  component: ZenPasswordChangeComponent,
  decorators: [
    moduleMetadata({
      providers: [
        AuthPasswordChangeGQL,
        {
          provide: AuthService,
          useValue: {
            accountInfo$: new BehaviorSubject<AccountInfo>({ hasPassword: true }),
          },
        },
      ],
    }),
  ],
} as Meta<ZenPasswordChangeComponent>;

export const Primary = {
  render: (args: ZenPasswordChangeComponent) => ({
    props: args,
  }),
  args: {},
};
