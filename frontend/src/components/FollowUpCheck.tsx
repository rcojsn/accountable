import { useEffect, useState } from "react";
import { useUpdateActivity } from "../api/hooks";
import type { Activity } from "../api/types";
import { useToast } from "./ui/Toast";

/** The round checkbox that marks a follow-up done or not done (REQ-56). */
export function FollowUpCheck({ activity }: { activity: Activity }) {
  const update = useUpdateActivity();
  const toast = useToast();
  const [checked, setChecked] = useState(activity.done);
  useEffect(() => setChecked(activity.done), [activity.done]);
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={`Mark follow-up done: ${activity.description}`}
      onChange={(e) => {
        setChecked(e.target.checked); // shown at once; put back if the server refuses
        update.mutate({ id: activity.id, done: e.target.checked }, { onError: (err) => { setChecked(activity.done); toast(err.message, "error"); } });
      }}
      className="h-5 w-5 flex-none cursor-pointer appearance-none rounded-full bg-white ring-2 ring-inset ring-[#A9BBC1] checked:bg-green checked:ring-green"
    />
  );
}
