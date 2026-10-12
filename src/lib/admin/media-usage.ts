/* Where an image is used, in words people recognise. Pure: unit-tested. */

export type MediaUsageRef = {
  contentType: "site_profile" | "home_section" | "project" | "post";
  contentId: string;
  snapshot: "draft" | "published";
  field: string;
  /** E.g. Project “Atlas”, Homepage: Frames. */
  label: string;
  /** Admin page where the reference can be removed. */
  href: string | null;
  trashed: boolean;
};

export type MediaUsageGroup = {
  key: string;
  label: string;
  href: string | null;
  snapshots: Array<"draft" | "published">;
  trashed: boolean;
};

export function groupUsage(usage: readonly MediaUsageRef[]): MediaUsageGroup[] {
  const groups = new Map<string, MediaUsageGroup>();

  for (const ref of usage) {
    const key = `${ref.contentType}:${ref.contentId}`;
    const group = groups.get(key) ?? {
      key,
      label: ref.label,
      href: ref.href,
      snapshots: [],
      trashed: ref.trashed,
    };

    if (!group.snapshots.includes(ref.snapshot))
      group.snapshots.push(ref.snapshot);
    group.snapshots.sort();
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

export function usageSummary(usage: readonly MediaUsageRef[]): string {
  const count = groupUsage(usage).length;

  if (count === 0) return "Not used";

  return `Used by ${count} ${count === 1 ? "item" : "items"}`;
}

export function describeGroup(group: MediaUsageGroup): string {
  const notes = [
    group.snapshots.join(" and "),
    ...(group.trashed ? ["in trash"] : []),
  ];

  return `${group.label} (${notes.join(", ")})`;
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");

  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** Shown instead of deleting an image that content still references. */
export function usedByMessage(
  itemName: string,
  usage: readonly MediaUsageRef[],
): string {
  const where = joinList(groupUsage(usage).map(describeGroup));

  return `“${itemName}” is used by ${where}. Remove it there before deleting it.`;
}
