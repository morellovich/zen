import { Component, Input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Canvas, Textbox } from 'fabric';
import FontFaceObserver from 'fontfaceobserver';

@Component({
  selector: 'zen-toolbar-text',
  templateUrl: 'zen-toolbar-text.component.html',
  styleUrl: 'zen-toolbar-text.component.scss',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
})
export class ZenToolbarTextComponent {
  @Input() canvas!: Canvas;
  fill = '#000000';
  fonts = ['Pacifico', 'zen-default', 'zen-heading'];

  /** Returns focus to the textbox so typing continues after picking a colour */
  refocusTextbox() {
    const textbox = this.canvas.getActiveObject() as Textbox | undefined;

    if (textbox?.type === 'textbox' && textbox.isEditing) {
      textbox.hiddenTextarea?.focus();
    }
  }

  setFill(value: string) {
    this.fill = value;

    for (const obj of this.canvas.getActiveObjects()) {
      if (obj.type === 'textbox') {
        this.setTextStyle(obj as Textbox, 'fill', value);
      }
    }

    this.canvas.renderAll();
  }

  setTextStyle(object: Textbox, styleName: string, value: unknown) {
    if (object.isEditing) {
      // Applies to the highlighted characters only; returns void in v7
      object.setSelectionStyles({ [styleName]: value });
      object.setCoords();
    } else {
      object.set({ [styleName]: value });
    }
  }

  setFont(font: string) {
    for (const obj of this.canvas.getActiveObjects()) {
      if (obj.type !== 'textbox') continue;

      // Wait for the webfont before applying it, or fabric measures the fallback
      new FontFaceObserver(font)
        .load()
        .then(() => {
          this.setTextStyle(obj as Textbox, 'fontFamily', font);
          this.canvas.requestRenderAll();
        })
        .catch(e => console.error(`font loading failed ${font}`, e));
    }
  }
}
