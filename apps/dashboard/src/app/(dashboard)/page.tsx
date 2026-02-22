"use client";

import { Button, GlassCard, StatCard } from "@/components/ui";
import { useDashboardStats, useProjects } from "@/hooks";
import { IconBolt, IconBook, IconCheck, IconFolder, IconPlus, IconShieldCheck, IconUsers } from "@tabler/icons-react";
import Link from "next/link";

export default function OverviewPage() {
  const { stats, isLoading: statsLoading } = useDashboardStats();
  const { projects, isLoading: projectsLoading } = useProjects();

  const recentProjects = projects.slice(0, 4);

  return (
    <div>
      {/* Welcome Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-2">
            Good to see you!
          </h1>
          <p className="text-slate-500">
            Here is what is happening with your authentication infrastructure today.
          </p>
        </div>
        <Link href="/projects/new">
          <Button icon={<IconPlus className="w-4 h-4" />}>New Project</Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Projects"
          value={statsLoading ? "..." : stats?.activeProjects ?? 0}
          change={stats?.projectsChange}
          changeType="positive"
          icon={<IconFolder className="w-5 h-5" />}
        />
        <StatCard
          label="Monthly Users"
          value={statsLoading ? "..." : stats?.monthlyUsers?.toLocaleString() ?? 0}
          change={stats?.usersChange}
          changeType="positive"
          icon={<IconUsers className="w-5 h-5" />}
        />
        <StatCard
          label="API Requests (30d)"
          value={statsLoading ? "..." : stats?.apiRequests ?? "0"}
          changeType="neutral"
          icon={<IconBolt className="w-5 h-5" />}
        />
        <StatCard
          label="Auth Success Rate"
          value={statsLoading ? "..." : stats?.authSuccessRate ?? "0%"}
          change="Stable"
          changeType="neutral"
          icon={<IconShieldCheck className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Recent Projects</h2>
            <Link
              href="/projects"
              className="text-sm font-bold text-[var(--accent)] hover:underline"
            >
              View All
            </Link>
          </div>

          <GlassCard className="overflow-hidden !p-0">
            {projectsLoading ? (
              <div className="p-8 text-center text-slate-400">Loading projects...</div>
            ) : recentProjects.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconFolder className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 mb-4">No projects yet</p>
                <Link href="/projects/new">
                  <Button icon={<IconPlus className="w-4 h-4" />}>Create Project</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <IconFolder className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{project.name}</p>
                        <p className="text-xs text-slate-400">{project.userCount} users</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-500 font-medium">Active</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Quick Setup Guide */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Setup</h2>
          <GlassCard>
            <div className="space-y-4">
              {(() => {
                const hasProjects = projects.length > 0;
                const sdkInstalled = projects.some((p) => p.userCount > 0);

                const steps = [
                  { label: "Create account", desc: "Complete", done: true },
                  { label: "Create your first project", desc: hasProjects ? "Complete" : "Set up authentication", done: hasProjects },
                  { label: "Install the SDK", desc: sdkInstalled ? "Complete" : "Add to your app", done: sdkInstalled },
                ];

                return steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {step.done ? (
                      <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        <IconCheck className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        {i + 1}
                      </div>
                    )}
                    <div>
                      <p className={`font-medium text-sm ${step.done ? "text-slate-800" : "text-slate-500"}`}>{step.label}</p>
                      <p className="text-xs text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <a
                href="https://github.com/marcioecom/permit-v2/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-[var(--accent)] hover:underline flex items-center gap-2"
              >
                <IconBook className="w-4 h-4" />
                Read Documentation
              </a>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
