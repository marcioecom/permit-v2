interface BadgeProps {
  variant: "success" | "warning" | "error" | "info" | "neutral";
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  const styles = {
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    error: "bg-red-50 text-red-600 border-red-100",
    info: "bg-blue-50 text-blue-600 border-blue-100",
    neutral: "bg-slate-50 text-slate-400 border-slate-100",
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border text-nowrap ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
