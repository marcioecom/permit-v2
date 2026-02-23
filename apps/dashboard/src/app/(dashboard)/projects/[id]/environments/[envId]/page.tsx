"use client";

import { ProjectTabs } from "@/components/layout";
import { Badge, Button, GlassCard } from "@/components/ui";
import { useOAuthProviders, useProject } from "@/hooks";
import { dashboardApi, type Environment } from "@/lib/api";
import {
  IconBrandGithub,
  IconBrandGoogle,
  IconTrash,
} from "@tabler/icons-react";
import { usePermit } from "@permitdev/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const providerIcons: Record<string, React.ReactNode> = {
  google: <IconBrandGoogle className="w-5 h-5" />,
  github: <IconBrandGithub className="w-5 h-5" />,
};

const SUPPORTED_PROVIDERS = ["google", "github"] as const;

export default function EnvironmentDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const envId = params.envId as string;
  const { project } = useProject(projectId);
  const { token } = usePermit();
  const { providers, isLoading, upsertProvider, deleteProvider } = useOAuthProviders(projectId, envId);

  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [envLoading, setEnvLoading] = useState(true);

  // Form state for adding/editing a provider
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    if (token && projectId && envId) {
      dashboardApi.getEnvironment(token, projectId, envId).then((env) => {
        setEnvironment(env);
        setEnvLoading(false);
      }).catch(() => setEnvLoading(false));
    }
  }, [token, projectId, envId]);

  const isDev = environment?.type === "development";

  function handleEnableProvider(provider: string) {
    if (isDev) {
      // Dev environments use shared credentials - just enable
      upsertProvider.mutate({ provider, enabled: true });
    } else {
      // Production/staging - open form for credentials
      setEditingProvider(provider);
      setClientId("");
      setClientSecret("");
    }
  }

  function handleSaveProvider() {
    if (!editingProvider) return;
    upsertProvider.mutate(
      {
        provider: editingProvider,
        clientId: clientId || undefined,
        clientSecret: clientSecret || undefined,
        enabled: true,
      },
      { onSuccess: () => setEditingProvider(null) }
    );
  }

  function handleDeleteProvider(provider: string) {
    if (!confirm(`Remove ${provider} provider from this environment?`)) return;
    deleteProvider.mutate(provider);
  }

  const configuredProviders = new Set(providers.map((p) => p.provider));

  if (envLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--accent)] rounded-full border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <ProjectTabs projectId={projectId} projectName={project?.name} />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-display font-extrabold text-slate-900">
            {environment?.name ?? "Environment"}
          </h1>
          {environment && (
            <Badge variant={environment.type === "production" ? "success" : environment.type === "staging" ? "warning" : "neutral"}>
              {environment.type}
            </Badge>
          )}
        </div>
        <p className="text-slate-500">
          {isDev
            ? "Development environments use shared Permit credentials for testing - no setup required."
            : "Configure OAuth providers with your own credentials for this environment."}
        </p>
      </div>

      {/* Configured providers */}
      <h2 className="text-lg font-bold text-slate-800 mb-4">OAuth Providers</h2>

      {isLoading ? (
        <div className="text-slate-400 text-sm">Loading providers...</div>
      ) : (
        <div className="space-y-4 mb-8">
          {providers.map((provider) => (
            <GlassCard key={provider.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    {providerIcons[provider.provider] ?? null}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 capitalize">{provider.provider}</span>
                      {provider.isShared && (
                        <Badge variant="neutral">Shared</Badge>
                      )}
                      <Badge variant={provider.enabled ? "success" : "error"}>
                        {provider.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    {!provider.isShared && provider.clientId && (
                      <p className="text-xs text-slate-400 mt-1">
                        Client ID: {provider.clientId}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<IconTrash className="w-4 h-4" />}
                  onClick={() => handleDeleteProvider(provider.provider)}
                >
                  Remove
                </Button>
              </div>
            </GlassCard>
          ))}

          {providers.length === 0 && (
            <GlassCard>
              <p className="text-slate-400 text-center py-4">No OAuth providers configured yet</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* Add provider */}
      {SUPPORTED_PROVIDERS.filter((p) => !configuredProviders.has(p)).length > 0 && (
        <>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Add Provider</h2>
          <div className="flex flex-wrap gap-3 mb-8">
            {SUPPORTED_PROVIDERS.filter((p) => !configuredProviders.has(p)).map((provider) => (
              <Button
                key={provider}
                variant="secondary"
                icon={providerIcons[provider]}
                onClick={() => handleEnableProvider(provider)}
                isLoading={upsertProvider.isPending}
              >
                Add {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </Button>
            ))}
          </div>
        </>
      )}

      {/* Credentials form for non-dev environments */}
      {editingProvider && (
        <GlassCard className="mb-8">
          <h3 className="font-bold text-slate-800 mb-4 capitalize">
            Configure {editingProvider}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={`${editingProvider} OAuth Client ID`}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Client Secret
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={`${editingProvider} OAuth Client Secret`}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveProvider}
                isLoading={upsertProvider.isPending}
                disabled={!clientId.trim() || !clientSecret.trim()}
              >
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEditingProvider(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
