"use client";

import type { LoopForm as LoopValues } from "@/lib/admin/home-forms";

import {
  HeadingFields,
  HomeSelect,
  HomeText,
  RepeatList,
  type SectionFormProps,
} from "@/components/admin/home/fields";
import { emptyRows, loopFrequencies } from "@/lib/admin/home-forms";

export function LoopForm({
  values,
  onChange,
  errors,
}: SectionFormProps<LoopValues>) {
  const set = (fields: Partial<LoopValues>) =>
    onChange({ ...values, ...fields });

  return (
    <fieldset className="adm-fieldset">
      <legend className="adm-h2">Content</legend>
      <HeadingFields errors={errors} values={values} onChange={onChange} />
      <HomeText
        multiline
        errors={errors}
        label="Intro"
        max={600}
        name="intro"
        value={values.intro}
        onChange={(intro) => set({ intro })}
      />
      <RepeatList
        addLabel="Add tool"
        create={emptyRows.loopItem}
        errors={errors}
        hint="Order them by how often you actually use them."
        legend="Tools"
        name="items"
        noun="tool"
        rows={values.items}
        onChange={(items) => set({ items })}
      >
        {(row, index, patch) => (
          <>
            <div className="adm-form-row">
              <HomeText
                errors={errors}
                label={`Tool ${index + 1}`}
                max={100}
                name={`items.${index}.tool`}
                value={row.tool}
                onChange={(tool) => patch({ tool })}
              />
              <HomeSelect
                errors={errors}
                label={`Frequency ${index + 1}`}
                name={`items.${index}.frequency`}
                options={loopFrequencies}
                value={row.frequency}
                onChange={(frequency) => patch({ frequency })}
              />
            </div>
            <HomeText
              multiline
              errors={errors}
              label={`Use ${index + 1}`}
              max={600}
              name={`items.${index}.use`}
              value={row.use}
              onChange={(use) => patch({ use })}
            />
          </>
        )}
      </RepeatList>
      <HomeText
        multiline
        errors={errors}
        hint="Optional."
        label="Footer"
        max={400}
        name="footer"
        value={values.footer}
        onChange={(footer) => set({ footer })}
      />
    </fieldset>
  );
}
