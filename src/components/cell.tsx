import { flexRender, Cell as TableCell } from '@tanstack/react-table'
import { typedMemo } from './utils'

type Cell<T> = TableCell<T, unknown>

const CellComponent = <T,>({...cell}: Cell<T>) => {
  return (
    <td>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
  )
}

export const Cell = typedMemo(CellComponent)
