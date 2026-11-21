import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { memo, useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { Button } from "./ui/Button";
import { Panel } from "./ui/Panel";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** What the column sorts by. Missing values sort last. */
  value?: (row: T) => string | number | null | undefined;
  /** Text the search box matches against; defaults to `value`. */
  search?: (row: T) => string | null | undefined;
  align?: "right";
  mono?: boolean;
  searchable?: boolean;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => number;
  noun: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  action?: ReactNode;
  defaultSort?: { id: string; desc?: boolean };
  loading?: boolean;
}

interface RowProps<T> {
  item: T;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
}

function RowInner<T>({ item, columns, onRowClick, actions }: RowProps<T>) {
  return (
    <tr
      className={`h-12 transition-colors hover:bg-[#f4f8f9] ${onRowClick ? "cursor-pointer" : ""}`}
      onClick={(e) => {
        if (onRowClick && !(e.target as HTMLElement).closest("a,button,input,[role=checkbox]")) onRowClick(item);
      }}
    >
      {columns.map((c) => (
        <td key={c.id} className={`px-3 py-1 ${c.align === "right" ? "text-right" : ""} ${c.mono ? "font-mono text-[13px]" : ""}`}>
          {c.cell(item)}
        </td>
      ))}
      {actions ? <td className="w-24 px-3 py-1"><div className="flex justify-end gap-0.5">{actions(item)}</div></td> : null}
    </tr>
  );
}
const Row = memo(RowInner) as typeof RowInner;

/** A searchable, sortable table (REQ-40 to REQ-43). Columns must be a stable array. */
export function DataTable<T>({ data, columns, getRowId, noun, onRowClick, actions, toolbar, action, defaultSort, loading }: Props<T>) {
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>(defaultSort ? [{ id: defaultSort.id, desc: defaultSort.desc ?? false }] : []);
  const deferred = useDeferredValue(query);

  const haystacks = useMemo(() => {
    const searchable = columns.filter((c) => c.searchable !== false);
    return new Map(
      data.map((row) => [
        getRowId(row),
        searchable.map((c) => String((c.search ?? c.value)?.(row) ?? "")).join("\n").toLowerCase(),
      ]),
    );
  }, [data, columns, getRowId]);

  const q = deferred.trim().toLowerCase();
  const filtered = useMemo(() => (q ? data.filter((row) => haystacks.get(getRowId(row))!.includes(q)) : data), [q, data, haystacks, getRowId]);

  const defs = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((c) => ({
        id: c.id,
        header: c.header,
        accessorFn: (row: T) => {
          const v = c.value?.(row);
          return v === null || v === undefined ? undefined : typeof v === "string" ? v.toLowerCase() : v;
        },
        sortUndefined: "last" as const,
        enableSorting: !!c.value,
      })),
    [columns],
  );

  const table = useReactTable({
    data: filtered,
    columns: defs,
    state: { sorting },
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    sortDescFirst: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const rows = table.getRowModel().rows;

  return (
    <Panel className="!p-0">
      <div className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-5">
        <label className="flex w-[280px] items-center gap-2 rounded-full bg-bg px-4 py-2.5 text-ink-muted focus-within:bg-white focus-within:outline-2 focus-within:outline-cerulean-strong">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun}`}
            aria-label={`Search ${noun}`}
            className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-[#7d949c]"
          />
        </label>
        {toolbar}
        <div className="ml-auto">{action}</div>
      </div>
      <div className="overflow-x-auto px-3 pb-3">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-xs font-semibold text-ink">
              {table.getHeaderGroups()[0].headers.map((h, i) => {
                const col = columns[i];
                const dir = h.column.getIsSorted();
                return (
                  <th
                    key={h.id}
                    aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : col.value ? "none" : undefined}
                    className={`px-3 py-2.5 ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {col.value ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className={`inline-flex items-center gap-1 rounded-md font-semibold hover:text-green-text ${col.align === "right" ? "flex-row-reverse" : ""}`}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {dir === "asc" ? <ArrowUp size={13} aria-label="sorted ascending" /> : dir === "desc" ? <ArrowDown size={13} aria-label="sorted descending" /> : <span className="inline-block w-[13px]" />}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                );
              })}
              {actions ? <th className="w-24 px-3 py-2.5"><span className="sr-only">Actions</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row key={getRowId(r.original)} item={r.original} columns={columns} onRowClick={onRowClick} actions={actions} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-ink-muted">
            {loading ? (
              <p>Loading {noun}…</p>
            ) : q ? (
              <>
                <p>No {noun} match &quot;{query.trim()}&quot;.</p>
                <Button onClick={() => setQuery("")}>Clear search</Button>
              </>
            ) : (
              <p className="font-serif text-xl text-ink">No {noun} yet.</p>
            )}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
