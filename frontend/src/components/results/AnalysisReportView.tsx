import React from "react";
import { ArrowLeft, FileText, Cpu, ShieldCheck } from "lucide-react";
import type { PrecedentAnalysisResult } from "../../types/review";
import type { ExtractedFactorItem } from "../../types/factors";
import { FACTOR_METADATA } from "../../lib/constants";
import { PrecedentResultsPanel } from "./PrecedentResultsPanel";

interface AnalysisReportViewProps {
  title: string;
  missionContext: string;
  factors: Record<string, ExtractedFactorItem>;
  sessionId: string;
  analysisResult: PrecedentAnalysisResult;
  onBackToReview: () => void;
  onAuditActionSuccess: () => void;
}

export const AnalysisReportView: React.FC<AnalysisReportViewProps> = ({
  title,
  missionContext,
  factors,
  sessionId,
  analysisResult,
  onBackToReview,
  onAuditActionSuccess,
}) => {
  // Collect active factors for the compact summary
  const activeFactors = Object.entries(factors)
    .filter(([_, item]) => {
      if (typeof item.value === "boolean") return item.value;
      if (typeof item.value === "string") return item.value === "HIGH" || item.value === "MEDIUM";
      return false;
    })
    .map(([factorId, item]) => {
      const meta = FACTOR_METADATA.find((m) => m.id === factorId);
      return {
        id: factorId,
        label: meta?.label ?? factorId,
        categoryId: meta?.categoryId ?? "OTHER",
        value: item.value,
        isUserModified: item.is_user_modified,
      };
    });

  const getCategoryColor = (catId: string) => {
    switch (catId) {
      case "TECHNICAL":
        return "bg-cyan-500/10 text-cyan-300 border-cyan-500/30";
      case "ENVIRONMENTAL":
        return "bg-blue-500/10 text-blue-300 border-blue-500/30";
      case "HUMAN":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "PROCESS":
        return "bg-purple-500/10 text-purple-300 border-purple-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToReview}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-slate-600 hover:text-white transition-all shadow-sm group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform text-cyan-400" />
            <span>Back to Review & Factors</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300 font-semibold">
                INVESTIGATION REPORT
              </span>
              <span className="font-mono text-xs text-slate-400">
                FRR Analysis Output
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 mt-0.5">
              Deterministic Precedent Analysis & Grounded Synthesis
            </h1>
          </div>
        </div>

        {/* Session ID & Deterministic Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-500">SESSION:</span>
            <span className="font-semibold text-cyan-400">{sessionId}</span>
          </div>
        </div>
      </div>

      {/* 2. Compact Mission Summary Panel (Preserves User Inputs Context without repeating full form) */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-lg backdrop-blur space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <h3 className="font-semibold text-sm text-slate-200 uppercase tracking-wider font-mono">
              Flight Review Input Summary
            </h3>
          </div>

          <button
            type="button"
            onClick={onBackToReview}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline underline-offset-2"
          >
            Edit Inputs / Modify Factors →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Review Subject / Title
            </span>
            <p className="text-sm font-semibold text-slate-100">
              {title || "Untitled Flight Review"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Mission Context / Review Board
            </span>
            <p className="text-sm text-slate-300 font-mono">
              {missionContext || "Not specified"}
            </p>
          </div>
        </div>

        {/* Active Factors Chips */}
        <div className="pt-2 border-t border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              Active Factors Evaluated ({activeFactors.length} of 8 Active)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Deterministic Reasoning Inputs
            </span>
          </div>

          {activeFactors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeFactors.map((f) => (
                <span
                  key={f.id}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono font-medium ${getCategoryColor(
                    f.categoryId
                  )}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>{f.label}</span>
                  {typeof f.value === "string" && (
                    <span className="text-[10px] opacity-75">({f.value})</span>
                  )}
                  {f.isUserModified && (
                    <span className="text-[9px] rounded bg-cyan-950 px-1 text-cyan-300 border border-cyan-500/30">
                      Modified
                    </span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Zero active factors specified (evaluates to baseline abstention).
            </p>
          )}
        </div>
      </div>

      {/* 3. Comprehensive Precedent Analysis, Citations, Counter-Evidence & Audit Sign-Off */}
      <PrecedentResultsPanel
        result={analysisResult}
        sessionId={sessionId}
        factors={factors}
        onAuditActionSuccess={onAuditActionSuccess}
      />
    </div>
  );
};
