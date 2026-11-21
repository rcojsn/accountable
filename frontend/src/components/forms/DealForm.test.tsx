import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { todayIso } from "../../lib/rules";
import { mockApi, renderWithProviders } from "../../test-utils";
import { DealForm } from "./DealForm";

const orgs = [{ id: 1, name: "Acme", contact_count: 0, open_deal_count: 0, open_value: 0 }];
const noop = () => {};

describe("DealForm", () => {
  it("shows Required under each missing field and focuses the first (REQ-21)", async () => {
    const calls = mockApi();
    renderWithProviders(<DealForm onSaved={noop} onCancel={noop} />);
    await userEvent.click(screen.getByRole("button", { name: "Save deal" }));
    expect(await screen.findAllByText("Required")).toHaveLength(3); // name, organization, value
    expect(screen.getByLabelText(/^Name/)).toHaveFocus();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("fills in probability, and today's date for Won or Lost, still editable (concern 11)", async () => {
    mockApi();
    renderWithProviders(<DealForm onSaved={noop} onCancel={noop} />);
    const prob = screen.getByLabelText(/Probability/) as HTMLInputElement;
    const close = screen.getByLabelText(/Close date/) as HTMLInputElement;
    expect(prob.value).toBe("10");
    await userEvent.selectOptions(screen.getByLabelText(/^Stage/), "negotiation");
    expect(prob.value).toBe("75");
    expect(close.value).toBe("");
    await userEvent.selectOptions(screen.getByLabelText(/^Stage/), "won");
    expect(prob.value).toBe("100");
    expect(close.value).toBe(todayIso());
    await userEvent.clear(prob);
    await userEvent.type(prob, "90");
    expect(prob.value).toBe("90");
  });

  it("rejects a negative value", async () => {
    mockApi();
    renderWithProviders(<DealForm onSaved={noop} onCancel={noop} />);
    await userEvent.type(screen.getByLabelText(/^Value/), "-5");
    await userEvent.click(screen.getByRole("button", { name: "Save deal" }));
    expect(await screen.findByText(/Enter a whole amount in rand/)).toBeInTheDocument();
  });

  it("sends the form and reports the save", async () => {
    const calls = mockApi((m, p) => {
      if (m === "GET" && p === "/organizations") return { body: orgs };
      if (m === "POST" && p === "/deals") return { status: 201, body: { id: 9 } };
    });
    const onSaved = vi.fn();
    renderWithProviders(<DealForm onSaved={onSaved} onCancel={noop} />);
    await userEvent.type(screen.getByLabelText(/^Name/), "Big one");
    await userEvent.type(screen.getByLabelText(/^Value/), "5000");
    await userEvent.click(screen.getByRole("combobox", { name: /Organization/ }));
    await userEvent.click(await screen.findByText("Acme"));
    await userEvent.click(screen.getByRole("button", { name: "Save deal" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.body).toMatchObject({ name: "Big one", organization_id: 1, stage: "new", value: 5000, probability: 10 });
  });

  it("shows a server error beside its field", async () => {
    mockApi((m, p) => {
      if (m === "GET" && p === "/organizations") return { body: orgs };
      if (m === "POST") return { status: 422, body: { detail: [{ loc: ["body", "value"], msg: "Input should be greater than or equal to 0", type: "greater_than_equal" }] } };
    });
    renderWithProviders(<DealForm defaults={{ organization_id: 1 }} onSaved={noop} onCancel={noop} />);
    await userEvent.type(screen.getByLabelText(/^Name/), "X");
    await userEvent.type(screen.getByLabelText(/^Value/), "1");
    await userEvent.click(screen.getByRole("button", { name: "Save deal" }));
    expect(await screen.findByText("Input should be greater than or equal to 0")).toBeInTheDocument();
  });
});
