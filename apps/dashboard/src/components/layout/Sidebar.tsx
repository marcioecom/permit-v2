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
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useSidebar } from "./SidebarContext";

const navItems: { href: string; label: string; icon: ComponentType<{ className?: string; size?: number }> }[] = [
  { href: "/", label: "Overview", icon: IconLayoutGrid },
  { href: "/projects", label: "Projects", icon: IconFolder },
  { href: "/users", label: "Users", icon: IconUsers },
  { href: "/logs", label: "Auth Logs", icon: IconFileText },
];

function SidebarContent({ onNavigate, layoutId }: { onNavigate?: () => void; layoutId: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <IconShieldCheck className="w-5 h-5" />
        </div>
        <span className="font-display text-xl font-bold tracking-tight text-slate-800">Permit</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        <LayoutGroup id={layoutId}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${active
                  ? "text-[var(--accent)] bg-[var(--accent-light)]"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute right-2 w-2 h-2 rounded-full bg-[var(--accent)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </LayoutGroup>
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
    </>
  );
}

export function Sidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-64 border-r border-slate-100 flex-col fixed inset-y-0 z-50 bg-white"
        style={{ viewTransitionName: "sidebar" }}
      >
        <SidebarContent layoutId="desktop" />
      </aside>

      {/* Mobile sidebar overlay */}
      <motion.div
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className={`fixed inset-0 z-50 bg-black/40 md:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        onClick={close}
      />
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col md:hidden"
      >
        <SidebarContent onNavigate={close} layoutId="mobile" />
      </motion.aside>
    </>
  );
}
