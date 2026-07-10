"use client";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="block w-full rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 text-center transition cursor-pointer"
      >
        Sign out
      </button>
    </form>
  );
}
