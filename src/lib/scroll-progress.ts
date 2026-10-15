export function calculateScrollProgress(
  scrollY: number,
  documentHeight: number,
  viewportHeight: number,
) {
  const scrollableHeight = documentHeight - viewportHeight;

  if (scrollableHeight <= 0) return 0;

  return Math.min(1, Math.max(0, scrollY / scrollableHeight));
}
