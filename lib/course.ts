import fs from "fs/promises";
import path from "path";
import { getCourseDir, languageFromFilename } from "./config";
import type { Course, Library, Section, Subtitle, Video } from "./types";

export type { Course, Library, Section, Subtitle, Video };

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".m4v", ".mov", ".mkv"]);

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function isVideo(file: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase());
}

async function walkSections(
  courseRel: string,
  dirAbs: string,
  dirRel: string,
  sections: Section[],
): Promise<void> {
  const files = await fs.readdir(dirAbs, { withFileTypes: true });
  const videoFiles = files
    .filter((f) => f.isFile() && isVideo(f.name))
    .map((f) => f.name)
    .sort(naturalCompare);

  if (videoFiles.length > 0) {
    const subtitleFiles = files
      .filter((f) => f.isFile() && path.extname(f.name).toLowerCase() === ".srt")
      .map((f) => f.name);

    const videos: Video[] = videoFiles.map((file) => {
      const base = file.slice(0, -path.extname(file).length);
      const subtitles: Subtitle[] = subtitleFiles
        .filter((s) => s.startsWith(base + " ") || s.slice(0, -4) === base)
        .map((s) => {
          const subBase = s.slice(0, -4);
          const label = languageFromFilename(subBase) || subBase.slice(base.length).trim();
          return {
            label,
            path: toPosix(path.join(courseRel, dirRel, s)),
          };
        })
        .sort((a, b) => naturalCompare(a.label, b.label));

      const rel = toPosix(path.join(courseRel, dirRel, file));
      return {
        id: rel,
        name: base,
        path: rel,
        section: dirRel === "" ? path.basename(courseRel) : toPosix(dirRel),
        subtitles,
      };
    });

    sections.push({
      id: toPosix(path.join(courseRel, dirRel)) || toPosix(courseRel),
      name: dirRel === "" ? path.basename(courseRel) : toPosix(dirRel),
      videos,
    });
  }

  const subdirs = files
    .filter((f) => f.isDirectory())
    .map((f) => f.name)
    .sort(naturalCompare);

  for (const dir of subdirs) {
    await walkSections(courseRel, path.join(dirAbs, dir), path.join(dirRel, dir), sections);
  }
}

async function scanCourse(courseId: string): Promise<Course> {
  const courseAbs = path.resolve(getCourseDir(), courseId);
  const sections: Section[] = [];
  await walkSections(courseId, courseAbs, "", sections);
  sections.sort((a, b) => naturalCompare(a.id, b.id));
  return {
    id: toPosix(courseId),
    title: path.basename(courseAbs),
    sections,
    totalVideos: sections.reduce((sum, s) => sum + s.videos.length, 0),
  };
}

export async function scanLibrary(): Promise<Library> {
  const root = getCourseDir();
  const entries = await fs.readdir(root, { withFileTypes: true });

  const rootVideoFiles = entries
    .filter((e) => e.isFile() && isVideo(e.name))
    .map((e) => e.name);
  const courseDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(naturalCompare);

  const courses: Course[] = [];

  if (rootVideoFiles.length > 0) {
    const rootCourse = await scanCourse(".");
    rootCourse.title = path.basename(root);
    courses.push(rootCourse);
  }

  for (const dir of courseDirs) {
    courses.push(await scanCourse(dir));
  }

  return {
    root: toPosix(root),
    courses,
    totalVideos: courses.reduce((sum, c) => sum + c.totalVideos, 0),
  };
}

export function resolveCoursePath(relativePath: string): string {
  const root = getCourseDir();
  const normalized = relativePath.replace(/\//g, path.sep);
  const full = path.resolve(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (full !== root && !full.startsWith(rootWithSep)) {
    throw new Error("Path escapes course directory");
  }
  return full;
}
