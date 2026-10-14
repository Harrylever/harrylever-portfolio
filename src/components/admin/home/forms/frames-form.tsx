"use client";

import type { FramesForm as FramesValues } from "@/lib/admin/home-forms";

import {
  HeadingFields,
  HomeText,
  RepeatList,
  type SectionFormProps,
} from "@/components/admin/home/fields";
import { MediaField } from "@/components/admin/media/media-picker";
import { emptyRows } from "@/lib/admin/home-forms";

export function FramesForm({
  values,
  onChange,
  errors,
  library,
}: SectionFormProps<FramesValues>) {
  return (
    <fieldset className="adm-fieldset">
      <legend className="adm-h2">Content</legend>
      <HeadingFields errors={errors} values={values} onChange={onChange} />
      <RepeatList
        addLabel="Add figure"
        create={emptyRows.frame}
        errors={errors}
        hint="Each figure is an uploaded image or a placeholder that holds its slot until one is ready."
        legend="Figures"
        name="items"
        noun="figure"
        rows={values.items}
        onChange={(items) => onChange({ ...values, items })}
      >
        {(row, index, patch) => {
          const n = index + 1;

          return (
            <>
              <fieldset className="adm-choice">
                <legend className="adm-label">Figure {n} source</legend>
                <label className="adm-check">
                  <input
                    checked={row.kind === "placeholder"}
                    name={`figure-${row.key}-kind`}
                    type="radio"
                    onChange={() => patch({ kind: "placeholder" })}
                  />
                  Placeholder
                </label>
                <label className="adm-check">
                  <input
                    checked={row.kind === "media"}
                    name={`figure-${row.key}-kind`}
                    type="radio"
                    onChange={() => patch({ kind: "media" })}
                  />
                  Uploaded image
                </label>
              </fieldset>
              {row.kind === "media" ? (
                <MediaField
                  error={errors[`items.${index}.mediaAssetId`]}
                  label={`Figure ${n} image`}
                  library={library}
                  value={row.mediaAssetId}
                  onChange={(mediaAssetId) => patch({ mediaAssetId })}
                />
              ) : (
                <HomeText
                  errors={errors}
                  hint="A short id for the empty frame, e.g. frame-desk."
                  label={`Figure ${n} slot`}
                  max={120}
                  name={`items.${index}.placeholderSlot`}
                  value={row.placeholderSlot}
                  onChange={(placeholderSlot) => patch({ placeholderSlot })}
                />
              )}
              <div className="adm-form-row">
                <HomeText
                  errors={errors}
                  hint="Width / height, e.g. 3 / 4."
                  label={`Figure ${n} aspect ratio`}
                  max={20}
                  name={`items.${index}.aspectRatio`}
                  value={row.aspectRatio}
                  onChange={(aspectRatio) => patch({ aspectRatio })}
                />
                <HomeText
                  errors={errors}
                  label={`Figure ${n} caption`}
                  max={240}
                  name={`items.${index}.caption`}
                  value={row.caption}
                  onChange={(caption) => patch({ caption })}
                />
              </div>
            </>
          );
        }}
      </RepeatList>
    </fieldset>
  );
}
