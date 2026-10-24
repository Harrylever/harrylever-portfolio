import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export let posthogLoggerProvider: LoggerProvider | undefined;

if (!projectToken || !host) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = !projectToken
      ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
      : "NEXT_PUBLIC_POSTHOG_HOST";

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthogLoggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": "harrylever-portfolio",
    }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: new URL("/i/v1/logs", host).toString(),
          headers: {
            Authorization: `Bearer ${projectToken}`,
            "Content-Type": "application/json",
          },
        }),
      }),
    ],
  });
}

export function register() {
  // The dedicated logger accesses this provider directly so existing loggers
  // retain their current handlers and outputs.
}
