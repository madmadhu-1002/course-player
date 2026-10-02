"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FolderEntry = { name: string; path: string; videos: number };

type FoldersResponse = {
  path: string;
  parent: string | null;
  folders: FolderEntry[];
  drives: string[];
  error?: string;
};

type Props = {
  onClose: () => void;
  onSelect: (path: string) => Promise<string | null>;
};

function breadcrumbParts(p: string): { label: string; path: string }[] {
  const windows = /^[A-Za-z]:/.test(p);
  const parts = p.split(/[\\/]+/).filter(Boolean);
  if (windows) {
    return parts.map((part, i) => {
      const joined = parts.slice(0, i + 1).join("\\");
      return { label: i === 0 ? joined : part, path: i === 0 ? joined + "\\" : joined };
    });
  }
  return parts.map((part, i) => ({
    label: i === 0 ? "/" + part : part,
    path: "/" + parts.slice(0, i + 1).join("/"),
  }));
}

export default function FolderPicker({ onClose, onSelect }: Props) {
  const [data, setData] = useState<FoldersResponse | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const navigate = useCallback(async (target?: string | null) => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const url = target ? `/api/folders?path=${encodeURIComponent(target)}` : "/api/folders";
      const res = await fetch(url);
      const json = (await res.json()) as FoldersResponse;
      if (id !== seq.current) return;
      if (!res.ok || json.error) {
        setError(json.error || "Could not read folder");
      } else {
        setData(json);
        setInput(json.path);
      }
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : "Could not read folder");
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => navigate(null), 0);
    return () => clearTimeout(timer);
  }, [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choose = useCallback(
    async (target: string) => {
      setBusy(true);
      setError(null);
      const err = await onSelect(target);
      setBusy(false);
      if (err) setError(err);
      else onClose();
    },
    [onSelect, onClose],
  );

  const crumbs = data ? breadcrumbParts(data.path) : [];
  const currentName = data
    ? data.path.split(/[\\/]+/).filter(Boolean).slice(-1)[0] || data.path
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose course folder"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="flex-1 text-sm font-semibold">Choose course folder</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
          <button
            onClick={() => data?.parent && navigate(data.parent)}
            disabled={!data?.parent || loading}
            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            title="Go back to parent folder"
          >
            ← Back
          </button>
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="C:\path\to\folder"
              spellCheck={false}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Go
            </button>
          </form>
        </div>

        {crumbs.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-neutral-200 px-4 py-1.5 text-xs text-neutral-500 dark:border-neutral-800">
            {crumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1">
                {i > 0 && <span className="text-neutral-400">›</span>}
                <button
                  onClick={() => navigate(crumb.path)}
                  className="max-w-40 truncate hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && !data && <p className="p-4 text-sm text-neutral-500">Loading…</p>}

          {error && (
            <p className="m-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}

          {data && data.drives.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 p-1">
              {data.drives.map((drive) => (
                <button
                  key={drive}
                  onClick={() => navigate(drive)}
                  className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  {drive}
                </button>
              ))}
            </div>
          )}

          {data && data.folders.length === 0 && !loading && (
            <p className="p-4 text-sm text-neutral-500">No subfolders here.</p>
          )}

          {data &&
            data.folders.map((folder) => (
              <div key={folder.path} className="flex items-center gap-2">
                <button
                  onClick={() => navigate(folder.path)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Open folder"
                >
                  <span className="text-neutral-400">📁</span>
                  <span className="flex-1 truncate">{folder.name}</span>
                  {folder.videos > 0 && (
                    <span className="shrink-0 text-xs text-neutral-500">
                      {folder.videos} video{folder.videos === 1 ? "" : "s"}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => choose(folder.path)}
                  disabled={busy}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                  title="Use this folder"
                >
                  Use
                </button>
              </div>
            ))}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <p className="min-w-0 flex-1 truncate text-xs text-neutral-500" title={data?.path}>
            {data?.path ?? "…"}
          </p>
          <button
            onClick={() => data && choose(data.path)}
            disabled={!data || busy || loading}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Selecting…" : `Select${currentName ? ` “${currentName}”` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
