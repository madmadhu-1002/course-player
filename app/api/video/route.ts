import fs from "fs";
import fsp from "fs/promises";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { resolveCoursePath } from "@/lib/course";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
};

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

  let stat: fs.Stats;
  try {
    stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error("Not a file");
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const contentType =
    MIME_TYPES[filePath.slice(filePath.lastIndexOf(".")).toLowerCase()] || "application/octet-stream";
  const range = req.headers.get("range");

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${stat.size}` },
      });
    }

    const stream = fs.createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
      },
    });
  }

  const stream = fs.createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(stat.size),
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    },
  });
}
