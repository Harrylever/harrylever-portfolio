"use client";

import type { BuiltForm as BuiltValues } from "@/lib/admin/home-forms";

import Link from "next/link";

import {
  HeadingFields,
  HomeText,
  type SectionFormProps,
} from "@/components/admin/home/fields";

export function BuiltForm({
  values,
  onChange,
  errors,
}: SectionFormProps<BuiltValues>) {
  return (
    <fieldset className="adm-fieldset">
      <legend className="adm-h2">Content</legend>
      <HeadingFields errors={errors} values={values} onChange={onChange} />
      <HomeText
        errors={errors}
        hint="The link under the featured projects."
        label="Button label"
        max={80}
        name="ctaLabel"
        value={values.ctaLabel}
        onChange={(ctaLabel) => onChange({ ...values, ctaLabel })}
      />
      <p className="adm-hint">
        Which projects appear here is set per project, in{" "}
        <Link href="/admin/projects">Projects</Link>. Their order is set below.
      </p>
    </fieldset>
  );
}
