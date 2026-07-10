"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950 text-zinc-100">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 mb-4">
          <span className="text-rose-400 text-xl font-bold">!</span>
        </div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {error.message || "An unexpected error occurred. Try again or head back home."}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-zinc-500 font-mono">digest: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => reset()}
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 text-sm glow"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-200 px-4 py-2 text-sm"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
