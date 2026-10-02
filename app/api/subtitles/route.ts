import fsp from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { resolveCoursePath } from "@/lib/course";

export const dynamic = "force-dynamic";

function srtToVtt(srt: string): string {
  const body = srt
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  const blocks = body.split(/\n{2,}/);
  const cues: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    if (lines[0].trim() === "WEBVTT") continue;
    if (/^\d+$/.test(lines[0].trim()) && lines.length > 1) {
      lines.shift();
    }
    if (!lines.some((l) => l.includes("-->"))) continue;
    cues.push(lines.join("\n"));
  }

  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

export async function GET(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get("path");
  if (!rel) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  let filePath: string;
  try {
    filePath = resolveCoursePath(rel);
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const srt = await fsp.readFile(filePath, "utf8");
    return new Response(srtToVtt(srt), {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
