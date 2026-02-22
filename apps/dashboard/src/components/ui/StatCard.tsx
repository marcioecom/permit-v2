import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
}

export function StatCard({ label, value, change, changeType = "neutral", icon }: StatCardProps) {
  const changeColors = {
    positive: "text-emerald-500",
    negative: "text-red-500",
    neutral: "text-slate-400",
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <h4 className="text-3xl font-display font-bold text-slate-800">{value}</h4>
        {change && (
          <span className={`text-xs font-bold ${changeColors[changeType]}`}>{change}</span>
        )}
      </div>
    </div>
  );
}
