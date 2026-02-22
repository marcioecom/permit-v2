export function Footer() {
  return (
    <footer className="p-6 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
      <div className="flex gap-8">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          API Status: Operational
        </div>
        <div>v2.4.1 stable</div>
      </div>
      <div className="flex gap-6">
        <a href="#" className="hover:text-slate-600">Terms</a>
        <a href="#" className="hover:text-slate-600">Privacy</a>
        <a href="#" className="hover:text-slate-600">Status Page</a>
      </div>
    </footer>
  );
}
