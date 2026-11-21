import type { Stage } from "../api/types";

export interface StageStyle {
  name: string;
  fill: string; // chart and column colour
  on: string; // text on the fill
  badge: string; // small badges and pills (readable with `badgeOn`)
  badgeOn: string;
  text: string; // coloured text on light backgrounds
  tint: string; // light wash, e.g. avatar circles
}

export const STAGE_STYLE: Record<Stage, StageStyle> = {
  new: { name: "New", fill: "#06D6A0", on: "#073B4C", badge: "#06D6A0", badgeOn: "#073B4C", text: "#05795A", tint: "rgba(6,214,160,.22)" },
  qualified: { name: "Qualified", fill: "#FFC145", on: "#073B4C", badge: "#FFC145", badgeOn: "#073B4C", text: "#8A5A00", tint: "rgba(255,193,69,.30)" },
  proposal: { name: "Proposal", fill: "#F78C6B", on: "#073B4C", badge: "#F78C6B", badgeOn: "#073B4C", text: "#A8432A", tint: "rgba(247,140,107,.28)" },
  negotiation: { name: "Negotiation", fill: "#118AB2", on: "#FFFFFF", badge: "#0E6F90", badgeOn: "#FFFFFF", text: "#0E6F90", tint: "rgba(17,138,178,.20)" },
  won: { name: "Won", fill: "#073B4C", on: "#FFFFFF", badge: "#073B4C", badgeOn: "#FFFFFF", text: "#073B4C", tint: "rgba(7,59,76,.14)" },
  lost: { name: "Lost", fill: "#8FA3AA", on: "#073B4C", badge: "#8FA3AA", badgeOn: "#073B4C", text: "#4F6B75", tint: "rgba(143,163,170,.30)" },
};
