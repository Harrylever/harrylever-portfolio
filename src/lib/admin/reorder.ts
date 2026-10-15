/** Returns a copy with the item at `from` moved to `to`; out of range is a no-op. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];

  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return next;
  }
  const [item] = next.splice(from, 1);

  next.splice(to, 0, item);

  return next;
}

/** Moves one step (or more) up (negative) or down (positive). */
export function moveBy<T>(list: readonly T[], index: number, delta: number) {
  return moveItem(list, index, index + delta);
}

export function positionAnnouncement(
  name: string,
  index: number,
  total: number,
) {
  return `${name} moved to position ${index + 1} of ${total}.`;
}
