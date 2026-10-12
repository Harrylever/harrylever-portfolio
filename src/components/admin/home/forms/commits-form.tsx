"use client";

import type { CommitsForm as CommitsValues } from "@/lib/admin/home-forms";

import {
  HeadingFields,
  HomeText,
  type SectionFormProps,
} from "@/components/admin/home/fields";

export function CommitsForm({
  values,
  onChange,
  errors,
}: SectionFormProps<CommitsValues>) {
  return (
    <fieldset className="adm-fieldset">
      <legend className="adm-h2">Content</legend>
      <HeadingFields errors={errors} values={values} onChange={onChange} />
      <HomeText
        errors={errors}
        hint="The contribution calendar is loaded for this account."
        label="GitHub username"
        max={39}
        name="githubUsername"
        value={values.githubUsername}
        onChange={(githubUsername) => onChange({ ...values, githubUsername })}
      />
    </fieldset>
  );
}
