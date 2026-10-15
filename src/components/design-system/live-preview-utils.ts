/** Width the previewed site is rendered at before it is scaled to fit. */
export const PREVIEW_VIEWPORT_WIDTH = 1280;

/** The link to preview, or null when the project should show its image. */
export function embedUrl(project: {
  livePreview?: boolean;
  externalUrl?: string | null;
}): string | null {
  if (!project.livePreview || !project.externalUrl) return null;

  return project.externalUrl.startsWith("https://")
    ? project.externalUrl
    : null;
}

/** Scale that fits the desktop viewport into a frame; never above 1. */
export function previewScale(frameWidth: number): number {
  if (frameWidth <= 0) return 0;

  return Math.min(1, frameWidth / PREVIEW_VIEWPORT_WIDTH);
}
