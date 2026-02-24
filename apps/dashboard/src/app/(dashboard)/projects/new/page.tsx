"use client";

import { Button, GlassCard, Toggle } from "@/components/ui";
import { useProjects } from "@/hooks";
import type { CreateProjectResponse } from "@/lib/api";
import { IconBrandGithub, IconBrandGoogle, IconCheck, IconKey, IconMail } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateProjectPage() {
  const router = useRouter();
  const { createProject } = useProjects();
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("development");
  const [authMethods, setAuthMethods] = useState({
    email: true,
    google: false,
    github: false,
  });
  const [corsOrigins, setCorsOrigins] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CreateProjectResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);

    const allowedProviders = Object.entries(authMethods)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

    const allowedOrigins = corsOrigins
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const result = await createProject.mutateAsync({
        name: name.trim(),
        allowedOrigins,
        allowedProviders,
      });
      setCredentials(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  // Show credentials after successful creation
  if (credentials) {
    return (
      <div className="max-w-2xl mx-auto">
        <GlassCard>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">Project Created</h1>
            <p className="text-slate-500 text-sm">Save your credentials - the client secret will not be shown again.</p>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Project Name</label>
              <p className="text-slate-800 font-medium">{credentials.project.name}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Client ID</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-800 select-all break-all">
                {credentials.clientId}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Client Secret</label>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-800 select-all break-all">
                {credentials.clientSecret}
              </div>
              <p className="text-xs text-amber-600 mt-1 font-medium">Copy this now - it will not be shown again.</p>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push(`/projects/${credentials.project.id}`)}
          >
            Go to Project
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link href="/projects" className="hover:text-slate-600">Projects</Link>
          <span>/</span>
          <span className="text-slate-600">New Project</span>
        </div>
        <h1 className="text-3xl font-display font-extrabold text-slate-900">Create New Project</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Project Basics */}
        <GlassCard className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Project Basics</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome App"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Environment</label>
              <div className="flex flex-wrap gap-4">
                {["development", "staging", "production"].map((env) => (
                  <label
                    key={env}
                    className={`flex-1 cursor-pointer rounded-xl border p-4 transition-all ${
                      environment === env
                        ? "border-[var(--accent)] bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="environment"
                      value={env}
                      checked={environment === env}
                      onChange={(e) => setEnvironment(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-medium text-slate-700 capitalize">{env}</span>
                    <p className="text-xs text-slate-400 mt-1">
                      {env === "development" && "For local testing"}
                      {env === "staging" && "For QA and testing"}
                      {env === "production" && "Live environment"}
                    </p>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Authentication Methods */}
        <GlassCard className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Authentication Methods</h2>
          <p className="text-sm text-slate-500 mb-6">Permit uses passwordless OTP authentication by default.</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                  <IconMail className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Email OTP</p>
                  <p className="text-xs text-slate-400">One-time passwords sent to email</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Always On</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                  <IconBrandGoogle className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Google SSO</p>
                  <p className="text-xs text-slate-400">Sign in with Google</p>
                  {authMethods.google && environment === "development" && (
                    <p className="text-xs text-blue-500 mt-0.5">Uses shared Permit credentials</p>
                  )}
                </div>
              </div>
              <Toggle
                enabled={authMethods.google}
                onChange={(enabled) => setAuthMethods((prev) => ({ ...prev, google: enabled }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                  <IconBrandGithub className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">GitHub SSO</p>
                  <p className="text-xs text-slate-400">Sign in with GitHub</p>
                  {authMethods.github && environment === "development" && (
                    <p className="text-xs text-blue-500 mt-0.5">Uses shared Permit credentials</p>
                  )}
                </div>
              </div>
              <Toggle
                enabled={authMethods.github}
                onChange={(enabled) => setAuthMethods((prev) => ({ ...prev, github: enabled }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl opacity-60">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                  <IconKey className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Apple SSO</p>
                  <p className="text-xs text-slate-400">Sign in with Apple</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Coming Soon</span>
            </div>
          </div>
        </GlassCard>

        {/* Security & CORS */}
        <GlassCard className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Security & CORS</h2>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Allowed Origins</label>
            <textarea
              value={corsOrigins}
              onChange={(e) => setCorsOrigins(e.target.value)}
              placeholder={"https://myapp.com\nhttps://staging.myapp.com"}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all font-mono text-sm"
            />
            <p className="text-xs text-slate-400 mt-2">One URL per line. Use * for development only.</p>
          </div>
        </GlassCard>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createProject.isPending} disabled={!name.trim()}>
            {createProject.isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
