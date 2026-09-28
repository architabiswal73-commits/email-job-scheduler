import type { ReactNode } from 'react';

type TableProps = { headers: string[]; children: ReactNode };
export function Table({ headers, children }: TableProps) {
  return <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
