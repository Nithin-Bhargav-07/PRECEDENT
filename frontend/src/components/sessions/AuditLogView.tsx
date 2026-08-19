import React, { useEffect, useState, useMemo } from "react";
import { Clock, CheckCircle2, XCircle, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { listSessions } from "../../lib/api";
import type { ReviewSessionSummary } from "../../types/review";

const ITEMS_PER_PAGE = 25;

export const AuditLogView: React.FC = () => {
  const [sessions, setSessions] = useState<ReviewSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [precedentFilter, setPrecedentFilter] = useState("All Precedents");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    listSessions()
      .then((data) => setSessions(data))
      .catch((err) => console.error("Failed to load audit sessions:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const uniquePrecedents = useMemo(() => {
    const precedents = new Set<string>();
    sessions.forEach(s => {
      if (s.top_matched_case_names) {
        s.top_matched_case_names.forEach(name => precedents.add(name));
      }
    });
    return Array.from(precedents).sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      // 1. Status Filter
      if (statusFilter !== "All Status") {
        if (statusFilter === "Pending" && s.audit_action !== "PENDING") return false;
        if (statusFilter === "Acknowledged" && s.audit_action !== "ACKNOWLEDGED") return false;
        if (statusFilter === "Dismissed" && s.audit_action !== "DISMISSED") return false;
      }

      // 2. Precedent Filter
      if (precedentFilter !== "All Precedents") {
        if (!s.top_matched_case_names || !s.top_matched_case_names.includes(precedentFilter)) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSessionId = s.session_id.toLowerCase().includes(query);
        const matchesTitle = s.title.toLowerCase().includes(query);
        const matchesContext = (s.mission_context || "").toLowerCase().includes(query);
        const matchesPrecedent = (s.top_matched_case_names || []).some(name => name.toLowerCase().includes(query));
        
        if (!matchesSessionId && !matchesTitle && !matchesContext && !matchesPrecedent) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, statusFilter, precedentFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / ITEMS_PER_PAGE));

  // Auto-reset page if filtering leaves us out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredSessions.length, totalPages, currentPage]);

  const currentSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSessions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSessions, currentPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-cyan-400" />
            Flight Readiness Review Board Audit Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable audit record of all evaluated flight reviews, matched precedents, and formal engineer sign-offs.
          </p>
        </div>

        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 font-mono text-xs text-slate-400">
          Total Logged Sessions: <strong className="text-cyan-400">{sessions.length}</strong>
        </div>
      </div>
      
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions, subjects, or precedents..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none w-full sm:w-auto"
        >
          <option value="All Status">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Dismissed">Dismissed</option>
        </select>
        <select 
          value={precedentFilter} 
          onChange={(e) => setPrecedentFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none w-full sm:w-auto max-w-[200px] truncate"
        >
          <option value="All Precedents">All Precedents</option>
          {uniquePrecedents.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : currentSessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400 space-y-2">
          <FileText className="h-8 w-8 text-slate-600 mx-auto" />
          <h3 className="font-semibold text-slate-200">No Review Sessions Logged Yet</h3>
          <p className="text-xs max-w-sm mx-auto">
            Execute a precedent analysis in the Review Workspace and submit a formal audit sign-off to populate the audit record.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Session ID / Timestamp</th>
                <th className="px-5 py-3.5">Flight Review Subject</th>
                <th className="px-5 py-3.5">Precedent Status</th>
                <th className="px-5 py-3.5">Top Precedent / Match</th>
                <th className="px-5 py-3.5 text-right">Formal Audit Sign-Off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {currentSessions.map((s) => (
                <tr key={s.session_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-200">{s.session_id}</div>
                    <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-100">{s.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{s.mission_context}</div>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold ${
                        s.status === "PRECEDENT_FOUND"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {s.top_matched_case_names && s.top_matched_case_names.length > 0 ? (
                      <div>
                        {s.top_matched_case_names.length > 1 ? (
                          <>
                            <div className="text-[10px] font-bold text-amber-400 mb-0.5">TIED PRIMARY PRECEDENTS</div>
                            <div className="font-semibold text-slate-200">{s.top_matched_case_names.join(" & ")}</div>
                          </>
                        ) : (
                          <div className="font-semibold text-slate-200">{s.top_matched_case_names[0]}</div>
                        )}
                        <div className="font-mono text-[10px] text-cyan-400 mt-0.5">
                          {s.overlap_score ?? 0} overlap score · {s.category_breadth}/4 categories
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">None (Abstained)</span>
                    )}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono font-bold ${
                        s.audit_action === "ACKNOWLEDGED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : s.audit_action === "DISMISSED"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {s.audit_action === "ACKNOWLEDGED" && <CheckCircle2 className="h-3 w-3" />}
                      {s.audit_action === "DISMISSED" && <XCircle className="h-3 w-3" />}
                      {s.audit_action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/50 px-5 py-3">
              <div className="text-xs text-slate-400 font-mono">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredSessions.length)}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)} of {filteredSessions.length}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-7 w-7 rounded text-xs font-bold transition-colors ${
                      currentPage === page
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
