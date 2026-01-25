"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button, Card, CardContent } from "@/components/ui";
import { dashboardApi, Project } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function ProjectDetailsContent() {
  const params = useParams();
  const projectId = params.id as string;
  const { accessToken, logout, user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (accessToken && projectId) {
      loadProject();
    }
  }, [accessToken, projectId]);

  async function loadProject() {
    try {
      setLoading(true);
      const res = await dashboardApi.getProject(accessToken!, projectId);
      setProject(res.data);
    } catch (err) {
      setError("Project not found");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-500 rounded-full border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card className="text-center py-12 max-w-md">
          <CardContent>
            <p className="text-red-400 mb-4">{error || "Project not found"}</p>
            <Link href="/projects">
              <Button>Back to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    { href: `/projects/${projectId}`, label: "Overview", active: true },
    { href: `/projects/${projectId}/users`, label: "Users" },
    { href: `/projects/${projectId}/api-keys`, label: "API Keys" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/projects" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                ← Projects
              </Link>
              <span className="text-zinc-600">/</span>
              <span className="font-semibold">{project.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub navigation */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                  item.active
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-100">{project.userCount}</div>
              <div className="text-zinc-400 text-sm mt-1">Total Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-100">
                {new Date(project.createdAt).toLocaleDateString()}
              </div>
              <div className="text-zinc-400 text-sm mt-1">Created</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-100">
                {new Date(project.updatedAt).toLocaleDateString()}
              </div>
              <div className="text-zinc-400 text-sm mt-1">Last Updated</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardContent>
            <h3 className="font-semibold text-lg mb-2">About</h3>
            <p className="text-zinc-400">{project.description || "No description provided"}</p>
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href={`/projects/${projectId}/users`}>
            <Card className="hover:border-zinc-700 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-100">View Users</h4>
                  <p className="text-sm text-zinc-400">See all {project.userCount} users and their auth methods</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/projects/${projectId}/api-keys`}>
            <Card className="hover:border-zinc-700 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-100">Manage API Keys</h4>
                  <p className="text-sm text-zinc-400">Create and revoke API keys for this project</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function ProjectDetailsPage() {
  return (
    <ProtectedRoute>
      <ProjectDetailsContent />
    </ProtectedRoute>
  );
}
