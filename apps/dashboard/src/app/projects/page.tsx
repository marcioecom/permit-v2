"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button, Card, CardContent } from "@/components/ui";
import { dashboardApi, Project } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useEffect, useState } from "react";

function ProjectsContent() {
  const { accessToken, logout, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (accessToken) {
      loadProjects();
    }
  }, [accessToken]);

  async function loadProjects() {
    try {
      setLoading(true);
      const res = await dashboardApi.listProjects(accessToken!);
      console.log(res);
      setProjects(res.data);
    } catch (err) {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold">P</span>
              </div>
              <span className="font-semibold text-lg">Permit Dashboard</span>
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

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Projects</h1>
            <p className="text-zinc-400 mt-1">Manage your projects and their users</p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent>
                  <div className="h-6 bg-zinc-800 rounded w-1/2 mb-3" />
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-zinc-800 rounded w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={loadProjects}>Try Again</Button>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-zinc-400 mb-2">No projects yet</p>
              <p className="text-zinc-500 text-sm">Create your first project to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:border-zinc-700 transition-colors cursor-pointer h-full">
                  <CardContent>
                    <h3 className="font-semibold text-lg text-zinc-100 mb-1">{project.name}</h3>
                    {project.description && (
                      <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {project.userCount} users
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  );
}
