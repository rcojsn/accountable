import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useContacts, useCreateDeal, useOrganizations, useUpdateDeal } from "../../api/hooks";
import type { Deal, Stage } from "../../api/types";
import { PROBABILITY, STAGE_NAMES, STAGES, todayIso } from "../../lib/rules";
import { Button } from "../ui/Button";
import { Combobox, type ComboOption } from "../ui/Combobox";
import { Field, inputClass } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { blankToNull, showSaveError } from "./helpers";

const schema = z.object({
  name: z.string().trim().min(1, "Required"),
  organization_id: z.number({ error: "Required" }).nullable().refine((v): boolean => v !== null, "Required"),
  contact_id: z.number().nullable(),
  stage: z.enum(["new", "qualified", "proposal", "negotiation", "won", "lost"], { error: "Required" }),
  value: z
    .string()
    .trim()
    .min(1, "Required")
    .refine((v) => /^\d+$/.test(v) && Number(v) <= 1_000_000_000, "Enter a whole amount in rand, from 0 to 1,000,000,000"),
  probability: z.string().trim().refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 100), "Enter a number from 0 to 100"),
  close_date: z.string(),
});
type Values = z.infer<typeof schema>;
const FIELDS = ["name", "organization_id", "contact_id", "stage", "value", "probability", "close_date"];

interface Props {
  initial?: Deal;
  /** For "Add deal" in a pipeline column, or a new deal from an organization page. */
  defaults?: { stage?: Stage; organization_id?: number | null; contact_id?: number | null };
  onSaved: (saved: Deal) => void;
  onCancel: () => void;
}

export function DealForm({ initial, defaults, onSaved, onCancel }: Props) {
  const toast = useToast();
  const create = useCreateDeal();
  const update = useUpdateDeal();
  const organizations = useOrganizations().data ?? [];
  const contacts = useContacts().data ?? [];
  const startStage = initial?.stage ?? defaults?.stage ?? "new";

  const { register, control, handleSubmit, setError, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      organization_id: initial ? initial.organization_id : (defaults?.organization_id ?? null),
      contact_id: initial ? initial.contact_id : (defaults?.contact_id ?? null),
      stage: startStage,
      value: initial ? String(initial.value) : "",
      probability: String(initial ? initial.probability : PROBABILITY[startStage]),
      close_date: initial?.close_date ?? (startStage === "won" || startStage === "lost" ? todayIso() : ""),
    },
  });

  const organizationId = watch("organization_id");
  const contactOptions: ComboOption[] = contacts
    .map((c) => ({
      value: c.id,
      label: c.job_title ? `${c.name}, ${c.job_title}` : c.name,
      group: organizationId !== null && c.organization_id === organizationId ? "At this organization" : "Everyone else",
    }))
    .sort((a, b) => (a.group === b.group ? 0 : a.group === "At this organization" ? -1 : 1));

  const stageField = register("stage");
  const submit = handleSubmit((v) => {
    const body = {
      name: v.name.trim(),
      organization_id: v.organization_id as number,
      contact_id: v.contact_id,
      stage: v.stage as Stage,
      value: Number(v.value),
      probability: v.probability === "" ? null : Number(v.probability),
      close_date: blankToNull(v.close_date),
    };
    const options = {
      onSuccess: (saved: Deal) => {
        toast("Deal saved");
        onSaved(saved);
      },
      onError: (e: Error) => showSaveError(e, setError, toast, FIELDS),
    };
    if (initial) update.mutate({ id: initial.id, ...body }, options);
    else create.mutate(body, options);
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Name" htmlFor="deal-name" required error={errors.name?.message}>
        <input id="deal-name" className={inputClass} aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Organization" htmlFor="deal-org" required error={errors.organization_id?.message}>
          <Controller
            name="organization_id"
            control={control}
            render={({ field, fieldState }) => (
              <Combobox
                id="deal-org"
                ref={field.ref}
                invalid={!!fieldState.error}
                value={field.value}
                onChange={field.onChange}
                placeholder="Choose an organization"
                options={organizations.map((o) => ({ value: o.id, label: o.name }))}
              />
            )}
          />
        </Field>
        <Field label="Main contact" htmlFor="deal-contact" error={errors.contact_id?.message}>
          <Controller
            name="contact_id"
            control={control}
            render={({ field }) => (
              <Combobox
                id="deal-contact"
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                placeholder="No main contact"
                clearLabel="No main contact"
                options={contactOptions}
              />
            )}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Stage" htmlFor="deal-stage" required error={errors.stage?.message}>
          <select
            id="deal-stage"
            className={inputClass}
            {...stageField}
            onChange={(e) => {
              stageField.onChange(e);
              const stage = e.target.value as Stage;
              setValue("probability", String(PROBABILITY[stage])); // concern 11: fills in, still editable
              if (stage === "won" || stage === "lost") setValue("close_date", todayIso());
            }}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_NAMES[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Value (R)" htmlFor="deal-value" required error={errors.value?.message}>
          <input id="deal-value" type="number" min={0} step={1} inputMode="numeric" className={inputClass} aria-invalid={!!errors.value} {...register("value")} />
        </Field>
        <Field label="Probability (%)" htmlFor="deal-probability" error={errors.probability?.message}>
          <input id="deal-probability" type="number" min={0} max={100} step={1} className={inputClass} aria-invalid={!!errors.probability} {...register("probability")} />
        </Field>
      </div>
      <Field label="Close date" htmlFor="deal-close" error={errors.close_date?.message} className="max-w-[220px]">
        <input id="deal-close" type="date" className={inputClass} {...register("close_date")} />
      </Field>
      <div className="flex justify-end gap-2.5 pt-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={create.isPending || update.isPending}>
          Save deal
        </Button>
      </div>
    </form>
  );
}
