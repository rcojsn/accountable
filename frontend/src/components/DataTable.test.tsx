import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DataTable, type Column } from "./DataTable";

interface Row { id: number; name: string; city: string | null; size: number }
const data: Row[] = [
  { id: 1, name: "Acme", city: "Durban", size: 30 },
  { id: 2, name: "beta Works", city: "Cape Town", size: 5 },
  { id: 3, name: "Cobalt", city: null, size: 12 },
];
const columns: Column<Row>[] = [
  { id: "name", header: "Name", value: (r) => r.name, cell: (r) => r.name },
  { id: "city", header: "City", value: (r) => r.city, cell: (r) => r.city ?? "" },
  { id: "size", header: "Size", value: (r) => r.size, cell: (r) => r.size, searchable: false },
];
const getRowId = (r: Row) => r.id;

const names = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);
const setup = () => render(<DataTable data={data} columns={columns} getRowId={getRowId} noun="companies" defaultSort={{ id: "name" }} />);
const sortBy = (name: RegExp) => userEvent.click(within(screen.getByRole("columnheader", { name })).getByRole("button"));

describe("DataTable", () => {
  it("searches visible text columns, ignoring case (REQ-40)", async () => {
    setup();
    await userEvent.type(screen.getByLabelText("Search companies"), "CAPE");
    expect(names()).toEqual(["beta Works"]);
    await userEvent.clear(screen.getByLabelText("Search companies"));
    await userEvent.type(screen.getByLabelText("Search companies"), "ac");
    expect(names()).toEqual(["Acme"]);
  });

  it("does not search columns marked as not searchable", async () => {
    setup();
    await userEvent.type(screen.getByLabelText("Search companies"), "30");
    expect(screen.getByText(/No companies match/)).toBeInTheDocument();
  });

  it("sorts, reverses, and shows the direction (REQ-41)", async () => {
    setup();
    expect(names()).toEqual(["Acme", "beta Works", "Cobalt"]);
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(header).toHaveAttribute("aria-sort", "ascending");
    await sortBy(/Name/);
    expect(names()).toEqual(["Cobalt", "beta Works", "Acme"]);
    expect(header).toHaveAttribute("aria-sort", "descending");
    await sortBy(/Size/);
    expect(names()).toEqual(["beta Works", "Cobalt", "Acme"]);
  });

  it("puts missing values last", async () => {
    setup();
    await sortBy(/City/);
    expect(names()).toEqual(["beta Works", "Acme", "Cobalt"]);
    await sortBy(/City/);
    expect(names()).toEqual(["Acme", "beta Works", "Cobalt"]);
  });

  it("shows an empty state and clears the search", async () => {
    setup();
    await userEvent.type(screen.getByLabelText("Search companies"), "zzz");
    expect(screen.getByText('No companies match "zzz".')).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(names()).toHaveLength(3);
  });
});
