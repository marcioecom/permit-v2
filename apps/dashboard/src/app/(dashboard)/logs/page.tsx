"use client";

import { Badge, Button, GlassCard, Pagination } from "@/components/ui";
import { useAuthLogs, useProjects, type AuthLog } from "@/hooks";
import { IconAlertTriangle, IconArchive, IconBan, IconBrandGithub, IconBrandGoogle, IconCalendar, IconChartBar, IconCode, IconFilter, IconKey, IconLogin, IconMail, IconRefresh } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function LogsPage() {
  const { projects } = useProjects();
  const {
    logs,
    meta,
    isLoading,
    isFetching,
    refetch,
    page,
    setPage,
    projectId,
    setProjectId,
    eventType,
    setEventType,
    dateRange,
    setDateRange,
  } = useAuthLogs();

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
      <IconRefresh className="w-4 h-4" />
    </motion.div>
  );

  const getEventIcon = (type: string) => {
    if (type?.includes("success") || type?.includes("login")) {
      return (
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <IconLogin className="w-4 h-4" />
        </div>
      );
    }
    if (type?.includes("fail") || type?.includes("invalid")) {
      return (
        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
          <IconBan className="w-4 h-4" />
        </div>
      );
    }
    if (type?.includes("otp") || type?.includes("pending")) {
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <IconAlertTriangle className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
        <IconKey className="w-4 h-4" />
      </div>
    );
  };

  const getStatusBadge = (status: AuthLog["status"]) => {
    switch (status) {
      case "SUCCESS":
        return <Badge variant="success">Success</Badge>;
      case "FAILED":
        return <Badge variant="error">Failed</Badge>;
      case "OTP_SENT":
        return <Badge variant="warning">OTP Sent</Badge>;
      case "EXPIRED":
        return <Badge variant="warning">Expired</Badge>;
      default:
        return <Badge variant="info">Info</Badge>;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <IconChartBar className="w-4 h-4" />
            Observability
          </div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-1">Auth Logs</h1>
          <p className="text-slate-500">Real-time stream of authentication events across all your projects.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={refreshIcon} onClick={() => refetch()}>
            Live Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <GlassCard className="mb-8 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-0 sm:min-w-[200px] relative">
          <IconFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full bg-slate-50 border-transparent rounded-lg py-2 pl-10 pr-4 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Event Types</option>
            <option value="login">Login</option>
          </select>
        </div>

        <div className="flex-1 min-w-0 sm:min-w-[200px] relative">
          <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="w-full bg-slate-50 border-transparent rounded-lg py-2 pl-10 pr-4 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div className="flex-1 min-w-0 sm:min-w-[200px] relative">
          <IconArchive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-slate-50 border-transparent rounded-lg py-2 pl-10 pr-4 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setEventType("");
            setDateRange("24h");
            setProjectId("");
          }}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 px-4"
        >
          Clear Filters
        </button>
      </GlassCard>

      {/* Logs Table */}
      <GlassCard className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User / Project</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">IP Address</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getEventIcon(log.eventType)}
                        <span className="text-sm font-bold text-slate-800">{log.eventType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{log.userEmail}</span>
                        <span className="text-[10px] text-slate-400">{log.projectName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        {log.authProvider === "google" ? (
                          <IconBrandGoogle className="w-3.5 h-3.5" />
                        ) : log.authProvider === "github" ? (
                          <IconBrandGithub className="w-3.5 h-3.5" />
                        ) : (
                          <IconMail className="w-3.5 h-3.5" />
                        )}
                        <span className="capitalize">{log.authProvider || "email"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">{log.ipAddress}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-[var(--accent)] transition-colors">
                        <IconCode className="w-5 h-5" />
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
          <div className="p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium">
              Showing 1-{logs.length} of {meta.total} events
            </span>
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
