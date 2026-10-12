"use client";

import type { SayForm as SayValues } from "@/lib/admin/home-forms";

import {
  HomeText,
  type SectionFormProps,
} from "@/components/admin/home/fields";

export function SayForm({
  values,
  onChange,
  errors,
}: SectionFormProps<SayValues>) {
  const set = (fields: Partial<SayValues>) =>
    onChange({ ...values, ...fields });

  return (
    <fieldset className="adm-fieldset">
      <legend className="adm-h2">Content</legend>
      <HomeText
        multiline
        errors={errors}
        label="Heading"
        max={300}
        name="heading"
        value={values.heading}
        onChange={(heading) => set({ heading })}
      />
      <HomeText
        errors={errors}
        label="Email"
        name="email"
        value={values.email}
        onChange={(email) => set({ email })}
      />
      <HomeText
        errors={errors}
        hint="Optional."
        label="WhatsApp link"
        name="whatsappUrl"
        placeholder="https://"
        type="url"
        value={values.whatsappUrl}
        onChange={(whatsappUrl) => set({ whatsappUrl })}
      />
      <HomeText
        errors={errors}
        hint="Optional."
        label="Résumé link"
        name="resumeUrl"
        placeholder="https://"
        type="url"
        value={values.resumeUrl}
        onChange={(resumeUrl) => set({ resumeUrl })}
      />
    </fieldset>
  );
}
