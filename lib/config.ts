import path from "path";

const DEFAULT_COURSE_DIR = "C:\\Users\\ih20162\\Desktop\\mahidhar\\flud";

export const COURSE_DIR = path.resolve(/* turbopackIgnore: true */ process.env.COURSE_DIR || DEFAULT_COURSE_DIR);

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
