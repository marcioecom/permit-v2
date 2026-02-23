"use client";

import { useSelectedEnvironment } from "@/hooks/useSelectedEnvironment";
import { IconChevronDown, IconCircleFilled } from "@tabler/icons-react";
import { useRef, useState } from "react";

interface EnvironmentSwitcherProps {
  projectId: string;
}

export function EnvironmentSwitcher({ projectId }: EnvironmentSwitcherProps) {
  const { environment, environments, setEnvironment } = useSelectedEnvironment(projectId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!environment) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget)) {
            setOpen(false);
          }
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
      >
        <IconCircleFilled className="w-2.5 h-2.5" style={{ color: environment.color }} />
        {environment.name}
        <IconChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[160px]">
          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => {
                setEnvironment(env.id);
                setOpen(false);
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
        </div>
      )}
    </div>
  );
}
