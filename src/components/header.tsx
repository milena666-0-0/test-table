import { flexRender, Header as TableHeader } from '@tanstack/react-table'
import { typedMemo } from './utils'

type Header<T> = TableHeader<T, unknown>

const HeadComponent = <T, >({...header}: Header<T>) => {
  return (
    <th colSpan={header.colSpan}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
  )
}

export const Header = typedMemo(HeadComponent)
