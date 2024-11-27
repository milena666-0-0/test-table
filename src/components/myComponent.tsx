import { useMemo, useState } from 'react';
import { makeData, Person } from '../makeData';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { Table } from './table';

const columnHelper = createColumnHelper<Person>();

export const MyComponent = () => {
  const [data] = useState<Person[]>(makeData(10));

  const columns = useMemo<ColumnDef<Person>[]>(
    () => [
      columnHelper.group({
        id: 'identity',
        header: 'Identity',
        columns: [
          columnHelper.accessor('firstName', {
            id: 'firstName',
          }),
          columnHelper.accessor('lastName', {
            id: 'lastName',
          }),
          columnHelper.accessor('age', {
            id: 'age',
          }),
          columnHelper.accessor('status', {
            id: 'status',
          }),
        ],
      }),
      columnHelper.group({
        id: 'info',
        header: 'Info',
        columns: [
          columnHelper.accessor('visits', {
            id: 'visits',
          }),
          columnHelper.accessor('progress', {
            id: 'progress',
          }),
        ],
      }),
    ],
    []
  );

  return (
    <div>
      <Table data={data} columns={columns} />
    </div>
  );
};
