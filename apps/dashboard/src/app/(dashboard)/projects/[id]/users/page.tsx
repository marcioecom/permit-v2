"use client";

import { ProjectTabs } from "@/components/layout";
import { Badge, GlassCard, Pagination } from "@/components/ui";
import { useProject, useProjectUsers } from "@/hooks";
import { IconSearch } from "@tabler/icons-react";
import Avatar from "boring-avatars";
import { useParams } from "next/navigation";

export default function ProjectUsersPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { project } = useProject(projectId);
  const {
    users,
    meta,
    isLoading,
    search,
    setSearch,
    page,
    setPage,
  } = useProjectUsers(projectId);

  return (
    <div>
      <ProjectTabs projectId={projectId} projectName={project?.name} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-1">Users</h1>
          <p className="text-slate-500">{meta.total} users in this project</p>
        </div>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden !p-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="bg-slate-50 border-slate-100 focus:bg-white focus:ring-0 rounded-lg py-1.5 pl-9 pr-4 text-xs w-full sm:w-64"
            />
          </div>
          <p className="text-xs text-slate-400">
            Showing <span className="text-slate-900 font-bold">{users.length}</span> of {meta.total}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Auth Method</th>
                <th className="px-6 py-4">Logins</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    {search ? "No users found matching your search" : "No users yet"}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          size={36}
                          name={u.email}
                          variant="beam"
                          colors={["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1e40af"]}
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{u.name || "Unknown"}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="info">{u.authMethod || "email"}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{u.loginCount}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </GlassCard>
    </div>
  );
}
