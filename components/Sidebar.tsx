"use client";

import { useMemo, useState } from "react";
import type { Course } from "@/lib/types";
import { Store } from "@/lib/progress";

type Props = {
  courses: Course[];
  courseId: string | null;
  onSelectCourse: (id: string) => void;
  course: Course;
  store: Store;
  currentId: string | null;
  query: string;
  onQuery: (q: string) => void;
  onSelect: (path: string) => void;
  open: boolean;
  onClose: () => void;
  onClearProgress: () => void;
};

export default function Sidebar({
  courses,
  courseId,
  onSelectCourse,
  course,
  store,
  currentId,
  query,
  onQuery,
  onSelect,
  open,
  onClose,
  onClearProgress,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();
  const sections = useMemo(() => {
    if (!q) return course.sections;
    return course.sections
      .map((s) => ({
        ...s,
        videos: s.videos.filter(
          (v) => v.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.videos.length > 0);
  }, [course, q]);

  const doneCount = useMemo(
    () =>
      course.sections.reduce(
        (sum, s) => sum + s.videos.filter((v) => store.videos[v.id]?.done).length,
        0,
      ),
    [course, store],
  );
  const pct = course.totalVideos ? Math.round((doneCount / course.totalVideos) * 100) : 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 lg:hidden ${open ? "" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[22rem] max-w-[85vw] flex-col overflow-hidden border-r border-neutral-200 bg-neutral-50 transition-transform dark:border-neutral-800 dark:bg-neutral-900 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="shrink-0 border-b border-neutral-200 p-3 dark:border-neutral-800">
          {courses.length > 1 && (
            <select
              value={courseId ?? ""}
              onChange={(e) => onSelectCourse(e.target.value)}
              className="mb-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.totalVideos || "no videos"})
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Search lessons…"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              />
              {query && (
                <button
                  onClick={() => onQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-200 lg:hidden dark:hover:bg-neutral-800"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>
                {doneCount} / {course.totalVideos} lessons
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {sections.length === 0 && (
            <p className="p-4 text-sm text-neutral-500">
              {course.totalVideos === 0
                ? `No videos in “${course.title}” yet.`
                : `No lessons match “${query}”.`}
            </p>
          )}

          {sections.map((section) => {
            const isCollapsed = q ? false : collapsed[section.id] ?? false;
            const sectionDone = section.videos.filter((v) => store.videos[v.id]?.done).length;
            return (
              <div key={section.id} className="mb-2">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !isCollapsed }))}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-800"
                >
                  <span
                    className={`text-neutral-400 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  >
                    ▶
                  </span>
                  <span className="flex-1 truncate">{section.name}</span>
                  <span className="text-xs font-normal text-neutral-500">
                    {sectionDone}/{section.videos.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <ul className="mt-0.5 space-y-0.5">
                    {section.videos.map((video) => {
                      const p = store.videos[video.id];
                      const active = video.id === currentId;
                      const progress =
                        p && p.d > 0 && !p.done ? Math.min(100, Math.round((p.t / p.d) * 100)) : 0;
                      return (
                        <li key={video.id}>
                          <button
                            onClick={() => onSelect(video.id)}
                            className={`group relative w-full rounded-lg px-3 py-2 pr-8 text-left text-sm transition-colors ${
                              active
                                ? "bg-blue-600 text-white"
                                : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
                            }`}
                          >
                            <span className="block truncate">{video.name}</span>
                            <span
                              className={`block truncate text-xs ${
                                active ? "text-blue-100" : "text-neutral-500 dark:text-neutral-400"
                              }`}
                            >
                              {section.name}
                            </span>

                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                              {p?.done ? "✓" : active ? "▶" : p && p.t > 5 ? `${progress}%` : ""}
                            </span>

                            {progress > 0 && !p?.done && (
                              <span
                                className="absolute bottom-0 left-0 h-0.5 bg-amber-400"
                                style={{ width: `${progress}%` }}
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-between border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800">
          <span className="truncate pr-2">{course.title}</span>
          <button
            onClick={onClearProgress}
            className="shrink-0 underline hover:text-red-500"
            title="Clear watched history"
          >
            Reset
          </button>
        </div>
      </aside>
    </>
  );
}
