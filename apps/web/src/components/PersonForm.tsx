"use client";

import { useActionState } from "react";
import { RELATIONSHIP_TYPE_OPTIONS, type Person } from "@noyala/domain";
import type { PersonFormState } from "@/server/people/actions";

const initialState: PersonFormState = { status: "idle" };

export function PersonForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: PersonFormState, formData: FormData) => Promise<PersonFormState>;
  defaultValues?: Partial<Person>;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" required>
          <input
            id="firstName"
            name="firstName"
            required
            defaultValue={defaultValues?.firstName}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Last name" htmlFor="lastName">
          <input
            id="lastName"
            name="lastName"
            defaultValue={defaultValues?.lastName ?? ""}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Nickname" htmlFor="nickname">
          <input
            id="nickname"
            name="nickname"
            defaultValue={defaultValues?.nickname ?? ""}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Relationship" htmlFor="relationshipType" required>
          <select
            id="relationshipType"
            name="relationshipType"
            defaultValue={defaultValues?.relationshipType ?? "friend"}
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pronouns" htmlFor="pronouns">
          <input
            id="pronouns"
            name="pronouns"
            defaultValue={defaultValues?.pronouns ?? ""}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues?.phone ?? ""}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Reconnect reminder" htmlFor="reconnectCadenceDays">
          <select
            id="reconnectCadenceDays"
            name="reconnectCadenceDays"
            defaultValue={defaultValues?.reconnectCadenceDays ?? ""}
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            <option value="">None</option>
            <option value="14">Every 2 weeks</option>
            <option value="30">Every month</option>
            <option value="60">Every 2 months</option>
            <option value="90">Every 3 months</option>
            <option value="180">Every 6 months</option>
          </select>
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValues?.notes ?? ""}
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </Field>

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-surface w-fit rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
