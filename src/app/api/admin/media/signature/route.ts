import { NextResponse } from "next/server";

import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/server/auth/require-admin";
import { logMediaUploadSignature } from "@/server/observability/posthog-logs";
import { createUploadSignature } from "@/server/media/cloudinary";

export async function GET(request: Request) {
  try {
    const actor = await requireAdmin(request.headers);
    const signature = await createUploadSignature(actor);

    logMediaUploadSignature("issued");

    return NextResponse.json(signature);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    logMediaUploadSignature("failed");

    return NextResponse.json(
      { error: "Upload signing is temporarily unavailable" },
      { status: 500 },
    );
  }
}
