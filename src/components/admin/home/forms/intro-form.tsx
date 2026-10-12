"use client";

import type { IntroForm as IntroValues } from "@/lib/admin/home-forms";

import {
  HomeText,
  RepeatList,
  type SectionFormProps,
} from "@/components/admin/home/fields";
import { MediaField } from "@/components/admin/media/media-picker";
import { emptyRows } from "@/lib/admin/home-forms";

export function IntroForm({
  values,
  onChange,
  errors,
  library,
}: SectionFormProps<IntroValues>) {
  const set = (fields: Partial<IntroValues>) =>
    onChange({ ...values, ...fields });

  return (
    <>
      <fieldset className="adm-fieldset">
        <legend className="adm-h2">Statement</legend>
        <RepeatList
          addLabel="Add fragment"
          create={emptyRows.statement}
          errors={errors}
          hint="The opening line, in pieces. Emphasised pieces are set in the accent weight."
          legend="Fragments"
          name="statement"
          noun="fragment"
          rows={values.statement}
          onChange={(statement) => set({ statement })}
        >
          {(row, index, patch) => (
            <>
              <HomeText
                errors={errors}
                label={`Fragment ${index + 1}`}
                max={120}
                name={`statement.${index}.text`}
                value={row.text}
                onChange={(text) => patch({ text })}
              />
              <label className="adm-check">
                <input
                  checked={row.emphasis}
                  type="checkbox"
                  onChange={(event) =>
                    patch({ emphasis: event.target.checked })
                  }
                />
                Emphasise fragment {index + 1}
              </label>
            </>
          )}
        </RepeatList>
        <HomeText
          multiline
          errors={errors}
          label="Lede"
          max={600}
          name="lede"
          value={values.lede}
          onChange={(lede) => set({ lede })}
        />
      </fieldset>

      <fieldset className="adm-fieldset">
        <legend className="adm-h2">Portrait</legend>
        <MediaField
          error={errors.portraitAssetId}
          label="Portrait image"
          library={library}
          value={values.portraitAssetId}
          onChange={(portraitAssetId) => set({ portraitAssetId })}
        />
        <p className="adm-hint">
          Until a portrait is chosen, the placeholder below holds its place.
          Leave all three blank for no placeholder.
        </p>
        <div className="adm-form-row">
          <HomeText
            errors={errors}
            label="Placeholder slot"
            max={120}
            name="placeholderSlotId"
            value={values.placeholderSlotId}
            onChange={(placeholderSlotId) => set({ placeholderSlotId })}
          />
          <HomeText
            errors={errors}
            hint="Width / height, e.g. 4 / 5."
            label="Placeholder aspect ratio"
            max={20}
            name="placeholderAspectRatio"
            value={values.placeholderAspectRatio}
            onChange={(placeholderAspectRatio) =>
              set({ placeholderAspectRatio })
            }
          />
        </div>
        <HomeText
          errors={errors}
          label="Placeholder caption"
          max={240}
          name="placeholderCaption"
          value={values.placeholderCaption}
          onChange={(placeholderCaption) => set({ placeholderCaption })}
        />
      </fieldset>
    </>
  );
}
