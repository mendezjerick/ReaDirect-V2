import type { CSSProperties, ReactNode } from "react";

export interface StaffDataColumn<Row> {
  key: string;
  label: string;
  width?: string;
  render: (row: Row) => ReactNode;
  cellClassName?: string;
}

interface StaffDataTableProps<Row> {
  columns: StaffDataColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string | number;
  accessibleLabel: string;
  empty?: ReactNode;
  rowClassName?: (row: Row) => string | undefined;
}

export function StaffDataTable<Row>({
  columns,
  rows,
  rowKey,
  accessibleLabel,
  empty,
  rowClassName,
}: StaffDataTableProps<Row>) {
  if (rows.length === 0) {
    return <>{empty}</>;
  }

  const style = {
    "--staff-data-table-template": columns
      .map((column) => column.width ?? "minmax(0, 1fr)")
      .join(" "),
  } as CSSProperties;

  return (
    <div
      className="staff-data-table"
      role="table"
      aria-label={accessibleLabel}
      style={style}
    >
      <div className="staff-data-table__header" role="row">
        {columns.map((column) => (
          <span role="columnheader" key={column.key}>
            {column.label}
          </span>
        ))}
      </div>
      <div className="staff-data-table__body" role="rowgroup">
        {rows.map((row) => (
          <article
            className={["staff-data-table__row", rowClassName?.(row)]
              .filter(Boolean)
              .join(" ")}
            role="row"
            key={rowKey(row)}
          >
            {columns.map((column) => (
              <div
                className={["staff-data-table__cell", column.cellClassName]
                  .filter(Boolean)
                  .join(" ")}
                role="cell"
                key={column.key}
              >
                <span
                  className="staff-data-table__mobile-label"
                  aria-hidden="true"
                >
                  {column.label}
                </span>
                <div className="staff-data-table__value">
                  {column.render(row)}
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}
