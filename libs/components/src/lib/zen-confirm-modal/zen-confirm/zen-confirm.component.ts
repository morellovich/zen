import { AfterContentInit, Component, Inject, Input, ViewChild, inject } from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ZenConfirmOptions } from '../zen-confirm-options';

@Component({
  selector: 'zen-confirm',
  templateUrl: 'zen-confirm.component.html',
  standalone: true,
  imports: [MatButtonModule],
})
export class ZenConfirmComponent implements AfterContentInit {
  @ViewChild('confirmBtn') confirmBtn!: MatButton;
  @Input() title = 'Are you sure?';
  @Input() confirmText = 'Yes';
  @Input() cancelText = 'No';

  data: ZenConfirmOptions | undefined = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ZenConfirmComponent>);

  constructor() {
    if (this.data?.title) this.title = this.data.title;
    if (this.data?.confirmText) this.confirmText = this.data.confirmText;
    if (this.data?.cancelText) this.cancelText = this.data.cancelText;
  }

  ngAfterContentInit() {
    setTimeout(() => {
      this.confirmBtn.focus();
    });
  }
}
