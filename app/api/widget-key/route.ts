import { NextResponse } from "next/server";
import { activeBusiness } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lets the bundled preview page load the current workspace's widget without hardcoding a key. */
export async function GET() {
  const business = await activeBusiness();
  return NextResponse.json({ widgetKey: business.widget_key, name: business.name });
}
