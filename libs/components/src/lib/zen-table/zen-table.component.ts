import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ColumnDef, FlexRender, RowData, injectTable } from '@tanstack/angular-table';

import { ZenTableFeatures, zenTableFeatures } from './zen-table.features';

@Component({
  selector: 'zen-table',
  templateUrl: './zen-table.component.html',
  styleUrl: './zen-table.component.scss',
  standalone: true,
  imports: [FlexRender, MatButtonModule, MatIconModule],
})
export class ZenTableComponent<TData extends RowData> {
  readonly data = input.required<TData[]>();
  readonly columns = input.required<ColumnDef<ZenTableFeatures, TData>[]>();
  readonly pageSize = input(10);

  readonly table = injectTable(() => ({
    features: zenTableFeatures,
    columns: this.columns(),
    data: this.data(),
    initialState: { pagination: { pageIndex: 0, pageSize: this.pageSize() } },
  }));
}
