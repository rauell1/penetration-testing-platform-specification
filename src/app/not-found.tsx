import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950 text-zinc-100">
      <div className="text-center max-w-md">
        <div className="text-7xl font-black bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-transparent">
          404
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Route not found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Check the URL or head back to safety.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/"
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 text-sm glow"
          >
            Back home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-200 px-4 py-2 text-sm"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
