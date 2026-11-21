import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateContact, useOrganizations, useUpdateContact } from "../../api/hooks";
import type { Contact, ContactStatus } from "../../api/types";
import { Button } from "../ui/Button";
import { Combobox } from "../ui/Combobox";
import { Field, inputClass } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { blankToNull, showSaveError } from "./helpers";

const schema = z.object({
  name: z.string().trim().min(1, "Required"),
  status: z.enum(["lead", "qualified", "customer"], { error: "Required" }),
  email: z.string().refine((v) => v.trim() === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()), "Enter a valid email address"),
  phone: z.string(),
  job_title: z.string(),
  organization_id: z.number().nullable(),
});
type Values = z.infer<typeof schema>;
const FIELDS = ["name", "status", "email", "phone", "job_title", "organization_id"];

interface Props {
  initial?: Contact;
  /** Start with this organization chosen (a new contact from an organization page). */
  organizationId?: number | null;
  onSaved: (saved: Contact) => void;
  onCancel: () => void;
}

export function ContactForm({ initial, organizationId = null, onSaved, onCancel }: Props) {
  const toast = useToast();
  const create = useCreateContact();
  const update = useUpdateContact();
  const organizations = useOrganizations().data ?? [];
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      status: initial?.status ?? "lead",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      job_title: initial?.job_title ?? "",
      organization_id: initial ? initial.organization_id : organizationId,
    },
  });

  const submit = handleSubmit((v) => {
    const body = {
      name: v.name.trim(), status: v.status as ContactStatus, email: blankToNull(v.email), phone: blankToNull(v.phone),
      job_title: blankToNull(v.job_title), organization_id: v.organization_id,
    };
    const options = {
      onSuccess: (saved: Contact) => {
        toast("Contact saved");
        onSaved(saved);
      },
      onError: (e: Error) => showSaveError(e, setError, toast, FIELDS),
    };
    if (initial) update.mutate({ id: initial.id, ...body }, options);
    else create.mutate(body, options);
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid grid-cols-[1fr_160px] gap-4">
        <Field label="Name" htmlFor="contact-name" required error={errors.name?.message}>
          <input id="contact-name" className={inputClass} aria-invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Status" htmlFor="contact-status" required error={errors.status?.message}>
          <select id="contact-status" className={inputClass} {...register("status")}>
            <option value="lead">Lead</option>
            <option value="qualified">Qualified</option>
            <option value="customer">Customer</option>
          </select>
        </Field>
      </div>
      <Field label="Organization" htmlFor="contact-org" error={errors.organization_id?.message}>
        <Controller
          name="organization_id"
          control={control}
          render={({ field }) => (
            <Combobox
              id="contact-org"
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              placeholder="No organization"
              clearLabel="No organization"
              options={organizations.map((o) => ({ value: o.id, label: o.name }))}
            />
          )}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Job title" htmlFor="contact-title" error={errors.job_title?.message}>
          <input id="contact-title" className={inputClass} {...register("job_title")} />
        </Field>
        <Field label="Phone" htmlFor="contact-phone" error={errors.phone?.message}>
          <input id="contact-phone" className={inputClass} {...register("phone")} />
        </Field>
      </div>
      <Field label="Email" htmlFor="contact-email" error={errors.email?.message}>
        <input id="contact-email" type="text" inputMode="email" className={inputClass} aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <div className="flex justify-end gap-2.5 pt-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={create.isPending || update.isPending}>
          Save contact
        </Button>
      </div>
    </form>
  );
}
