import { handlePreviewDisable } from "@/server/content/preview";

export function GET(request: Request) {
  return handlePreviewDisable(request);
}
