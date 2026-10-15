"use client";

import type { ReachForm as ReachValues } from "@/lib/admin/home-forms";

import {
  HeadingFields,
  HomeText,
  RepeatList,
  type SectionFormProps,
} from "@/components/admin/home/fields";
import { emptyRows } from "@/lib/admin/home-forms";

export function ReachForm({
  values,
  onChange,
  errors,
}: SectionFormProps<ReachValues>) {
  const set = (fields: Partial<ReachValues>) =>
    onChange({ ...values, ...fields });

  return (
    <>
      <fieldset className="adm-fieldset">
        <legend className="adm-h2">Skills</legend>
        <HeadingFields errors={errors} values={values} onChange={onChange} />
        <RepeatList
          addLabel="Add group"
          create={emptyRows.group}
          errors={errors}
          legend="Groups"
          name="groups"
          noun="group"
          rows={values.groups}
          onChange={(groups) => set({ groups })}
        >
          {(row, index, patch) => (
            <>
              <HomeText
                errors={errors}
                label={`Group ${index + 1} label`}
                max={80}
                name={`groups.${index}.label`}
                value={row.label}
                onChange={(label) => patch({ label })}
              />
              <HomeText
                multiline
                errors={errors}
                hint="One per line."
                label={`Group ${index + 1} items`}
                name={`groups.${index}.items`}
                value={row.items}
                onChange={(items) => patch({ items })}
              />
            </>
          )}
        </RepeatList>
      </fieldset>

      <fieldset className="adm-fieldset">
        <legend className="adm-h2">Experience</legend>
        <HomeText
          multiline
          errors={errors}
          hint="Optional."
          label="Experience intro"
          max={300}
          name="experienceIntro"
          value={values.experienceIntro}
          onChange={(experienceIntro) => set({ experienceIntro })}
        />
        <RepeatList
          addLabel="Add experience"
          create={emptyRows.experience}
          errors={errors}
          legend="Roles"
          name="experiences"
          noun="role"
          rows={values.experiences}
          onChange={(experiences) => set({ experiences })}
        >
          {(row, index, patch) => (
            <>
              <div className="adm-form-row">
                <HomeText
                  errors={errors}
                  label={`Company ${index + 1}`}
                  max={120}
                  name={`experiences.${index}.company`}
                  value={row.company}
                  onChange={(company) => patch({ company })}
                />
                <HomeText
                  errors={errors}
                  label={`Role ${index + 1}`}
                  max={120}
                  name={`experiences.${index}.role`}
                  value={row.role}
                  onChange={(role) => patch({ role })}
                />
              </div>
              <HomeText
                errors={errors}
                hint="E.g. 2022 – 2024."
                label={`Period ${index + 1}`}
                max={80}
                name={`experiences.${index}.period`}
                value={row.period}
                onChange={(period) => patch({ period })}
              />
              <HomeText
                multiline
                errors={errors}
                hint="One per line. Optional."
                label={`Stack ${index + 1}`}
                name={`experiences.${index}.stack`}
                value={row.stack}
                onChange={(stack) => patch({ stack })}
              />
            </>
          )}
        </RepeatList>
      </fieldset>
    </>
  );
}
