"use client";

import { ProjectTabs } from "@/components/layout";
import { Button, ConfirmDialog, GlassCard, StatCard } from "@/components/ui";
import { useProject } from "@/hooks";
import { dashboardApi } from "@/lib/api";
import { IconCalendar, IconClock, IconKey, IconTrash, IconUsers } from "@tabler/icons-react";
import { usePermit } from "@permitdev/react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { project, isLoading, error } = useProject(projectId);
  const { token } = usePermit();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await dashboardApi.deleteProject(token!, projectId);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/projects");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--accent)] rounded-full border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error || "Project not found"}</p>
        <Link
          href="/projects"
          className="text-sm font-bold text-[var(--accent)] hover:underline"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ProjectTabs projectId={projectId} projectName={project.name} />

      <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-1">
        {project.name}
      </h1>
      <p className="text-slate-500 mb-8">
        {project.description || "No description provided"}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={project.userCount}
          icon={<IconUsers className="w-5 h-5" />}
        />
        <StatCard
          label="Created"
          value={new Date(project.createdAt).toLocaleDateString()}
          icon={<IconCalendar className="w-5 h-5" />}
        />
        <StatCard
          label="Last Updated"
          value={new Date(project.updatedAt).toLocaleDateString()}
          icon={<IconClock className="w-5 h-5" />}
        />
      </div>

      {/* Quick Links */}
      <h2 className="text-lg font-bold text-slate-800 mb-4">Manage</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href={`/projects/${projectId}/users`}>
          <GlassCard className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <IconUsers className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">View Users</h4>
                <p className="text-sm text-slate-400">See all {project.userCount} users and their auth methods</p>
              </div>
            </div>
          </GlassCard>
        </Link>

        <Link href={`/projects/${projectId}/api-keys`}>
          <GlassCard className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <IconKey className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Manage API Keys</h4>
                <p className="text-sm text-slate-400">Create and revoke API keys for this project</p>
              </div>
            </div>
          </GlassCard>
        </Link>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-4">
          Permanently delete this project and all associated data (users, API keys, environments, auth logs).
          This action cannot be undone.
        </p>
        <Button
          variant="danger"
          icon={<IconTrash className="w-4 h-4" />}
          disabled={deleting}
          onClick={() => setShowDeleteDialog(true)}
        >
          Delete Project
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={`Delete "${project.name}"?`}
        description="This will permanently delete this project and all associated data (users, API keys, environments, auth logs). This action cannot be undone."
        confirmLabel="Delete Project"
        cancelLabel="Keep Project"
        variant="danger"
        isLoading={deleting}
        icon={<IconTrash className="w-6 h-6 text-red-500" />}
      />
    </div>
  );
}
