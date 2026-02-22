"use client";

import { ProjectTabs } from "@/components/layout";
import { Badge, Button, GlassCard } from "@/components/ui";
import { useProject } from "@/hooks";
import { APIKey, dashboardApi } from "@/lib/api";
import { IconCheck, IconKey, IconPlus, IconX } from "@tabler/icons-react";
import { usePermit } from "@permitdev/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function APIKeysPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { project } = useProject(projectId);
  const { token } = usePermit();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (token && projectId) {
      loadKeys();
    }
  }, [token, projectId]);

  async function loadKeys() {
    try {
      setLoading(true);
      const res = await dashboardApi.listAPIKeys(token!, projectId);
      setKeys(res.data);
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    try {
      setCreating(true);
      const res = await dashboardApi.createAPIKey(token!, projectId, newKeyName);
      setNewKey({ clientId: res.clientId, clientSecret: res.clientSecret });
      setNewKeyName("");
      setShowCreate(false);
      loadKeys();
    } catch {
      setError("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
    try {
      setRevoking(keyId);
      await dashboardApi.revokeAPIKey(token!, projectId, keyId);
      loadKeys();
    } catch {
      setError("Failed to revoke API key");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div>
      <ProjectTabs projectId={projectId} projectName={project?.name} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-1">API Keys</h1>
          <p className="text-slate-500">Manage API keys for this project</p>
        </div>
        <Button icon={<IconPlus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Create Key
        </Button>
      </div>

      {/* New Key Display */}
      {newKey && (
        <GlassCard className="mb-6 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <IconCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-emerald-700 mb-2">API Key Created Successfully!</h3>
              <p className="text-slate-500 text-sm mb-4">
                Copy your secret key now. You will not be able to see it again.
              </p>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client ID</label>
                  <code className="block mt-1 p-2 bg-white rounded-lg text-sm text-slate-700 font-mono border border-slate-100">
                    {newKey.clientId}
                  </code>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Secret</label>
                  <code className="block mt-1 p-2 bg-white rounded-lg text-sm text-amber-700 font-mono border border-amber-100">
                    {newKey.clientSecret}
                  </code>
                </div>
              </div>
            </div>
            <button onClick={() => setNewKey(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </GlassCard>
      )}

      {/* Create Form */}
      {showCreate && (
        <GlassCard className="mb-6">
          <h3 className="font-bold text-slate-800 mb-4">Create New API Key</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Key name (e.g., Production, Development)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all"
            />
            <Button isLoading={creating} disabled={!newKeyName.trim()} onClick={handleCreate}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setNewKeyName(""); }}>
              Cancel
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Keys Table */}
      <GlassCard className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Client ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Used</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : error && keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-red-500">{error}</td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <IconKey className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 mb-2">No API keys yet</p>
                    <p className="text-slate-400 text-sm mb-4">Create your first API key to get started</p>
                    <Button onClick={() => setShowCreate(true)}>
                      Create API Key
                    </Button>
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-800">{key.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded">{key.clientId}</code>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={key.status === "active" ? "success" : "error"}>
                        {key.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {key.status === "active" && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRevoke(key.id)}
                          disabled={revoking === key.id}
                        >
                          {revoking === key.id ? "Revoking..." : "Revoke"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
