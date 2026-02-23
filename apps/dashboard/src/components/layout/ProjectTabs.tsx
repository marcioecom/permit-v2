"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { EnvironmentSwitcher } from "./EnvironmentSwitcher";

interface ProjectTabsProps {
  projectId: string;
  projectName?: string;
}

export function ProjectTabs({ projectId, projectName }: ProjectTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const envParam = searchParams.get("env");
  const queryString = envParam ? `?env=${envParam}` : "";

  const tabs = [
    { href: `/projects/${projectId}`, label: "Overview", exact: true },
    { href: `/projects/${projectId}/users`, label: "Users" },
    { href: `/projects/${projectId}/api-keys`, label: "API Keys" },
    { href: `/projects/${projectId}/customize`, label: "Widget" },
  ];

  const isActive = (tab: typeof tabs[number]) => {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  };

  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
        <Link href="/projects" className="hover:text-slate-600 transition-colors">Projects</Link>
        <span>/</span>
        <span className="text-slate-600">{projectName || "..."}</span>
        <span>/</span>
        <EnvironmentSwitcher projectId={projectId} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={`${tab.href}${queryString}`}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              isActive(tab)
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
