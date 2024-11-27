import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Cell } from './cell';
import { Header } from './header';

type Table<T> = {
  data: Array<T>;
  columns: ColumnDef<T, unknown>[];
};

export const Table = <T,>({ data, columns }: Table<T>) => {
  const [initialData] = useState<T[]>(data);

  const [tableData] = useState<T[]>(initialData);

  const table = useReactTable({
    columns,
    data: tableData,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
                <Header<T> key={header.id} {...header}/>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <Cell<T> key={cell.id} {...cell}/>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
