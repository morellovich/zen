import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { Environment } from '@zen/common';
import { verticalAccordion } from '@zen/components/animations';

import { IfPublicRegistrationDirective } from '../directives/if-public-registration.directive';
import { ZenLoginFormComponent } from '../zen-login-form/zen-login-form.component';

@Component({
  selector: 'zen-login-page',
  templateUrl: 'zen-login-page.component.html',
  animations: [...verticalAccordion],
  standalone: true,
  imports: [IfPublicRegistrationDirective, MatButtonModule, RouterLink, ZenLoginFormComponent],
})
export class ZenLoginPageComponent {
  private router = inject(Router);
  private env = inject(Environment);

  onLoggedIn() {
    this.router.navigateByUrl(this.env.url.loginRedirect);
  }
}
