import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockApi, renderWithProviders } from "../../test-utils";
import { ActivityForm } from "./ActivityForm";
import { ContactForm } from "./ContactForm";
import { OrganizationForm } from "./OrganizationForm";

const noop = () => {};
const error422 = (field: string, type: string, msg: string) => ({ status: 422, body: { detail: [{ loc: ["body", field], msg, type }] } });

describe("OrganizationForm", () => {
  it("requires a name and focuses it", async () => {
    mockApi();
    renderWithProviders(<OrganizationForm onSaved={noop} onCancel={noop} />);
    await userEvent.click(screen.getByRole("button", { name: "Save organization" }));
    expect(await screen.findByText("Required")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveFocus();
  });

  it("shows a server error by the field", async () => {
    mockApi((m) => (m === "POST" ? error422("name", "string_too_short", "String should have at least 1 character") : undefined));
    renderWithProviders(<OrganizationForm onSaved={noop} onCancel={noop} />);
    await userEvent.type(screen.getByLabelText(/^Name/), "Acme");
    await userEvent.click(screen.getByRole("button", { name: "Save organization" }));
    expect(await screen.findByText("Required")).toBeInTheDocument();
  });
});

describe("ContactForm", () => {
  it("requires a name and checks the email shape", async () => {
    mockApi();
    renderWithProviders(<ContactForm onSaved={noop} onCancel={noop} />);
    await userEvent.type(screen.getByLabelText(/^Email/), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Save contact" }));
    expect(await screen.findByText("Required")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveFocus();
  });

  it("defaults the status to Lead and saves", async () => {
    const calls = mockApi((m) => (m === "POST" ? { status: 201, body: { id: 1 } } : undefined));
    const onSaved = vi.fn();
    renderWithProviders(<ContactForm onSaved={onSaved} onCancel={noop} />);
    expect(screen.getByLabelText(/^Status/)).toHaveValue("lead");
    await userEvent.type(screen.getByLabelText(/^Name/), "Thandi");
    await userEvent.click(screen.getByRole("button", { name: "Save contact" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls.find((c) => c.method === "POST")!.body).toMatchObject({ name: "Thandi", status: "lead", email: null });
  });
});

describe("ActivityForm", () => {
  it("requires a description", async () => {
    mockApi();
    renderWithProviders(<ActivityForm inline target={{ deal_id: 1 }} onSaved={noop} />);
    await userEvent.click(screen.getByRole("button", { name: "Log activity" }));
    expect(await screen.findByText("Required")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Description/)).toHaveFocus();
  });

  it("logs a call with a follow-up", async () => {
    const calls = mockApi((m) => (m === "POST" ? { status: 201, body: { id: 1 } } : undefined));
    const onSaved = vi.fn();
    renderWithProviders(<ActivityForm inline target={{ contact_id: 4 }} onSaved={onSaved} />);
    await userEvent.selectOptions(screen.getByLabelText(/^Type/), "call");
    await userEvent.type(screen.getByLabelText(/^Description/), "Rang about the quote");
    await userEvent.type(screen.getByLabelText(/Follow up on/), "2026-12-01");
    await userEvent.click(screen.getByRole("button", { name: "Log activity" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls.find((c) => c.method === "POST")!.body).toMatchObject({ type: "call", contact_id: 4, description: "Rang about the quote", follow_up_date: "2026-12-01" });
  });

  it("shows a server error by the field", async () => {
    mockApi((m) => (m === "POST" ? error422("follow_up_date", "date_parsing", "Input should be a valid date") : undefined));
    renderWithProviders(<ActivityForm inline target={{ contact_id: 4 }} onSaved={noop} />);
    await userEvent.type(screen.getByLabelText(/^Description/), "x");
    await userEvent.click(screen.getByRole("button", { name: "Log activity" }));
    expect(await screen.findByText("Input should be a valid date")).toBeInTheDocument();
  });
});
