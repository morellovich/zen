import { Component, ViewChild } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { Canvas, FabricObject } from 'fabric';

document.addEventListener('contextmenu', event => {
  const eventTarget = event?.target as HTMLElement;
  if (eventTarget?.className?.includes('cdk-overlay')) event.preventDefault();
});

export interface ZenMenuItem {
  type?: 'divider';
  label?: string;
  action?: (obj: FabricObject) => void;
}

@Component({
  selector: 'zen-contextmenu',
  templateUrl: 'zen-contextmenu.component.html',
  standalone: true,
  imports: [MatListModule, MatMenuModule],
})
export class ZenContextmenuComponent {
  @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;
  canvas!: Canvas;
  menuItems: ZenMenuItem[] = [];
  contextMenuPosition = { x: '0px', y: '0px' };

  open(event: MouseEvent, data: FabricObject) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { data };
    this.contextMenu.menu?.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  setMenu(menuItems: ZenMenuItem[], canvas: Canvas) {
    this.canvas = canvas;
    this.menuItems = menuItems;
  }

  action(menuItem: ZenMenuItem, data: FabricObject) {
    menuItem.action?.(data);
    this.canvas.renderAll();
  }
}
