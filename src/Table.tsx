import {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnResizeDirection,
  ColumnResizeMode,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  GroupingState,
  Header,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table';
import { CSSProperties, FC, HTMLProps, useEffect, useMemo, useRef, useState } from 'react';

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { makeData, Person } from './makeData';
import { CSS } from '@dnd-kit/utilities';

type Filter = {
  column: Column<Person, unknown>
}

const Filter: FC<Filter> = ({ column }) => {
  const columnFilterValue = column.getFilterValue()

  return (
    <DebouncedInput
      className="w-36 border shadow rounded"
      onChange={(value) => column.setFilterValue([value.toLowerCase()])}
      placeholder={`Search...`}
      type="text"
      value={(columnFilterValue ?? '') as string}
    />
  );
}

type DebouncedInput = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    value: string;
    onChange: (value: string) => void;
    debounce?: number;
}

const DebouncedInput: FC<DebouncedInput> = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}) => {
  const [value, setValue] = useState<string>(initialValue);

  useEffect(() => {
    if(!value && initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(String(value));
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value]);

  return <input {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}

type DraggableTableHeaderType = {
  header: Header<Person, unknown>
  table: TableType<Person>
  columnResizeMode: ColumnResizeMode
}

const DraggableTableHeader: FC<DraggableTableHeaderType> = ({ header, table, columnResizeMode }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useSortable({
    id: header.column.id,
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform), // translate instead of transform to avoid squishing
    transition: 'width transform 0.2s ease-in-out',
    whiteSpace: 'nowrap',
    zIndex: isDragging ? 1 : 0,
    width: header.getSize(),
  };

  return (
    <th colSpan={header.colSpan} ref={setNodeRef} style={style}>
      {header.isPlaceholder ? null : (
        <>
          <div
            {...{
              className: header.column.getCanSort() ? 'cursor-pointer select-none' : '',
              onClick: header.column.getToggleSortingHandler(),
            }}
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
            {{
              asc: ' 🔼',
              desc: ' 🔽',
            }[header.column.getIsSorted() as string] ?? null}
          </div>
          {header.column.getCanFilter() ? (
            <div>
              <Filter column={header.column} />
            </div>
          ) : null}
        </>
      )}
      {header.column.getCanGroup() ? (
        <button
          {...{
            onClick: header.column.getToggleGroupingHandler(),
            style: {
              cursor: 'pointer',
            },
          }}
        >
          {header.column.getIsGrouped() ? `🛑(${header.column.getGroupedIndex()}) ` : `👊 `}
        </button>
      ) : null}{' '}
      <button {...attributes} {...listeners}>
        🟰
      </button>
      <UniqueValues
        data={table.getFilteredRowModel().flatRows.map(row => row.original)}
        columnName={header.column.id}
        column={header.column}
        table={table}
      />
      <div
        {...{
          onDoubleClick: () => header.column.resetSize(),
          onMouseDown: header.getResizeHandler(),
          onTouchStart: header.getResizeHandler(),
          className: `resizer ${table.options.columnResizeDirection} ${
            header.column.getIsResizing() ? 'isResizing' : ''
          }`,
          style: {
            transform:
              columnResizeMode === 'onEnd' && header.column.getIsResizing()
                ? `translateX(${
                    (table.options.columnResizeDirection === 'rtl' ? -1 : 1) *
                    (table.getState().columnSizingInfo.deltaOffset ?? 0)
                  }px)`
                : '',
          },
        }}
      />
    </th>
  );
};

type DragCell = {
  cell: Cell<Person, unknown>
}

const DragAlongCell: FC<DragCell> = ({ cell }) => {
  const { isDragging, setNodeRef, transform } = useSortable({
    id: cell.column.id,
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    transform: CSS.Translate.toString(transform),
    transition: 'width transform 0.2s ease-in-out',
    width: cell.column.getSize(),
  };

  return (
    <td
      ref={setNodeRef}
      {...{
        key: cell.id,
        style
      }}
    >
      {cell.getIsGrouped() ? (
                <button
                  {...{
                    onClick: cell.row.getToggleExpandedHandler(),
                    style: { cursor: 'pointer', width: '100%' },
                  }}
                >
                  {cell.row.getIsExpanded() ? '👇' : '👉'}
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  {cell.row.subRows.length}
                </button>
              
      ) : cell.getIsAggregated() ? (
        flexRender(
          cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
          cell.getContext()
        )
      ) : cell.getIsPlaceholder() ? null : (
        flexRender(cell.column.columnDef.cell, cell.getContext())
      )}
    </td>
  );
};

function IndeterminateCheckbox({
  indeterminate,
  className = '',
  ...rest
}: { indeterminate?: boolean } & HTMLProps<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null!);

  useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate]);

  return <input type="checkbox" ref={ref} className={className + ' cursor-pointer'} {...rest} />;
}

type UniqueValuesType = {
  data: Person[]
  columnName: string
  column: Column<Person, unknown>
  table: TableType<Person>
}

const UniqueValues: FC<UniqueValuesType> = ({ data, columnName, column }) => {
  const uniqueValues = useMemo((): Array<number | string> => {
    if (!data) return [];
    const uniqueValues: Set<string | number> = new Set();

    const column = columnName as keyof Person

    const traverse = (item: Person) => {
      if (item[column] !== undefined) {
        uniqueValues.add(String(item[column]));
      }

      if (Array.isArray(item.subRows)) {
        item.subRows.forEach((subItem) => traverse(subItem));
      }
    };

    data?.forEach((item) => traverse(item));

    return Array.from(uniqueValues);
  }, [data, columnName]);

  const [filters, setFilters] = useState(uniqueValues);
  const [values] = useState(uniqueValues);
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div>
      <button onClick={() => setOpen((prev) => !prev)}>Open</button>
      {open && (
        <div className="popover">
          <div className="popover-inner">
            <label htmlFor="all">
              <input
                id="all"
                type="checkbox"
                checked={filters.length === uniqueValues.length}
                onChange={(e) => {
                  const checked = e.target.checked;

                  if (!checked) {
                    setFilters([]);
                    column.setFilterValue(undefined);
                  } else {
                    setFilters(uniqueValues);
                    column.setFilterValue(uniqueValues);
                  }
                }}
              />
              All
            </label>
            {values.map((value) => (
              <div key={value}>
                <label htmlFor={String(value)}>
                  <input
                    checked={filters.includes(value)}
                    value={value}
                    id={String(value)}
                    type="checkbox"
                    onChange={(e) => {
                      const checked = e.target.checked;

                      if (checked) {
                        setFilters((prev) => [...prev, String(value)]);
                        column.setFilterValue([...filters, String(value)]);
                      } else {
                        setFilters((prev) => {
                          const filteredFilters = prev.filter((filter) => filter !== String(value));
                          column.setFilterValue(filteredFilters);

                          return filteredFilters;
                        });
                      }
                    }}
                  />
                  {value}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const Table = () => {
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection] = useState<ColumnResizeDirection>('ltr');

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [search, setSearch] = useState('');
  const [rowSelection, setRowSelection] = useState({})

  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [data] = useState(() => makeData(20));
  const [filteredData, setFilteredData] = useState(data);

  const [grouping, setGrouping] = useState<GroupingState>([]);

  const columns = useMemo<ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: 'firstName',
        cell: ({ row, getValue }) => (
          <div
            style={{
              paddingLeft: `${row.depth * 2}rem`,
            }}
          >
            <div>
              <IndeterminateCheckbox
                {...{
                  checked: row.getIsSelected() || row.getIsAllSubRowsSelected(),
                  disabled: !row.getCanSelect(),
                  indeterminate: row.getIsSomeSelected(),
                  onChange: row.getToggleSelectedHandler(),
                }}
              />
              {getValue<boolean>()}
            </div>
          </div>
        ),
        header: ({ table }) => (
          <>
            <IndeterminateCheckbox
              {...{
                checked: table.getIsAllPageRowsSelected(),
                indeterminate: table.getIsSomePageRowsSelected(),
                onChange: table.getToggleAllPageRowsSelectedHandler(),
              }}
            />{' '}
            <button
              {...{
                onClick: table.getToggleAllRowsExpandedHandler(),
              }}
            >
              {table.getIsAllRowsExpanded() ? '👇' : '👉'}
            </button>{' '}
            First Name
          </>
        ),
        accessorFn: (row) => row.firstName,
        id: 'firstName',
        filterFn: 'arrIncludesSome',
      },
      {
        accessorFn: (row) => row.lastName,
        cell: (info) => info.getValue(),
        header: () => <span>Last Name</span>,
        id: 'lastName',
        filterFn: 'arrIncludesSome',
      },
      {
        accessorKey: 'age',
        header: () => 'Age',
        accessorFn: (row) => row.age.toString(),
        aggregatedCell: ({ getValue }) => Math.round(getValue<number>() * 100) / 100,
        aggregationFn: 'median',
        id: 'age',
        filterFn: 'arrIncludesSome',
      },
      {
        accessorKey: 'visits',
        header: () => <span>Visits</span>,
        accessorFn: (row) => row.visits.toString(),
        id: 'visits',
        aggregationFn: 'sum',
        filterFn: 'arrIncludesSome',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        id: 'status',
        accessorFn: (row) => row.status,
        filterFn: 'arrIncludesSome',
      },
      {
        accessorKey: 'progress',
        header: 'Profile Progress',
        id: 'progress',
        aggregationFn: 'mean',
        aggregatedCell: ({ getValue }) => Math.round(getValue<number>() * 100) / 100 + '%',
        filterFn: 'arrIncludesSome',
        accessorFn: (row) => row.progress.toString(),
      },
    ],
    []
  );

  const [columnOrder, setColumnOrder] = useState<string[]>(() => columns.map((c) => c.id!));
  
  const table = useReactTable({
    columns,
    data: filteredData,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode,
    columnResizeDirection,
    filterFromLeafRows: true,
    enableRowSelection: true,
    state: {
      columnOrder,
      columnFilters,
      expanded,
      grouping,
      rowSelection
    },
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    getGroupedRowModel: getGroupedRowModel(),
    getSubRows: (row) => row.subRows,
    onColumnFiltersChange: setColumnFilters,
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(), //client side filtering
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
  });
    
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder((columnOrder) => {
        const oldIndex = columnOrder.indexOf(active.id as string);
        const newIndex = columnOrder.indexOf(over.id as string);
        return arrayMove(columnOrder, oldIndex, newIndex); //this is just a splice util
      });
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const filterDataGlobaly = (data: Person[], search: string) => {
    const searchRecursively = (item: Person): boolean => {
      if (
        Object.values(item).some((value) => {
          if (typeof value === 'object' && (value !== null || value !== undefined)) {
            // @ts-expect-error any expected
            return searchRecursively(value);
          }
          return value ? value.toString().toLowerCase().includes(search.toLowerCase()) : !!value;
        })
      ) {
        return true;
      }

      if (Array.isArray(item.subRows)) {
        return item.subRows.some((subItem) => searchRecursively(subItem));
      }

      return false;
    };

    return data.filter((item) => searchRecursively(item));
  };

  return (
    <div>
      <DebouncedInput
        value={search}
        onChange={(e) => {
          setSearch(e);
          if (!e) {
            setFilteredData(data);
          }
          setFilteredData(filterDataGlobaly(data, e));
        }}
      />
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <div className="table-container">
          <table
            {...{
              style: {
                width: table.getCenterTotalSize(),
              },
            }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                    {headerGroup.headers.map((header) => (
                      <DraggableTableHeader
                        key={header.id}
                        header={header}
                        table={table}
                        columnResizeMode={columnResizeMode}
                      />
                    ))}
                  </SortableContext>
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <SortableContext
                      key={row.id}
                      items={columnOrder}
                      strategy={horizontalListSortingStrategy}
                    >
                      <DragAlongCell key={cell.id} cell={cell} />
                    </SortableContext>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DndContext>
      <div className="h-2" />
      <div style={{display: "flex", gap: "4px", marginTop: "10px"}}>
        <button
          className="border rounded p-1"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          {'<<'}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>'}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </button>
        <span style={{display: "flex", gap: "2px"}}>
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </strong>
        </span>
        <span style={{display: "flex", gap: "2px"}}>
          | Go to page:
          <input
            type="number"
            min="1"
            max={table.getPageCount()}
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
            className="border p-1 rounded w-16"
          />
        </span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
      <div>{table.getRowModel().rows.length} Rows</div>
    </div>
  );
};
