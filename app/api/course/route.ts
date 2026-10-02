import { NextResponse } from "next/server";
import { scanLibrary } from "@/lib/course";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const library = await scanLibrary();
    return NextResponse.json(library);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan course folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
