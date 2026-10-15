"use client";

import type { NowForm as NowValues } from "@/lib/admin/home-forms";

import {
  HeadingFields,
  HomeText,
  RepeatList,
  type SectionFormProps,
} from "@/components/admin/home/fields";
import { emptyRows } from "@/lib/admin/home-forms";

export function NowForm({
  values,
  onChange,
  errors,
}: SectionFormProps<NowValues>) {
  return (
    <fieldset className="adm-fieldset">
      <legend className="adm-h2">Content</legend>
      <HeadingFields errors={errors} values={values} onChange={onChange} />
      <RepeatList
        addLabel="Add item"
        create={emptyRows.nowItem}
        errors={errors}
        legend="Items"
        name="items"
        noun="item"
        rows={values.items}
        onChange={(items) => onChange({ ...values, items })}
      >
        {(row, index, patch) => (
          <>
            <HomeText
              errors={errors}
              label={`Label ${index + 1}`}
              max={80}
              name={`items.${index}.label`}
              value={row.label}
              onChange={(label) => patch({ label })}
            />
            <HomeText
              multiline
              errors={errors}
              label={`Body ${index + 1}`}
              max={600}
              name={`items.${index}.body`}
              value={row.body}
              onChange={(body) => patch({ body })}
            />
          </>
        )}
      </RepeatList>
    </fieldset>
  );
}
