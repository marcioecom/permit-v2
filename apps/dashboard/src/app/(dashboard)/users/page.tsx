"use client";

import { Badge, Button, GlassCard, Pagination, StatCard } from "@/components/ui";
import { useProjectUsers, useProjects, useUserStats } from "@/hooks";
import { IconDotsVertical, IconMail, IconRefresh, IconSearch } from "@tabler/icons-react";
import Avatar from "boring-avatars";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function UsersPage() {
  const { projects } = useProjects();
  const { stats: userStats, isLoading: statsLoading } = useUserStats();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const {
    users,
    meta,
    isLoading,
    isFetching,
    search,
    setSearch,
    page,
    setPage,
    refetch,
  } = useProjectUsers(selectedProjectId);

  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (isFetching) {
      setSpinning(true);
    }
  }, [isFetching]);

  useEffect(() => {
    if (spinning && !isFetching) {
      const timer = setTimeout(() => setSpinning(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [spinning, isFetching]);

  const refreshIcon = (
    <motion.div
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={spinning ? { repeat: Infinity, duration: 0.75, ease: "linear" } : { duration: 0 }}
    >
      <IconRefresh className="w-3.5 h-3.5" />
    </motion.div>
  );

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "suspended":
        return <Badge variant="error">Suspended</Badge>;
      default:
        return <Badge variant="neutral">{status || "Unknown"}</Badge>;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-1">User Management</h1>
          <p className="text-slate-500">Directory of all identities registered across your active projects.</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={statsLoading ? "..." : userStats?.totalUsers ?? 0} changeType="neutral" />
        <StatCard label="Active (24h)" value={statsLoading ? "..." : userStats?.activeIn24h ?? 0} changeType="positive" />
        <StatCard label="Verification Rate" value={statsLoading ? "..." : userStats?.verificationRate ?? "N/A"} change="Stable" changeType="neutral" />
        <StatCard label="Blocked" value={statsLoading ? "..." : userStats?.blockedUsers ?? 0} changeType="neutral" />
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden !p-0">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="bg-slate-50 border-slate-100 focus:bg-white focus:ring-0 rounded-lg py-1.5 pl-9 pr-4 text-xs w-full sm:w-64"
              />
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg border-none"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" icon={refreshIcon} onClick={() => refetch()}>
              Refresh
            </Button>
            <p className="text-xs text-slate-400">
              Showing <span className="text-slate-900 font-bold">{users.length}</span> of {meta.total} users
            </p>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Auth Method</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Last Login</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={`${user.projectName}-${user.id}`} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          size={36}
                          name={user.email}
                          variant="beam"
                          colors={["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1e40af"]}
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{user.name || "Unknown"}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600">{user.projectName || "\u2014"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <IconMail className="w-4 h-4" />
                        {user.authMethod || "Email"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge("active")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-xs text-slate-600">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <IconDotsVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
            />
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rows per page</span>
              <select className="bg-white border-slate-200 rounded-lg text-xs py-1 px-3 focus:ring-0">
                <option>50</option>
                <option>100</option>
                <option>250</option>
              </select>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
