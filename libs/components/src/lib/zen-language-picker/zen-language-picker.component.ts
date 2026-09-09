import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { languages } from '@zen/common';

import { ZenLanguagePickerModalComponent } from './zen-language-picker-modal/zen-language-picker-modal.component';

@Component({
  selector: 'zen-language-picker',
  templateUrl: 'zen-language-picker.component.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, TranslatePipe],
})
export class ZenLanguagePickerComponent {
  readonly #dialog = inject(MatDialog);
  readonly #translate = inject(TranslateService);

  /** `currentLang` is a signal, so the label re-renders on a language change */
  readonly languageDisplayText = computed(
    () => languages.find(option => option.value === this.#translate.currentLang())?.nativeSpelling
  );

  openModal() {
    this.#dialog.open(ZenLanguagePickerModalComponent);
  }
}
