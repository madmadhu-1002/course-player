import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCourseDir } from "@/lib/config";

export const dynamic = "force-dynamic";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".m4v", ".mov", ".mkv"]);

type FolderEntry = { name: string; path: string; videos: number };

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function firstExistingDir(start: string): Promise<string | null> {
  let current = path.resolve(start);
  for (;;) {
    if (await isDir(current)) return current;
    const up = path.dirname(current);
    if (up === current) return null;
    current = up;
  }
}

async function listDrives(): Promise<string[]> {
  if (process.platform !== "win32") return [];
  const drives: string[] = [];
  for (let code = 65; code <= 90; code++) {
    const drive = `${String.fromCharCode(code)}:\\`;
    if (await isDir(drive)) drives.push(drive);
  }
  return drives;
}

const MAX_SCAN_DEPTH = 4;
const SCAN_BUDGET = 400;

async function countVideos(
  dir: string,
  budget: { left: number },
  depth = 0,
): Promise<number> {
  if (budget.left <= 0 || depth > MAX_SCAN_DEPTH) return 0;
  let count = 0;
  try {
    const entries = await fs.readdir(/*turbopackIgnore: true*/ dir, { withFileTypes: true });
    for (const entry of entries) {
      if (budget.left <= 0) break;
      budget.left--;
      if (entry.isFile()) {
        if (VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) count++;
      } else if (entry.isDirectory()) {
        const child = path.join(/*turbopackIgnore: true*/ dir, entry.name);
        count += await countVideos(child, budget, depth + 1);
      }
    }
  } catch {
    // unreadable folder
  }
  return count;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("path");

  if (raw && raw.includes("\0")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  let dir: string;
  if (raw && raw.trim()) {
    const requested = path.resolve(raw);
    if (!(await isDir(requested))) {
      return NextResponse.json({ error: `Folder not found: ${raw}` }, { status: 404 });
    }
    dir = requested;
  } else {
    dir = (await firstExistingDir(getCourseDir())) || process.cwd();
  }

  try {
    const entries = await fs.readdir(/*turbopackIgnore: true*/ dir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    const folders: FolderEntry[] = await Promise.all(
      dirs.map(async (e) => {
        const child = path.join(/*turbopackIgnore: true*/ dir, e.name);
        return { name: e.name, path: child, videos: await countVideos(child, { left: SCAN_BUDGET }) };
      }),
    );
    folders.sort((a, b) => naturalCompare(a.name, b.name));

    const up = path.dirname(dir);
    const parent = up === dir ? null : up;
    const drives = parent === null ? await listDrives() : [];

    return NextResponse.json({ path: dir, parent, folders, drives });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
