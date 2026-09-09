import { Meta } from '@storybook/angular';
import { ColumnDef } from '@tanstack/angular-table';

import { ZenTableComponent } from './zen-table.component';
import { ZenTableFeatures } from './zen-table.features';

interface Person {
  name: string;
  role: string;
  age: number;
}

const columns: ColumnDef<ZenTableFeatures, Person>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'age', header: 'Age' },
];

const roles = ['Admin', 'Editor', 'Viewer'];

const data: Person[] = Array.from({ length: 25 }, (_, i) => ({
  name: `Person ${String(i + 1).padStart(2, '0')}`,
  role: roles[i % roles.length],
  age: 20 + ((i * 7) % 40),
}));

export default {
  title: 'ZenTableComponent',
  component: ZenTableComponent,
} as Meta<ZenTableComponent<Person>>;

export const Primary = {
  render: (args: ZenTableComponent<Person>) => ({
    props: args,
  }),
  args: {
    data,
    columns,
    pageSize: 10,
  },
};

export const SinglePage = {
  render: (args: ZenTableComponent<Person>) => ({
    props: args,
  }),
  args: {
    data: data.slice(0, 3),
    columns,
    pageSize: 10,
  },
};

export const Empty = {
  render: (args: ZenTableComponent<Person>) => ({
    props: args,
  }),
  args: {
    data: [],
    columns,
    pageSize: 10,
  },
};
