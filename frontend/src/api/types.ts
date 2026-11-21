export type Stage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type ContactStatus = "lead" | "qualified" | "customer";
export type ActivityType = "note" | "call" | "email" | "stage_change";
export type EditableActivityType = Exclude<ActivityType, "stage_change">;

export interface Deal {
  id: number;
  name: string;
  organization_id: number;
  organization_name: string;
  contact_id: number | null;
  contact_name: string | null;
  stage: Stage;
  value: number;
  probability: number;
  expected_revenue: number;
  close_date: string | null;
  position: number;
  is_late: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  organization_id: number | null;
  organization_name: string | null;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
}
export interface ContactDetail extends Contact {
  deals: Deal[];
}

export interface Organization {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  contact_count: number;
  open_deal_count: number;
  open_value: number;
  created_at: string;
  updated_at: string;
}
export interface OrganizationDetail extends Organization {
  contacts: Contact[];
  deals: Deal[];
}

export interface Activity {
  id: number;
  type: ActivityType;
  contact_id: number | null;
  contact_name: string | null;
  deal_id: number | null;
  deal_name: string | null;
  description: string;
  happened_at: string;
  follow_up_date: string | null;
  done: boolean;
  from_stage: Stage | null;
  to_stage: Stage | null;
}

export type DeleteKind = "organization" | "contact" | "deal" | "activity";
export type DeleteImpact =
  | { name: string; contacts: number; deals: number; activities: number } // organization
  | { name: string; activities: number; deals: number; deal_activities: number } // contact
  | { name: string; activities: number }; // deal

export interface OrganizationInput {
  name: string;
  website?: string | null;
  industry?: string | null;
  notes?: string | null;
}
export interface ContactInput {
  name: string;
  status: ContactStatus;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  organization_id?: number | null;
}
export interface DealInput {
  name: string;
  organization_id: number;
  contact_id?: number | null;
  stage: Stage;
  value: number;
  probability?: number | null;
  close_date?: string | null;
}
export interface ActivityInput {
  type: EditableActivityType;
  description: string;
  happened_at: string;
  follow_up_date?: string | null;
  contact_id?: number | null;
  deal_id?: number | null;
}

export interface Dashboard {
  today: string;
  headline: {
    open_value: number;
    open_deal_count: number;
    expected_revenue: number;
    won_this_month_revenue: number;
    won_this_month_count: number;
    late_deals: number;
    overdue_follow_ups: number;
    due_today_follow_ups: number;
  };
  months: { month: string; revenue_won: number; deals_won: number; deals_lost: number }[];
  twelve_months: { revenue_won: number; deals_won: number; deals_lost: number };
  funnel: { stage: Stage; deal_count: number; value: number }[];
  stages: { stage: Stage; probability: number; deal_count: number; value: number; expected_revenue: number }[];
  follow_ups: { overdue: Activity[]; today: Activity[]; next_7_days: Activity[]; later_count: number };
  recent_activity: Activity[];
}
