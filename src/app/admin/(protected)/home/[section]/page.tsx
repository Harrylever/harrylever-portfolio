import type { Metadata } from "next";

import Link from "next/link";

import { listPickerMedia } from "@/app/admin/_lib/media";
import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { HomeSectionEditor } from "@/components/admin/home/home-section-editor";
import {
  homeSectionNames,
  homeSectionPurposes,
  isHomeSectionType,
} from "@/lib/admin/home-forms";
import { readHomeSectionForEditing } from "@/server/content/home/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;

  return {
    title: isHomeSectionType(section)
      ? `Homepage: ${homeSectionNames[section]}`
      : "Homepage section",
  };
}

export default async function HomeSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await requireAdminPage();
  const { section } = await params;
  const [state, media] = await Promise.all([
    readHomeSectionForEditing(section),
    listPickerMedia(),
  ]);

  if (!state) {
    return (
      <>
        <Link className="adm-back" href="/admin/home">
          All sections
        </Link>
        <h1 className="adm-title">Section not found</h1>
        <p className="adm-lede">
          The homepage has eight fixed sections; this isn&apos;t one of them.
        </p>
      </>
    );
  }

  return (
    <>
      <Link className="adm-back" href="/admin/home">
        All sections
      </Link>
      <h1 className="adm-title">{homeSectionNames[state.type]}</h1>
      <p className="adm-lede">{homeSectionPurposes[state.type]}</p>
      <HomeSectionEditor
        key={`${state.type}:${state.updatedAt}`}
        initial={state}
        media={media}
      />
    </>
  );
}
