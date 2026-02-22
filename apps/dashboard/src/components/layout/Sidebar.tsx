"use client";

import {
  IconBook,
  IconExternalLink,
  IconFileText,
  IconFolder,
  IconLayoutGrid,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

const navItems: { href: string; label: string; icon: ComponentType<{ className?: string; size?: number }> }[] = [
  { href: "/", label: "Overview", icon: IconLayoutGrid },
  { href: "/projects", label: "Projects", icon: IconFolder },
  { href: "/users", label: "Users", icon: IconUsers },
  { href: "/logs", label: "Auth Logs", icon: IconFileText },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="w-64 border-r border-slate-100 flex flex-col fixed inset-y-0 z-50 bg-white"
      style={{ viewTransitionName: "sidebar" }}
    >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <IconShieldCheck className="w-5 h-5" />
        </div>
        <span className="font-display text-xl font-bold tracking-tight text-slate-800">Permit</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${active
                ? "text-[var(--accent)] bg-[var(--accent-light)]"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute right-2 w-2 h-2 rounded-full bg-[var(--accent)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Documentation link */}
      <div className="p-4 mt-auto">
        <a
          href="https://github.com/marcioecom/permit-v2/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
        >
          <IconBook className="w-5 h-5" />
          Documentation
          <IconExternalLink className="w-3.5 h-3.5 ml-auto" />
        </a>
      </div>
    </aside>
  );
}
