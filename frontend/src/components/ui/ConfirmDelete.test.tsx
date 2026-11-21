import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfirmDeleteView, deleteMessage } from "./ConfirmDelete";

describe("delete wording with counts", () => {
  it("organization (REQ-30)", () => {
    const m = deleteMessage("organization", { name: "Acme Ltd", contacts: 5, deals: 3, activities: 12 });
    expect(m.title).toBe("Delete Acme Ltd?");
    expect(m.lines).toEqual([
      "Its 3 deals and their 12 activities will be deleted.",
      "Its 5 contacts will be kept, with no organization.",
    ]);
  });
  it("organization with one of each and with nothing", () => {
    expect(deleteMessage("organization", { name: "A", contacts: 1, deals: 1, activities: 1 }).lines).toEqual([
      "Its 1 deal and their 1 activity will be deleted.",
      "Its 1 contact will be kept, with no organization.",
    ]);
    expect(deleteMessage("organization", { name: "A", contacts: 0, deals: 0, activities: 0 }).lines).toEqual(["Nothing else is linked to it."]);
  });
  it("contact (REQ-31)", () => {
    const m = deleteMessage("contact", { name: "Thandi Mokoena", activities: 4, deals: 2, deal_activities: 7 });
    expect(m.title).toBe("Delete Thandi Mokoena?");
    expect(m.lines).toEqual([
      "The 4 activities logged on them will be deleted.",
      "Their 2 deals will be kept, with no main contact. The 7 activities logged on those deals will be kept.",
    ]);
  });
  it("deal (REQ-32)", () => {
    expect(deleteMessage("deal", { name: "Warehouse", activities: 6 }).lines).toEqual(["Its 6 activities, including its stage changes, will be deleted."]);
    expect(deleteMessage("deal", { name: "Warehouse", activities: 0 }).lines).toEqual(["It has no activities."]);
  });
  it("activity (REQ-33)", () => {
    expect(deleteMessage("activity", undefined).title).toBe("Delete this activity?");
  });
});

describe("ConfirmDeleteView", () => {
  it("shows the message and a confirm button named for the record", () => {
    render(<ConfirmDeleteView open onOpenChange={() => {}} kind="deal" impact={{ name: "Big deal", activities: 2 }} onConfirm={() => {}} />);
    expect(screen.getByText("Delete Big deal?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete deal" })).toBeEnabled();
  });
});
