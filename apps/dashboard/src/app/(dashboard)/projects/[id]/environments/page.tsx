"use client";

import { ProjectTabs } from "@/components/layout";
import { Badge, GlassCard } from "@/components/ui";
import { useEnvironments, useProject } from "@/hooks";
import { IconServer2 } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const envTypeColors: Record<string, "success" | "warning" | "neutral"> = {
  development: "neutral",
  staging: "warning",
  production: "success",
};

export default function EnvironmentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { project } = useProject(projectId);
  const { environments, isLoading, error } = useEnvironments(projectId);

  return (
    <div>
      <ProjectTabs projectId={projectId} projectName={project?.name} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-1">Environments</h1>
          <p className="text-slate-500">Manage environments and their OAuth provider configurations</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-[var(--accent)] rounded-full border-t-transparent" />
        </div>
      ) : error ? (
        <GlassCard>
          <p className="text-red-500 text-center">{error}</p>
        </GlassCard>
      ) : environments.length === 0 ? (
        <GlassCard>
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <IconServer2 className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">No environments found</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {environments.map((env) => (
            <Link key={env.id} href={`/projects/${projectId}/environments/${env.id}`}>
              <GlassCard className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                      <IconServer2 className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{env.name}</h3>
                      <p className="text-sm text-slate-400">
                        Created {new Date(env.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={envTypeColors[env.type] ?? "neutral"}>
                    {env.type}
                  </Badge>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
