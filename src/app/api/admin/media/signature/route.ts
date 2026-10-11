import { NextResponse } from "next/server";

import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/server/auth/require-admin";
import { createUploadSignature } from "@/server/media/cloudinary";

export async function GET(request: Request) {
  try {
    const actor = await requireAdmin(request.headers);

    return NextResponse.json(await createUploadSignature(actor));
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Upload signing is temporarily unavailable" },
      { status: 500 },
    );
  }
}
