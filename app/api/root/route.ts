import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCourseDir, setStoredRoot } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { path?: unknown } | null;
  const dir = body?.path;

  if (dir === null || dir === undefined) {
    setStoredRoot(null);
    return NextResponse.json({ root: getCourseDir() });
  }

  if (typeof dir !== "string" || !dir.trim() || dir.includes("\0")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const target = path.resolve(dir);
  try {
    const stat = await fs.stat(target);
    if (!stat.isDirectory()) throw new Error("Not a folder");
  } catch {
    return NextResponse.json({ error: `Folder not found: ${dir}` }, { status: 404 });
  }

  setStoredRoot(target);
  return NextResponse.json({ root: getCourseDir() });
}
