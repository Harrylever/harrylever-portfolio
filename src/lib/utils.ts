export { cn } from "cn";

export function isInternalHref(href?: string) {
  if (!href) return false;

  return href.startsWith("/") || href.startsWith("#");
}
