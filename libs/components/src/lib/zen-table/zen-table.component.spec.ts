import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnDef } from '@tanstack/angular-table';

import { ZenTableComponent } from './zen-table.component';
import { ZenTableFeatures } from './zen-table.features';

interface Person {
  name: string;
  age: number;
}

const columns: ColumnDef<ZenTableFeatures, Person>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age', header: 'Age' },
];

const data: Person[] = [
  { name: 'Carol', age: 41 },
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 35 },
];

describe('ZenTableComponent', () => {
  let fixture: ComponentFixture<ZenTableComponent<Person>>;
  let component: ZenTableComponent<Person>;

  const names = () => component.table.getRowModel().rows.map(row => row.original.name);

  const renderedRows = () =>
    Array.from(fixture.nativeElement.querySelectorAll('tbody tr')).map(row =>
      Array.from((row as HTMLElement).querySelectorAll('td')).map(cell =>
        (cell as HTMLElement).textContent?.trim()
      )
    );

  beforeEach(() => {
    fixture = TestBed.createComponent<ZenTableComponent<Person>>(ZenTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('pageSize', 2);
    fixture.detectChanges();
  });

  it('paginates to the configured page size', () => {
    expect(names()).toEqual(['Carol', 'Alice']);
    expect(component.table.getPageCount()).toBe(2);

    component.table.nextPage();
    fixture.detectChanges();

    expect(names()).toEqual(['Bob']);
  });

  it('reorders rows when a column is sorted', () => {
    component.table.getColumn('name')?.toggleSorting(false);
    fixture.detectChanges();

    expect(names()).toEqual(['Alice', 'Bob']);

    component.table.getColumn('name')?.toggleSorting(true);
    fixture.detectChanges();

    expect(names()).toEqual(['Carol', 'Bob']);
  });

  it('filters rows down to the matching subset', () => {
    component.table.getColumn('name')?.setFilterValue('li');
    fixture.detectChanges();

    expect(names()).toEqual(['Alice']);
  });

  it('renders headers and cells through the flexRender directives', () => {
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>
    ).map(header => header.textContent?.trim());

    expect(headers).toEqual(['Name', 'Age']);
    expect(renderedRows()).toEqual([
      ['Carol', '41'],
      ['Alice', '30'],
    ]);
  });

  it('renders an empty-state row when there is no data', () => {
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();

    expect(renderedRows()).toEqual([['No records']]);
  });
});
