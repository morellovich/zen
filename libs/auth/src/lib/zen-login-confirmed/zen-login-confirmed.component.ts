import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Environment } from '@zen/common';
import { ZenSnackbarError, ZenSnackbarModule } from '@zen/components';
import { AuthRefreshSessionGQL } from '@zen/graphql';

import { AuthService } from '../auth.service';

/**
 * OIDC providers will redirect to this component after a successful login.
 * A short lived exchange token is provided in the query string,
 * which is then exchanged for a session.
 */
@Component({
  selector: 'zen-login-confirmed',
  template: ``,
  standalone: true,
  imports: [ZenSnackbarModule],
})
export class ZenLoginConfirmedComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private env = inject(Environment);
  private auth = inject(AuthService);
  private snackbarError = inject(ZenSnackbarError);
  private authRefreshSessionGQL = inject(AuthRefreshSessionGQL);

  constructor() {
    const query = this.route.snapshot.queryParams;
    const exchangeToken = decodeURIComponent(query['token']);

    this.authRefreshSessionGQL
      .fetch(
        {
          data: {
            exchangeToken,
            rememberMe: true,
          },
        },
        {
          fetchPolicy: 'no-cache',
        }
      )
      .subscribe({
        next: ({ data: { authRefreshSession } }) => {
          this.auth.setSession(authRefreshSession);
          this.router.navigateByUrl(this.env.url.loginRedirect);
        },
        error: e => {
          this.snackbarError.open(e);
          this.auth.logout();
        },
      });
  }
}
