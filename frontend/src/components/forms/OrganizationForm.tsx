import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateOrganization, useOrganizations, useUpdateOrganization } from "../../api/hooks";
import type { Organization } from "../../api/types";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { blankToNull, showSaveError } from "./helpers";

const schema = z.object({
  name: z.string().trim().min(1, "Required"),
  website: z.string(),
  industry: z.string(),
  notes: z.string(),
});
type Values = z.infer<typeof schema>;
const FIELDS = ["name", "website", "industry", "notes"];

interface Props {
  initial?: Organization;
  onSaved: (saved: Organization) => void;
  onCancel: () => void;
}

export function OrganizationForm({ initial, onSaved, onCancel }: Props) {
  const toast = useToast();
  const create = useCreateOrganization();
  const update = useUpdateOrganization();
  const industries = [...new Set((useOrganizations().data ?? []).map((o) => o.industry).filter(Boolean))].sort() as string[];
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? "", website: initial?.website ?? "", industry: initial?.industry ?? "", notes: initial?.notes ?? "" },
  });

  const submit = handleSubmit((v) => {
    const body = { name: v.name.trim(), website: blankToNull(v.website), industry: blankToNull(v.industry), notes: blankToNull(v.notes) };
    const options = {
      onSuccess: (saved: Organization) => {
        toast("Organization saved");
        onSaved(saved);
      },
      onError: (e: Error) => showSaveError(e, setError, toast, FIELDS),
    };
    if (initial) update.mutate({ id: initial.id, ...body }, options);
    else create.mutate(body, options);
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Name" htmlFor="org-name" required error={errors.name?.message}>
        <input id="org-name" className={inputClass} aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Industry" htmlFor="org-industry" error={errors.industry?.message}>
          <input id="org-industry" list="industry-options" className={inputClass} {...register("industry")} />
          <datalist id="industry-options">{industries.map((i) => <option key={i} value={i} />)}</datalist>
        </Field>
        <Field label="Website" htmlFor="org-website" error={errors.website?.message}>
          <input id="org-website" className={inputClass} {...register("website")} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="org-notes" error={errors.notes?.message}>
        <textarea id="org-notes" rows={3} className={inputClass} {...register("notes")} />
      </Field>
      <div className="flex justify-end gap-2.5 pt-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={create.isPending || update.isPending}>
          Save organization
        </Button>
      </div>
    </form>
  );
}
