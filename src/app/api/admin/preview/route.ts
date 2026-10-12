import { handlePreviewEnable } from "@/server/content/preview";

export function GET(request: Request) {
  return handlePreviewEnable(request);
}
