import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Activity, ActivityInput, Contact, ContactDetail, ContactInput, Dashboard, DeleteImpact, DeleteKind, Deal, DealInput,
  Organization, OrganizationDetail, OrganizationInput, Stage,
} from "./types";

// ----------------------------------------------------------------- queries
export const useOrganizations = () => useQuery({ queryKey: ["organizations"], queryFn: () => api<Organization[]>("GET", "/organizations") });
export const useOrganization = (id: number) =>
  useQuery({ queryKey: ["organizations", id], queryFn: () => api<OrganizationDetail>("GET", `/organizations/${id}`) });
export const useContacts = () => useQuery({ queryKey: ["contacts"], queryFn: () => api<Contact[]>("GET", "/contacts") });
export const useContact = (id: number) => useQuery({ queryKey: ["contacts", id], queryFn: () => api<ContactDetail>("GET", `/contacts/${id}`) });
export const useDeals = () => useQuery({ queryKey: ["deals"], queryFn: () => api<Deal[]>("GET", "/deals") });
export const useDeal = (id: number) => useQuery({ queryKey: ["deals", id], queryFn: () => api<Deal>("GET", `/deals/${id}`) });
export const useTimeline = (kind: "contacts" | "deals", id: number) =>
  useQuery({ queryKey: ["timeline", kind, id], queryFn: () => api<Activity[]>("GET", `/${kind}/${id}/timeline`) });
export const useDashboard = () => useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("GET", "/dashboard") });

const IMPACT_PATH: Record<Exclude<DeleteKind, "activity">, string> = { organization: "organizations", contact: "contacts", deal: "deals" };
export const useDeleteImpact = (kind: DeleteKind, id: number | null) =>
  useQuery({
    queryKey: ["impact", kind, id],
    enabled: id !== null && kind !== "activity",
    gcTime: 0,
    queryFn: () => api<DeleteImpact>("GET", `/${IMPACT_PATH[kind as Exclude<DeleteKind, "activity">]}/${id}/delete-impact`),
  });

// --------------------------------------------------------------- mutations
/**
 * Every change refreshes every query. This is the one place that decides what is refreshed, so the
 * dashboard, board, tables and timelines never drift apart (REQ-78).
 */
function useChange<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries() });
}

/** Deleting refreshes everything except the deleted record’s own queries, which would only answer 404. */
function useDelete(entity: "organizations" | "contacts" | "deals") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api("DELETE", `/${entity}/${id}`),
    onSuccess: (_r, id) =>
      qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey;
          const own = k[0] === "impact" || (k[0] === entity && k[1] === id) || (k[0] === "timeline" && k[1] === entity && k[2] === id);
          return !own;
        },
      }),
  });
}

export const useCreateOrganization = () => useChange((v: OrganizationInput) => api<Organization>("POST", "/organizations", v));
export const useUpdateOrganization = () =>
  useChange(({ id, ...v }: { id: number } & Partial<OrganizationInput>) => api<Organization>("PATCH", `/organizations/${id}`, v));
export const useDeleteOrganization = () => useDelete("organizations");

export const useCreateContact = () => useChange((v: ContactInput) => api<Contact>("POST", "/contacts", v));
export const useUpdateContact = () =>
  useChange(({ id, ...v }: { id: number } & Partial<ContactInput>) => api<Contact>("PATCH", `/contacts/${id}`, v));
export const useDeleteContact = () => useDelete("contacts");

export const useCreateDeal = () => useChange((v: DealInput) => api<Deal>("POST", "/deals", v));
export const useUpdateDeal = () => useChange(({ id, ...v }: { id: number } & Partial<DealInput>) => api<Deal>("PATCH", `/deals/${id}`, v));
export const useDeleteDeal = () => useDelete("deals");

export const useCreateActivity = () => useChange((v: ActivityInput) => api<Activity>("POST", "/activities", v));
export const useUpdateActivity = () =>
  useChange(({ id, ...v }: { id: number } & Partial<ActivityInput> & { done?: boolean }) => api<Activity>("PATCH", `/activities/${id}`, v));
export const useDeleteActivity = () => useChange((id: number) => api("DELETE", `/activities/${id}`));

export const moveDealRequest = (id: number, stage: Stage, beforeId: number | null) =>
  api<Deal>("POST", `/deals/${id}/move`, { stage, before_id: beforeId });
