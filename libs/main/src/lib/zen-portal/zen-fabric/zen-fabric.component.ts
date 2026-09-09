import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Canvas, FabricImage, Textbox } from 'fabric';
import { Subscription, debounce, fromEvent, interval } from 'rxjs';

import { ZenContextmenuComponent, ZenMenuItem } from './zen-contextmenu';
import { ZenToolbarTextComponent } from './zen-toolbar-text';

@Component({
  selector: 'zen-fabric',
  templateUrl: 'zen-fabric.component.html',
  styleUrl: 'zen-fabric.component.scss',
  standalone: true,
  imports: [ZenContextmenuComponent, ZenToolbarTextComponent],
})
export class ZenFabricComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stubDiv') stubDiv!: ElementRef<HTMLDivElement>; // Used to calculate width
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contextMenu') contextMenu!: ZenContextmenuComponent;
  @ViewChild('toolbarText') toolbarText!: ZenToolbarTextComponent;
  canvas!: Canvas;

  #subs: Subscription[] = [];

  @HostListener('window:keydown.delete')
  handleDelete() {
    const selection = this.canvas.getActiveObjects();

    // Delete edits the text, not the canvas, while a textbox is being typed into
    const isEditing = selection.some(obj => obj.type === 'textbox' && (obj as Textbox).isEditing);
    if (isEditing) return;

    for (const obj of selection) {
      this.canvas.remove(obj);
    }

    this.canvas.discardActiveObject();
  }

  ngAfterViewInit() {
    this.canvas = new Canvas(this.canvasElement.nativeElement, {
      width: this.getWidth(),
      height: this.getHeight(),
      stopContextMenu: true,
      fireRightClick: true,
      preserveObjectStacking: true,
    });

    this.toolbarText.canvas = this.canvas;

    // Wait for the app to be rendered before updating dimensions
    setTimeout(() => this.updateDimensions());

    const sub = fromEvent(window, 'resize')
      .pipe(debounce(() => interval(200)))
      .subscribe(() => this.updateDimensions());
    this.#subs.push(sub);

    // Layering moved from the object to the canvas in Fabric v6
    const menu: ZenMenuItem[] = [
      {
        label: 'Reset position',
        action: obj => obj.set({ left: 0, top: 0 }),
      },
      { type: 'divider' },
      {
        label: 'Bring to front',
        action: obj => this.canvas.bringObjectToFront(obj),
      },
      {
        label: 'Bring forward',
        action: obj => this.canvas.bringObjectForward(obj),
      },
      {
        label: 'Send backwards',
        action: obj => this.canvas.sendObjectBackwards(obj),
      },
      {
        label: 'Send to back',
        action: obj => this.canvas.sendObjectToBack(obj),
      },
    ];
    this.contextMenu.setMenu(menu, this.canvas);

    this.canvas.on('mouse:down', ev => {
      // v5 exposed a 1-indexed `ev.button`; v7 leaves it to the native event,
      // where the secondary button is 2
      const isRightClick = (ev.e as MouseEvent).button === 2;

      if (isRightClick && ev.target) {
        this.contextMenu.open(ev.e as MouseEvent, ev.target);
        this.canvas.setActiveObject(ev.target);
        this.canvas.renderAll();
      }
    });

    void this.addSamples();
  }

  getWidth = () => this.stubDiv.nativeElement.offsetWidth;
  getHeight = () => window.innerHeight - this.stubDiv.nativeElement.getBoundingClientRect().y - 10;

  updateDimensions() {
    this.canvas.setDimensions({
      width: this.getWidth(),
      height: this.getHeight(),
    });
  }

  async addSamples() {
    const chatText = new Textbox('Sample text', {
      left: 250,
      top: 300,
      width: 300,
      fontFamily: 'zen-default',
      editable: true,
      textAlign: 'center',
    });
    this.canvas.add(chatText);

    // `fromURL` returns a promise in Fabric v6+, replacing the v5 callback
    const bubble = await FabricImage.fromURL('assets/chat-bubble.svg');
    this.canvas.add(bubble);
    this.canvas.sendObjectToBack(bubble);
    this.canvas.bringObjectToFront(chatText);
  }

  ngOnDestroy() {
    this.#subs.forEach(sub => sub.unsubscribe());
    void this.canvas?.dispose();
  }
}
