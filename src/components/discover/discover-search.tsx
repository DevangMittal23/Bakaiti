"use client";
import { useRef, useState } from "react";
import { Search, X, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
export function DiscoverSearch() {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (query.trim())
          router.push(
            `/search?q=${encodeURIComponent(query.trim())}&type=users`,
          );
        else input.current?.focus();
      }}
      className="flex max-w-2xl gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-4 top-4 h-5 w-5 text-text-secondary" />
        <label htmlFor="discover-search" className="sr-only">
          Search people, posts and topics
        </label>
        <input
          ref={input}
          id="discover-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="People, posts, rabbit holes…"
          className="h-14 w-full rounded-2xl border border-border bg-surface pl-12 pr-12 text-sm focus:border-accent focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear explore search"
            onClick={() => {
              setQuery("");
              input.current?.focus();
            }}
            className="absolute right-0 top-1 flex h-12 w-11 items-center justify-center text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <button
        type="submit"
        aria-label="Search Bakaiti"
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-on-primary transition-transform hover:brightness-110 active:scale-95"
      >
        <ArrowUpRight className="h-5 w-5" />
      </button>
    </form>
  );
}
