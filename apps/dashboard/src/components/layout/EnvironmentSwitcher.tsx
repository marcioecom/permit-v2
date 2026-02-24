"use client";

import { useEnvironments } from "@/hooks/useEnvironments";
import { useSelectedEnvironment } from "@/hooks/useSelectedEnvironment";
import { IconChevronDown, IconCircleFilled, IconPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";

interface EnvironmentSwitcherProps {
  projectId: string;
}

export function EnvironmentSwitcher({ projectId }: EnvironmentSwitcherProps) {
  const { environment, environments, setEnvironment } = useSelectedEnvironment(projectId);
  const { createEnvironment } = useEnvironments(projectId);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("staging");
  const ref = useRef<HTMLDivElement>(null);

  if (!environment) return null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const env = await createEnvironment.mutateAsync({ name: newName.trim(), type: newType });
      setEnvironment(env.id);
      setCreating(false);
      setNewName("");
      setNewType("staging");
      setOpen(false);
    } catch {
      // mutation error handled by react-query
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget)) {
            setOpen(false);
            setCreating(false);
          }
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
      >
        <IconCircleFilled className="w-2.5 h-2.5" style={{ color: environment.color }} />
        {environment.name}
        <IconChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[200px]">
          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => {
                setEnvironment(env.id);
                setOpen(false);
                setCreating(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                env.id === environment.id
                  ? "bg-slate-50 text-slate-900 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <IconCircleFilled className="w-2.5 h-2.5" style={{ color: env.color }} />
              {env.name}
            </button>
          ))}

          <div className="border-t border-slate-100 mt-1 pt-1">
            {!creating ? (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <IconPlus className="w-3 h-3" />
                New Environment
              </button>
            ) : (
              <div className="px-3 py-2 space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Environment name"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-200 focus:border-blue-300 outline-none bg-white"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setCreating(false); setNewName(""); }}
                    className="flex-1 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || createEnvironment.isPending}
                    className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createEnvironment.isPending ? "..." : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
