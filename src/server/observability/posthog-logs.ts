import { SeverityNumber } from "@opentelemetry/api-logs";
import { after } from "next/server";

import { posthogLoggerProvider } from "../../../instrumentation";

const logger = posthogLoggerProvider?.getLogger("posthog-exporter");

export function logMediaUploadSignature(outcome: "issued" | "failed"): void {
  logger?.emit({
    body: `admin_media_upload_signature_${outcome}`,
    severityNumber:
      outcome === "issued" ? SeverityNumber.INFO : SeverityNumber.ERROR,
    attributes: {
      endpoint: "/api/admin/media/signature",
      outcome,
    },
  });

  if (posthogLoggerProvider) {
    after(async () => {
      await posthogLoggerProvider?.forceFlush();
    });
  }
}
