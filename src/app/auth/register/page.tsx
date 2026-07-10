"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setField(null);
    const formData = new FormData(e.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      name: String(formData.get("name") ?? ""),
      organizationName: String(formData.get("organizationName") ?? ""),
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error ?? "Registration failed";
        setError(message);
        if (data.field) setField(data.field);
        toast(message, "error");
        return;
      }

      toast("Account created", "success");
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setError(message);
      toast(message, "error");
    }
  }

  const inputCls = (name: string) =>
    `w-full rounded-md border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 disabled:opacity-50 ${
      field === name ? "border-rose-500/60" : "border-zinc-700"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-zinc-950 font-black">
              A
            </div>
            <div className="leading-tight text-left">
              <div className="font-semibold text-zinc-50">Aegis</div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400/80">authorized · WSTG-aligned</div>
            </div>
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold">Create your account</h1>
            <p className="text-sm text-zinc-400 mt-1">Registration is restricted to the platform owner.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Your name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                disabled={isPending}
                className={inputCls("name")}
                placeholder="Alex Morgan"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={isPending}
                className={inputCls("email")}
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isPending}
                className={inputCls("password")}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="organizationName" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Organization name
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                minLength={2}
                disabled={isPending}
                className={inputCls("organizationName")}
                placeholder="Acme Security"
              />
            </div>

            {error && (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-zinc-950 font-semibold px-4 py-2 text-sm glow transition"
            >
              {isPending ? "Creating..." : "Create account"}
            </button>
          </form>

          <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-800">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
