"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { dashboardApi, ProjectUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function ProjectUsersContent() {
  const params = useParams();
  const projectId = params.id as string;
  const { accessToken, logout, user } = useAuth();
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    if (accessToken && projectId) {
      loadUsers();
    }
  }, [accessToken, projectId, page, search]);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await dashboardApi.listProjectUsers(accessToken!, projectId, { page, limit: 20, search });
      setUsers(res.data);
      setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  const navItems = [
    { href: `/projects/${projectId}`, label: "Overview" },
    { href: `/projects/${projectId}/users`, label: "Users", active: true },
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
            <h1 className="text-2xl font-bold text-zinc-100">Users</h1>
            <p className="text-zinc-400 mt-1">{meta.total} users in this project</p>
          </div>
          <div className="w-72">
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="divide-y divide-zinc-800">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="py-4 animate-pulse">
                  <div className="h-5 bg-zinc-800 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-zinc-800 rounded w-1/4" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={loadUsers}>Try Again</Button>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-zinc-400">{search ? "No users found matching your search" : "No users yet"}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-900/50">
                    <tr className="text-left text-xs text-zinc-400 uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Auth Method</th>
                      <th className="px-4 py-3 font-medium">Logins</th>
                      <th className="px-4 py-3 font-medium">Last Login</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-zinc-100">{u.email}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{u.name || "-"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300">
                            {u.authMethod || "email"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{u.loginCount}</td>
                        <td className="px-4 py-3 text-zinc-400">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-zinc-400">
                  Page {page} of {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function ProjectUsersPage() {
  return (
    <ProtectedRoute>
      <ProjectUsersContent />
    </ProtectedRoute>
  );
}
