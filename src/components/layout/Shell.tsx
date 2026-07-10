"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldHalf,
  LayoutGrid,
  Target,
  Scan,
  SearchCheck,
  ScrollText,
  BarChart2,
  Webhook,
  Users,
  Settings,
  LogIn,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutGrid, description: "Interactive specification showcase" },
  { href: "/dashboard", label: "Dashboard", icon: BarChart2, description: "Security posture overview" },
  { href: "/targets", label: "Targets", icon: Target, description: "Managed scan targets" },
  { href: "/scans", label: "Scan Runs", icon: Scan, description: "Historical scan activities" },
  { href: "/findings", label: "Findings", icon: SearchCheck, description: "Security findings and vulnerabilities" },
  { href: "/audit", label: "Audit Log", icon: ScrollText, description: "Audit trail and history" },
  { href: "/spec", label: "Spec", icon: ScrollText, description: "Technical documentation" },
];

const bottomNavigation = [
  { href: "/settings", label: "Settings", icon: Settings, description: "Platform preferences" },
  { href: "/auth/login", label: "Login", icon: LogIn, description: "User authentication" },
];

export default function Shell({ activePath, children }: { activePath?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = activePath || pathname;

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
        <div className="px-6 py-5 border-b border-zinc-800/80">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-zinc-950 font-black text-sm glow">
              A
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-zinc-100 group-hover:text-white">Aegis</div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400/80">authorized � WSTG-aligned</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <div className="px-2 pb-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Live Demo</div>
            <ul className="space-y-0.5">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active === item.href
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent"
                      }`}
                    title={item.description}
                  >
                    <span className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4">
            <div className="px-2 pb-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Account</div>
            <ul className="space-y-0.5">
              {bottomNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active === item.href
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent"
                      }`}
                    title={item.description}
                  >
                    <span className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-zinc-800/80 text-[10px] text-zinc-500 leading-relaxed">
          Passive by default � Active requires verified target + explicit opt-in � Every request scope-checked in-worker.
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 py-3 flex items-center gap-2">
          <Link href="/" className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-zinc-950 font-black text-xs">
            A
          </Link>
          <span className="font-semibold text-zinc-100">Aegis</span>
          <Link href="/spec" className="ml-auto text-xs text-emerald-400 hover:underline">
            spec
          </Link>
        </div>

        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="flex items-center justify-around">
          {navigation.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-md text-[10px] font-medium transition-colors ${active === item.href ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-100"}`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => {
              const sidebar = document.querySelector("#mobile-sidebar");
              sidebar?.classList.toggle("hidden");
            }}
            className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-md text-[10px] font-medium text-zinc-400 hover:text-zinc-100"
          >
            <Menu className="w-4 h-4" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}