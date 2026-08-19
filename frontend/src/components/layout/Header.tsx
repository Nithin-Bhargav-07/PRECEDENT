import { Shield, BookOpen, Clock, Activity, Home } from "lucide-react";

export type AppView = "landing" | "workspace" | "cases" | "sessions";

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  activeSessionId?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  activeSessionId,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/95 text-slate-100 backdrop-blur sticky top-0 z-50 shadow-md">
      {/* Main Navigation Bar */}
      <div className="mx-auto flex max-w-[95vw] 2xl:max-w-[1800px] items-center justify-between px-6 py-3.5">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onViewChange("landing")}
          className="flex items-center gap-3 text-left group transition-all"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 shadow-inner group-hover:border-cyan-400 transition-colors">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold tracking-wider text-slate-100 group-hover:text-cyan-300 transition-colors">
                PRECEDENT
              </span>
              <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-cyan-400 border border-cyan-500/20">
                AEROSPACE FRR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Deterministic Aerospace Precedent Analysis • Powered by IBM Granite
            </p>
          </div>
        </button>

        {/* View Tabs */}
        <div className="flex items-center gap-2">
          <nav className="flex rounded-lg bg-slate-900/90 p-1 border border-slate-800">
            <button
              onClick={() => onViewChange("landing")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                currentView === "landing"
                  ? "bg-slate-800 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Overview</span>
            </button>
            <button
              onClick={() => onViewChange("workspace")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
                currentView === "workspace"
                  ? "bg-cyan-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Review Workspace</span>
            </button>
            <button
              onClick={() => onViewChange("cases")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                currentView === "cases"
                  ? "bg-cyan-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Case Base</span>
            </button>
            <button
              onClick={() => onViewChange("sessions")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                currentView === "sessions"
                  ? "bg-cyan-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Audit Log</span>
            </button>
          </nav>

          {activeSessionId && currentView !== "landing" && (
            <div className="ml-2 hidden lg:flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 font-mono text-[11px] text-slate-400">
              <span className="text-slate-500">SESSION:</span>
              <span className="font-semibold text-cyan-400">{activeSessionId}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
