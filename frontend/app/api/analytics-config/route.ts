import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
