"use client";

import { Button, Card, CardContent } from "@/components/ui";
import { useProjects } from "@/hooks";
import { IconFolder, IconPlus, IconUsers } from "@tabler/icons-react";
import Link from "next/link";

export default function ProjectsPage() {
  const { projects, isLoading, error, refetch } = useProjects();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-1">Projects</h1>
          <p className="text-slate-500">Manage your projects and their users</p>
        </div>
        <Link href="/projects/new">
          <Button icon={<IconPlus className="w-4 h-4" />}>New Project</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent>
                <div className="h-6 bg-slate-200 rounded w-1/2 mb-3" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="glass-card text-center py-12">
          <CardContent>
            <p className="text-red-400 mb-4">{error}</p>
            <Button variant="secondary" onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="glass-card py-12 max-w-lg mx-auto">
          <CardContent>
            <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Get started with Permit</h2>
            <p className="text-slate-400 text-sm text-center mb-8">Add authentication to your app in 3 steps.</p>
            <div className="space-y-4 mb-8">
              {[
                { step: "1", title: "Create a project", desc: "Set up your first project to manage users and auth." },
                { step: "2", title: "Get your API keys", desc: "Use your client ID and secret to connect your backend." },
                { step: "3", title: "Add the widget", desc: "Drop in the React component for instant login UI." },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-slate-500">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link href="/projects/new">
                <Button>Create Project</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="glass-card hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer h-full group">
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-accent transition-colors">
                      <IconFolder className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{project.name}</h3>
                      <span className="text-xs text-emerald-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <IconUsers className="w-4 h-4" />
                      {project.userCount} users
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
