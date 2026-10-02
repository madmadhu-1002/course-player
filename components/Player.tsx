"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Video } from "@/lib/types";
import { formatTime, VideoProgress } from "@/lib/progress";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 16];
const SPEED_KEY = "course-player-speed";
const SUB_KEY = "course-player-subtitles";

type Props = {
  video: Video;
  saved: VideoProgress | undefined;
  prevVideo?: Video | null;
  nextVideo?: Video | null;
  onProgress: (t: number, d: number) => void;
  onDone: (done: boolean) => void;
  onNavigate: (id: string) => void;
};

export default function Player({
  video,
  saved,
  prevVideo,
  nextVideo,
  onProgress,
  onDone,
  onNavigate,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef(0);
  const resumedRef = useRef(false);
  const progressCb = useRef(onProgress);
  useEffect(() => {
    progressCb.current = onProgress;
  });

  const [speed, setSpeed] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const s = parseFloat(window.localStorage.getItem(SPEED_KEY) || "1");
      return SPEEDS.includes(s) ? s : 1;
    } catch {
      return 1;
    }
  });
  const [subtitle, setSubtitle] = useState<string>(() => {
    if (typeof window === "undefined") return "off";
    try {
      return window.localStorage.getItem(SUB_KEY) || "off";
    } catch {
      return "off";
    }
  });

  useEffect(() => {
    resumedRef.current = false;
    lastSavedRef.current = 0;
  }, [video.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.playbackRate = speed;
    try {
      window.localStorage.setItem(SPEED_KEY, String(speed));
    } catch {
      // ignore
    }
  }, [speed, video.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SUB_KEY, subtitle);
    } catch {
      // ignore
    }

    const apply = () => {
      const tracks = videoRef.current?.textTracks;
      if (!tracks) return;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        const match = subtitle !== "off" && (t.label === subtitle || t.language === subtitle);
        t.mode = match ? "showing" : "disabled";
      }
    };

    apply();
    const timer = window.setTimeout(apply, 300);
    return () => window.clearTimeout(timer);
  }, [subtitle, video.id]);

  const handleLoadedMetadata = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = speed;
    if (!resumedRef.current && saved && saved.t > 5 && !saved.done && saved.t < el.duration - 10) {
      el.currentTime = saved.t;
      lastSavedRef.current = saved.t;
    }
    resumedRef.current = true;
  }, [saved, speed]);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    if (Math.abs(el.currentTime - lastSavedRef.current) >= 2) {
      lastSavedRef.current = el.currentTime;
      progressCb.current(el.currentTime, el.duration);
    }
  }, []);

  const flushProgress = useCallback(() => {
    const el = videoRef.current;
    if (el && el.duration) progressCb.current(el.currentTime, el.duration);
  }, []);

  const handleEnded = useCallback(() => {
    const el = videoRef.current;
    if (el && el.duration) progressCb.current(el.duration, el.duration);
    onDone(true);
    if (nextVideo) onNavigate(nextVideo.id);
  }, [onDone, onNavigate, nextVideo]);

  useEffect(() => {
    window.addEventListener("beforeunload", flushProgress);
    return () => {
      window.removeEventListener("beforeunload", flushProgress);
      flushProgress();
    };
  }, [flushProgress, video.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const el = videoRef.current;
      if (!el) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (el.paused) {
            void el.play();
          } else {
            el.pause();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          el.currentTime = Math.min(el.duration || 0, el.currentTime + 10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          el.currentTime = Math.max(0, el.currentTime - 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          el.volume = Math.min(1, el.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          el.volume = Math.max(0, el.volume - 0.1);
          break;
        case "m":
          el.muted = !el.muted;
          break;
        case "f":
          if (document.fullscreenElement) document.exitFullscreen();
          else el.requestFullscreen();
          break;
        case "n":
          if (nextVideo) onNavigate(nextVideo.id);
          break;
        case "p":
          if (prevVideo) onNavigate(prevVideo.id);
          break;
        case "]":
          setSpeed((s) => SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(s) + 1)] ?? 1);
          break;
        case "[":
          setSpeed((s) => SPEEDS[Math.max(0, SPEEDS.indexOf(s) - 1)] ?? 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextVideo, prevVideo, onNavigate]);

  const toggleDone = () => onDone(!saved?.done);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          key={video.id}
          ref={videoRef}
          className="aspect-video w-full"
          controls
          autoPlay
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPause={flushProgress}
          onSeeked={flushProgress}
        >
          <source src={`/api/video?path=${encodeURIComponent(video.path)}`} />
          {video.subtitles.map((s) => (
            <track
              key={s.path}
              kind="subtitles"
              label={s.label}
              srcLang={s.label}
              src={`/api/subtitles?path=${encodeURIComponent(s.path)}`}
            />
          ))}
          Your browser does not support HTML5 video.
        </video>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => prevVideo && onNavigate(prevVideo.id)}
          disabled={!prevVideo}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          ⏮ Prev
        </button>
        <button
          onClick={() => nextVideo && onNavigate(nextVideo.id)}
          disabled={!nextVideo}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Next ⏭
        </button>

        <button
          onClick={toggleDone}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            saved?.done
              ? "bg-green-600 text-white hover:bg-green-700"
              : "border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          }`}
        >
          {saved?.done ? "✓ Completed" : "Mark complete"}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm text-neutral-500">
            Speed
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => setSpeed(speed === 16 ? 1 : 16)}
            title="Toggle 16x speed"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              speed === 16
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            }`}
          >
            16x
          </button>

          <label className="flex items-center gap-1 text-sm text-neutral-500">
            CC
            <select
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="max-w-[9rem] rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
            >
              <option value="off">Off</option>
              {video.subtitles.map((s) => (
                <option key={s.path} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Shortcuts: <b>Space</b> play/pause · <b>←/→</b> ±10s · <b>↑/↓</b> volume ·{" "}
        <b>[ / ]</b> speed · <b>F</b> fullscreen · <b>M</b> mute · <b>N/P</b> next/prev
        {saved && saved.t > 5 && !saved.done && (
          <> · resuming at {formatTime(saved.t)}</>
        )}
      </p>
    </div>
  );
}
