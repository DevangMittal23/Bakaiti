"use client";
import { useEffect, useRef, useState } from "react";
import { Film, Loader2, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
type Gif = { id: string; title: string; url: string; preview: string };
export function GifPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const term = useDebounce(query, 300);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/gif/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(
            response.status === 503
              ? "GIF search is currently unavailable."
              : "GIFs could not load. Try again.",
          );
        const data = await response.json();
        if (!controller.signal.aborted) setGifs(data.results || []);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "GIFs could not load. Try again.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [term, open, retry]);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Send a GIF"
          className="flex h-11 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-container hover:text-accent"
        >
          <Film className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[300px] max-w-[calc(100vw-24px)] border-border bg-surface p-3"
      >
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-text-secondary" />
          <input
            ref={input}
            aria-label="Search GIFs"
            placeholder="Find the perfect reaction"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-9 text-xs"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear GIF search"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
              className="absolute right-0 top-0 flex h-11 w-9 items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {loading ? (
          <div
            role="status"
            className="flex min-h-32 items-center justify-center"
          >
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span className="sr-only">Loading GIFs</span>
          </div>
        ) : error ? (
          <div role="alert" className="p-4 text-center text-xs text-error">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setRetry((v) => v + 1)}
              className="mt-2 min-h-11 font-semibold"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
            {gifs.map((gif) => (
              <button
                type="button"
                key={gif.id}
                aria-label={`Send GIF: ${gif.title || "reaction"}`}
                onClick={() => {
                  onSelect(gif.url);
                  setOpen(false);
                }}
                className="overflow-hidden rounded-lg border border-border hover:border-accent"
              >
                <img
                  src={gif.preview}
                  alt={gif.title || "GIF reaction"}
                  className="h-24 w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
            {!gifs.length && (
              <p className="col-span-2 p-6 text-center text-xs text-text-secondary">
                No GIFs found. Try another search.
              </p>
            )}
          </div>
        )}
        <p className="mt-3 text-[10px] text-text-secondary">
          GIFs powered by Tenor
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
