import React, { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Search, FileText, Plus } from "lucide-react";
import { fetchHistoricalCases } from "../../lib/api";
import type { HistoricalCase } from "../../types/case";
import { FACTOR_METADATA, FACTOR_CATEGORIES } from "../../lib/constants";
import { IngestionWorkflow } from "./IngestionWorkflow";

export const CaseLibraryView: React.FC = () => {
  const [cases, setCases] = useState<HistoricalCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<HistoricalCase | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchHistoricalCases()
      .then((data) => {
        setCases(data);
        if (data.length > 0) setSelectedCase(data[0]);
      })
      .catch((err) => console.error("Failed to load historical cases:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredCases = cases.filter(
    (c) =>
      c.case_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.incident_date.includes(searchQuery) ||
      c.mission_program.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verifiedCases = filteredCases.filter(c => c.verification_status === "VERIFIED");
  const userCases = filteredCases.filter(c => c.verification_status !== "VERIFIED");

  const getOutcomeStyles = (outcome: string) => {
    switch (outcome) {
      case "CATASTROPHIC_FAILURE":
        return "bg-red-500/10 text-red-300 border border-red-500/20";
      case "MISSION_LOSS":
        return "bg-orange-500/10 text-orange-300 border border-orange-500/20";
      case "NEAR_MISS_RECOVERED":
        return "bg-amber-500/10 text-amber-300 border border-amber-500/20";
      case "ADVERSE_EVENT_RECOVERED":
        return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-300 border border-slate-500/20";
    }
  };

  const getOutcomeTextColor = (outcome: string) => {
    switch (outcome) {
      case "CATASTROPHIC_FAILURE": return "text-red-400";
      case "MISSION_LOSS": return "text-orange-400";
      case "NEAR_MISS_RECOVERED": return "text-amber-400";
      case "ADVERSE_EVENT_RECOVERED": return "text-emerald-400";
      default: return "text-slate-400";
    }
  };

  const renderCaseList = (list: HistoricalCase[], title: string) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-3 mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 border-b border-slate-800 pb-2 mb-3">{title}</h3>
        {list.map((c) => {
          const isSelected = selectedCase?.id === c.id;
          const isVerified = c.verification_status === "VERIFIED";

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCase(c)}
              className={`w-full rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? isVerified
                    ? "border-cyan-500/50 bg-slate-900 shadow-md ring-1 ring-cyan-500/30"
                    : "border-amber-500/50 bg-slate-900 shadow-md ring-1 ring-amber-500/30"
                  : isVerified
                    ? "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/40"
                    : "border-slate-800 border-dashed bg-slate-950/40 opacity-80 hover:opacity-100 hover:border-slate-700 hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] text-slate-400">
                    {c.incident_date} • {c.mission_program}
                  </span>
                  <h4 className="font-bold text-sm text-slate-100 mt-0.5">
                    {c.case_name}
                  </h4>
                  {!isVerified && (
                    <span className="inline-block mt-1 font-mono text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                      {c.verification_status}
                    </span>
                  )}
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold shrink-0 ${getOutcomeStyles(c.outcome_type)}`}
                >
                  {c.outcome_type}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {c.situation_summary}
              </p>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            Verified Historical Aerospace Incident Library
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardized, immutable dataset of 5 real-world aerospace flight readiness reviews and outcomes.
          </p>
        </div>

        {/* Actions & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            ADD HISTORICAL CASE
          </button>
          
          <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident name, date..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Case List (5 cols) */}
          <div className="lg:col-span-5 h-[calc(100vh-160px)] overflow-y-auto pr-2 custom-scrollbar">
            {renderCaseList(verifiedCases, "Verified Historical Cases")}
            {renderCaseList(userCases, "User / Organization Cases")}
          </div>

          {/* Right Column: Case Deep Dive (7 cols) */}
          {selectedCase && (
            <div className="lg:col-span-7 h-[calc(100vh-160px)] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-6 custom-scrollbar">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-cyan-400 font-semibold">
                    {selectedCase.id}
                  </span>
                  {selectedCase.verification_status !== "VERIFIED" && (
                    <span className="font-mono text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                      {selectedCase.verification_status}
                    </span>
                  )}
                  <span className="text-slate-600">•</span>
                  <span className="font-mono text-xs text-slate-400">
                    {selectedCase.incident_date}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mt-1">
                  {selectedCase.case_name}
                </h3>
                <p className={`text-xs font-mono mt-1 ${getOutcomeTextColor(selectedCase.outcome_type)}`}>
                  Outcome: {selectedCase.outcome_type}
                </p>
              </div>

              {/* Synopsis */}
              <div className="space-y-1.5">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  Mission Summary
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  {selectedCase.situation_summary}
                </p>
              </div>

              {/* Canonical 8 Factors Profile */}
              <div className="space-y-3">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  Standardized 8-Factor Profile
                </h4>
                <div className="space-y-4">
                  {FACTOR_CATEGORIES.map(category => {
                    const categoryFactors = FACTOR_METADATA.filter(m => m.categoryId === category.id);
                    if (categoryFactors.length === 0) return null;
                    
                    return (
                      <div key={category.id} className="space-y-2">
                        <h5 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800/50 pb-1">
                          {category.name}
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {categoryFactors.map((meta) => {
                            const factorEntry = selectedCase.factors[meta.id];
                            const val = factorEntry?.value;
                            const isActive = meta.isEnum
                              ? val === "HIGH" || val === "MEDIUM"
                              : val === true;

                            return (
                              <div
                                key={meta.id}
                                className={`rounded-lg border p-2.5 text-xs ${
                                  isActive
                                    ? "border-amber-500/30 bg-amber-950/20 text-slate-100"
                                    : "border-slate-800/80 bg-slate-900/30 text-slate-400"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-[11px]">{meta.label}</span>
                                  <span
                                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                      isActive
                                        ? "bg-amber-500/20 text-amber-300"
                                        : "bg-slate-800 text-slate-500"
                                    }`}
                                  >
                                    {val === true ? "PRESENT" : val === false ? "NOT PRESENT" : String(val ?? "N/A")}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Official Citation */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-cyan-400 font-semibold flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    PRIMARY INVESTIGATION REPORT
                  </span>
                  {selectedCase.citation.document_path || selectedCase.citation.public_url ? (
                    <a
                      href={
                        selectedCase.citation.document_path
                          ? `http://127.0.0.1:8000${selectedCase.citation.document_path}`
                          : selectedCase.citation.public_url!
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <span>View PDF</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-[11px] text-slate-500 italic">
                      Source document unavailable online
                    </span>
                  )}
                </div>
                <div className="font-semibold text-slate-200">
                  {selectedCase.citation.report_title}
                </div>
                <div className="text-slate-400">
                  {selectedCase.citation.issuing_body} ({selectedCase.citation.publication_year}) •{" "}
                  <span className="font-mono text-slate-300">{selectedCase.citation.document_number || "Official Record"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <IngestionWorkflow 
          onClose={() => setShowAddModal(false)} 
          onSuccess={(newCase) => {
            setCases([...cases, newCase]);
            setSelectedCase(newCase);
            setShowAddModal(false);
          }} 
        />
      )}
    </div>
  );
};
