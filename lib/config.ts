import fs from "fs";
import path from "path";

const DEFAULT_COURSE_DIR = "C:\\Users\\ih20162\\Desktop\\mahidhar\\flud";

const ROOT_FILE = path.join(process.cwd(), ".course-root.json");

function readStoredRoot(): string | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(ROOT_FILE, "utf8"));
    if (typeof parsed?.dir === "string" && parsed.dir.trim()) {
      return path.resolve(parsed.dir);
    }
  } catch {
    // no stored root or unreadable file
  }
  return null;
}

export function getCourseDir(): string {
  const stored = readStoredRoot();
  if (stored) return stored;
  return path.resolve(/* turbopackIgnore: true */ process.env.COURSE_DIR || DEFAULT_COURSE_DIR);
}

export function setStoredRoot(dir: string | null): void {
  if (dir === null) {
    try {
      fs.unlinkSync(ROOT_FILE);
    } catch {
      // nothing to remove
    }
    return;
  }
  fs.writeFileSync(ROOT_FILE, JSON.stringify({ dir: path.resolve(dir) }, null, 2));
}

const LANGUAGE_NAMES: Record<string, string> = {
  english: "English",
  dutch: "Dutch",
  french: "French",
  german: "German",
  indonesian: "Indonesian",
  italian: "Italian",
  portuguese: "Portuguese",
  spanish: "Spanish",
  "simplified chinese": "Chinese (Simplified)",
  "traditional chinese": "Chinese (Traditional)",
  arabic: "Arabic",
  hindi: "Hindi",
  japanese: "Japanese",
  korean: "Korean",
  polish: "Polish",
  russian: "Russian",
  turkish: "Turkish",
  "brazilian portuguese": "Portuguese (Brazil)",
};

export function languageFromFilename(baseName: string): string | null {
  const match = baseName.match(/(?:^|[\s._-])([A-Za-z ]+)$/);
  if (!match) return null;
  const key = match[1].trim().toLowerCase();
  return LANGUAGE_NAMES[key] || null;
}
