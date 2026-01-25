"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { APIKey, dashboardApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function APIKeysContent() {
  const params = useParams();
  const projectId = params.id as string;
  const { accessToken, logout, user } = useAuth();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken && projectId) {
      loadKeys();
    }
  }, [accessToken, projectId]);

  async function loadKeys() {
    try {
      setLoading(true);
      const res = await dashboardApi.listAPIKeys(accessToken!, projectId);
      console.log(res)
      setKeys(res.data);
    } catch (err) {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    try {
      setCreating(true);
      const res = await dashboardApi.createAPIKey(accessToken!, projectId, newKeyName);
      setNewKey({ clientId: res.clientId, clientSecret: res.clientSecret });
      setNewKeyName("");
      setShowCreate(false);
      loadKeys();
    } catch (err) {
      setError("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
    try {
      setRevoking(keyId);
      await dashboardApi.revokeAPIKey(accessToken!, projectId, keyId);
      loadKeys();
    } catch (err) {
      setError("Failed to revoke API key");
    } finally {
      setRevoking(null);
    }
  }

  const navItems = [
    { href: `/projects/${projectId}`, label: "Overview" },
    { href: `/projects/${projectId}/users`, label: "Users" },
    { href: `/projects/${projectId}/api-keys`, label: "API Keys", active: true },
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">API Keys</h1>
            <p className="text-zinc-400 mt-1">Manage API keys for this project</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            + Create Key
          </Button>
        </div>

        {/* New Key Display */}
        {newKey && (
          <Card className="mb-6 border-green-500/20 bg-green-500/5">
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-green-400 mb-2">API Key Created Successfully!</h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    Copy your secret key now. You won't be able to see it again!
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase">Client ID</label>
                      <code className="block mt-1 p-2 bg-zinc-900 rounded text-sm text-zinc-300 font-mono">
                        {newKey.clientId}
                      </code>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase">Client Secret</label>
                      <code className="block mt-1 p-2 bg-zinc-900 rounded text-sm text-amber-300 font-mono">
                        {newKey.clientSecret}
                      </code>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Form */}
        {showCreate && (
          <Card className="mb-6">
            <CardContent>
              <h3 className="font-semibold mb-4">Create New API Key</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Key name (e.g., Production, Development)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <Button onClick={handleCreate} isLoading={creating} disabled={!newKeyName.trim()}>
                  Create
                </Button>
                <Button variant="ghost" onClick={() => { setShowCreate(false); setNewKeyName(""); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="divide-y divide-zinc-800">
              {[1, 2].map((i) => (
                <div key={i} className="py-4 animate-pulse">
                  <div className="h-5 bg-zinc-800 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-zinc-800 rounded w-1/2" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : error && keys.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={loadKeys}>Try Again</Button>
            </CardContent>
          </Card>
        ) : keys.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <p className="text-zinc-400 mb-2">No API keys yet</p>
              <p className="text-zinc-500 text-sm mb-4">Create your first API key to get started</p>
              <Button onClick={() => setShowCreate(true)}>Create API Key</Button>
            </CardContent>
          </Card>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900/50">
                  <tr className="text-left text-xs text-zinc-400 uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Client ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last Used</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {keys.map((key) => (
                    <tr key={key.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-zinc-100 font-medium">{key.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-sm text-zinc-400 font-mono">{key.clientId}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          key.status === "active"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {key.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {key.status === "active" && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRevoke(key.id)}
                            isLoading={revoking === key.id}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function APIKeysPage() {
  return (
    <ProtectedRoute>
      <APIKeysContent />
    </ProtectedRoute>
  );
}
