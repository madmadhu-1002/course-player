"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Player from "@/components/Player";
import type { Course, Library } from "@/lib/types";
import { loadStore, saveStore, Store } from "@/lib/progress";

const emptyStore: Store = { videos: {}, last: null };
const COURSE_KEY = "course-player-course";

function readInitialStore(): Store {
  return typeof window === "undefined" ? emptyStore : loadStore();
}

function readInitialCourseId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(COURSE_KEY);
  } catch {
    return null;
  }
}

function readInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem("course-player-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function inCourse(course: Course, id: string | null): boolean {
  return !!id && course.sections.some((s) => s.videos.some((v) => v.id === id));
}

function firstVideo(course: Course) {
  return course.sections[0]?.videos[0] ?? null;
}

function lastWatchedIn(course: Course, store: Store) {
  for (const section of course.sections) {
    for (const video of section.videos) {
      if (store.videos[video.id]) return video;
    }
  }
  return null;
}

export default function Home() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [courseId, setCourseId] = useState<string | null>(readInitialCourseId);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store>(readInitialStore);
  const [currentId, setCurrentId] = useState<string | null>(
    () => readInitialStore().last,
  );
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(readInitialTheme);

  useEffect(() => {
    fetch("/api/course")
      .then((r) => r.json())
      .then((data: Library & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setLibrary(data);

        const stored = readInitialCourseId();
        const last = readInitialStore().last;
        let course = stored ? data.courses.find((c) => c.id === stored) : undefined;
        if (!course && last) course = data.courses.find((c) => inCourse(c, last));
        if (!course) {
          course = data.courses.find((c) => c.totalVideos > 0) ?? data.courses[0];
        }
        if (!course) {
          setCurrentId(null);
          return;
        }

        setCourseId(course.id);
        try {
          window.localStorage.setItem(COURSE_KEY, course.id);
        } catch {
          // ignore
        }
        setCurrentId((prev) =>
          inCourse(course, prev)
            ? prev
            : last && inCourse(course, last)
              ? last
              : firstVideo(course)?.id ?? null,
        );
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem("course-player-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const course = useMemo(
    () => library?.courses.find((c) => c.id === courseId) ?? null,
    [library, courseId],
  );

  const flatVideos = useMemo(
    () => course?.sections.flatMap((s) => s.videos) ?? [],
    [course],
  );

  const currentIndex = useMemo(
    () => flatVideos.findIndex((v) => v.id === currentId),
    [flatVideos, currentId],
  );
  const currentVideo = currentIndex >= 0 ? flatVideos[currentIndex] : null;
  const prevVideo = currentIndex > 0 ? flatVideos[currentIndex - 1] : null;
  const nextVideo =
    currentIndex >= 0 && currentIndex < flatVideos.length - 1
      ? flatVideos[currentIndex + 1]
      : null;

  const persist = useCallback((next: Store) => {
    setStore(next);
    saveStore(next);
  }, []);

  const selectVideo = useCallback((id: string) => {
    setCurrentId(id);
    setSidebarOpen(false);
    setStore((prev) => {
      const next = { ...prev, last: id };
      saveStore(next);
      return next;
    });
  }, []);

  const selectCourse = useCallback(
    (id: string) => {
      const target = library?.courses.find((c) => c.id === id);
      if (!target) return;
      setCourseId(id);
      setQuery("");
      try {
        window.localStorage.setItem(COURSE_KEY, id);
      } catch {
        // ignore
      }
      const video = lastWatchedIn(target, store) ?? firstVideo(target);
      if (video) {
        selectVideo(video.id);
      } else {
        setCurrentId(null);
      }
    },
    [library, store, selectVideo],
  );

  const handleProgress = useCallback(
    (t: number, d: number) => {
      if (!currentId) return;
      setStore((prev) => {
        const existing = prev.videos[currentId];
        if (existing?.done) return prev;
        const next: Store = {
          ...prev,
          videos: {
            ...prev.videos,
            [currentId]: { t, d, done: existing?.done ?? false },
          },
        };
        saveStore(next);
        return next;
      });
    },
    [currentId],
  );

  const handleDone = useCallback(
    (done: boolean) => {
      if (!currentId) return;
      setStore((prev) => {
        const existing = prev.videos[currentId] ?? { t: 0, d: 0, done: false };
        const next: Store = {
          ...prev,
          videos: { ...prev.videos, [currentId]: { ...existing, done } },
        };
        saveStore(next);
        return next;
      });
    },
    [currentId],
  );

  const clearProgress = useCallback(() => {
    if (!window.confirm("Clear all watched progress for this course?")) return;
    const ids = new Set(
      (course?.sections.flatMap((s) => s.videos.map((v) => v.id)) ?? []) as string[],
    );
    const videos: Store["videos"] = {};
    for (const [key, value] of Object.entries(store.videos)) {
      if (!ids.has(key)) videos[key] = value;
    }
    persist({ videos, last: currentId });
  }, [persist, course, store, currentId]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-300 p-6 text-center dark:border-red-800">
          <h1 className="text-lg font-semibold text-red-600">Could not load library</h1>
          <p className="mt-2 text-sm text-neutral-500">{error}</p>
          <p className="mt-4 text-xs text-neutral-400">
            Check COURSE_DIR in lib/config.ts (or the COURSE_DIR env variable).
          </p>
        </div>
      </main>
    );
  }

  if (!library || !course) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-neutral-500">
          {library ? "No course folders found." : "Scanning library…"}
        </p>
      </main>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 hover:bg-neutral-100 lg:hidden dark:hover:bg-neutral-800"
          aria-label="Open sidebar"
        >
          ☰
        </button>
        <h1 className="truncate text-sm font-semibold sm:text-base">{course.title}</h1>
        <span className="hidden text-xs text-neutral-500 sm:inline">
          {currentIndex + 1} / {flatVideos.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            title="Toggle theme"
          >
            {theme === "dark" ? "☾" : "☀"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          courses={library.courses}
          courseId={course.id}
          onSelectCourse={selectCourse}
          course={course}
          store={store}
          currentId={currentId}
          query={query}
          onQuery={setQuery}
          onSelect={selectVideo}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onClearProgress={clearProgress}
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {currentVideo ? (
            <div className="mx-auto max-w-5xl">
              <Player
                key={currentVideo.id}
                video={currentVideo}
                saved={store.videos[currentVideo.id]}
                prevVideo={prevVideo}
                nextVideo={nextVideo}
                onProgress={handleProgress}
                onDone={handleDone}
                onNavigate={selectVideo}
              />
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  {currentVideo.section}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{currentVideo.name}</h2>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-md rounded-xl border border-neutral-200 p-6 text-center dark:border-neutral-800">
              <h2 className="font-semibold">No videos here yet</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Drop .mp4 files into “{course.title}” and reload — the folder is scanned
                automatically.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
