import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateActivity, useUpdateActivity } from "../../api/hooks";
import type { Activity, EditableActivityType } from "../../api/types";
import { nowForInput } from "../../lib/format";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { blankToNull, showSaveError } from "./helpers";

const schema = z.object({
  type: z.enum(["note", "call", "email"], { error: "Required" }),
  description: z.string().trim().min(1, "Required"),
  happened_at: z.string().min(1, "Required"),
  follow_up_date: z.string(),
});
type Values = z.infer<typeof schema>;
const FIELDS = ["type", "description", "happened_at", "follow_up_date"];

interface Props {
  /** For a new activity: which record it is logged on. */
  target?: { contact_id: number } | { deal_id: number };
  /** For editing. */
  initial?: Activity;
  /** `inline` is the "Log activity" form at the top of a timeline. */
  inline?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}

export function ActivityForm({ target, initial, inline, onSaved, onCancel }: Props) {
  const toast = useToast();
  const create = useCreateActivity();
  const update = useUpdateActivity();
  const defaults = (): Values => ({
    type: initial?.type === "call" || initial?.type === "email" ? initial.type : "note",
    description: initial?.description ?? "",
    happened_at: initial ? initial.happened_at.slice(0, 16) : nowForInput(),
    follow_up_date: initial?.follow_up_date ?? "",
  });
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const prefix = inline ? "log" : "edit";

  const submit = handleSubmit((v) => {
    const body = {
      type: v.type as EditableActivityType,
      description: v.description.trim(),
      happened_at: v.happened_at.length === 16 ? `${v.happened_at}:00` : v.happened_at,
      follow_up_date: blankToNull(v.follow_up_date),
    };
    const options = {
      onSuccess: () => {
        toast(initial ? "Activity saved" : "Activity logged");
        if (!initial) reset(defaults());
        onSaved();
      },
      onError: (e: Error) => showSaveError(e, setError, toast, FIELDS),
    };
    if (initial) update.mutate({ id: initial.id, ...body }, options);
    else if (target) create.mutate({ ...body, ...target }, options);
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-3" aria-label={initial ? "Edit activity" : "Log activity"}>
      <div className="grid grid-cols-[130px_1fr] gap-3">
        <Field label="Type" htmlFor={`${prefix}-type`} required error={errors.type?.message}>
          <select id={`${prefix}-type`} className={inputClass} {...register("type")}>
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
          </select>
        </Field>
        <Field label="Description" htmlFor={`${prefix}-description`} required error={errors.description?.message}>
          <input id={`${prefix}-description`} className={inputClass} aria-invalid={!!errors.description} placeholder="What happened?" {...register("description")} />
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="When it happened" htmlFor={`${prefix}-when`} required error={errors.happened_at?.message}>
          <input id={`${prefix}-when`} type="datetime-local" className={inputClass} aria-invalid={!!errors.happened_at} {...register("happened_at")} />
        </Field>
        <Field label="Follow up on" htmlFor={`${prefix}-follow`} error={errors.follow_up_date?.message}>
          <input id={`${prefix}-follow`} type="date" className={inputClass} {...register("follow_up_date")} />
        </Field>
        <div className="ml-auto flex gap-2.5">
          {onCancel ? <Button onClick={onCancel}>Cancel</Button> : null}
          <Button type="submit" variant="primary" disabled={create.isPending || update.isPending}>
            {initial ? "Save activity" : "Log activity"}
          </Button>
        </div>
      </div>
    </form>
  );
}
