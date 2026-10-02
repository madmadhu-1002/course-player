export type VideoProgress = {
  t: number;
  d: number;
  done: boolean;
};

export type Store = {
  videos: Record<string, VideoProgress>;
  last: string | null;
};

const KEY = "course-player-progress-v1";

export function loadStore(): Store {
  if (typeof window === "undefined") return { videos: {}, last: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { videos: {}, last: null };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      videos: parsed.videos && typeof parsed.videos === "object" ? parsed.videos : {},
      last: typeof parsed.last === "string" ? parsed.last : null,
    };
  } catch {
    return { videos: {}, last: null };
  }
}

export function saveStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage full or unavailable — ignore
  }
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
