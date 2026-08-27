import React, { useEffect, useState } from "react";
import { ArrowLeft, Activity, ShieldCheck, Database } from "lucide-react";
import { getReviewSession } from "../../lib/api";
import type { ReviewSessionRecord, PrecedentAnalysisResult } from "../../types/review";
import { FACTOR_METADATA } from "../../lib/constants";
import { PrecedentResultsPanel } from "../results/PrecedentResultsPanel";

interface AuditSessionDetailViewProps {
  sessionId: string;
  onBack: () => void;
}

export const AuditSessionDetailView: React.FC<AuditSessionDetailViewProps> = ({
  sessionId,
  onBack,
}) => {
  const [record, setRecord] = useState<ReviewSessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getReviewSession(sessionId)
      .then((data) => setRecord(data))
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (errorMsg || !record) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-12 text-center">
        <h3 className="font-semibold text-red-400">Failed to load audit session</h3>
        <p className="text-sm text-red-300 mt-2">{errorMsg || "Session not found"}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">
          Back to Audit Log
        </button>
      </div>
    );
  }

  // Map the persisted SessionAnalysisSummary to a PrecedentAnalysisResult
  let analysisResult: PrecedentAnalysisResult | null = null;
  if (record.analysis_result) {
    const isTied = (record.analysis_result.matched_cases || []).filter(m => m.is_primary).length > 1;
    
    // Fallback confidence for legacy sessions
    const fallbackConfidence = {
      level: "NONE" as const,
      overlap_metric: "Unknown",
      matched_critical_factors_count: 0,
      total_critical_factors_count: 0,
      rationale: "Confidence information unavailable for this legacy session."
    };

    analysisResult = {
      session_id: record.session_id,
      status: record.analysis_result.status,
      matched_cases: record.analysis_result.matched_cases || [],
      counter_evidence: record.analysis_result.counter_evidence || [],
      confidence: record.analysis_result.confidence || fallbackConfidence,
      grounded_explanation: record.analysis_result.grounded_explanation || null,
      abstention_detail: record.analysis_result.abstention_detail || null,
      is_exact_tie: isTied,
      evaluated_at: record.created_at,
      disclaimer: "HISTORICAL AUDIT RECORD — READ ONLY",
    };
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-slate-600 hover:text-white transition-all shadow-sm group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform text-cyan-400" />
            <span>Back to Audit Log</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800/80 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                HISTORICAL RECORD
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 mt-0.5">
              Audit Session Detail
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-slate-500">SESSION:</span>
            <span className="font-semibold text-emerald-400">{record.session_id}</span>
          </div>
        </div>
      </div>

      {/* 2. Metadata & Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4 font-mono">
            Situation Input
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Title</div>
              <div className="text-sm font-semibold text-slate-200">{record.input.title}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Mission Context</div>
              <div className="text-sm text-slate-300">{record.input.mission_context}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4 font-mono">
            Audit Metadata
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Created At</div>
              <div className="text-sm text-slate-300 font-mono">{new Date(record.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Review Board</div>
              <div className="text-sm text-slate-300">{record.submitter.review_board}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Sign-Off Status</div>
              <div className="text-sm font-mono">
                {record.audit_action ? (
                  <span className={`inline-flex px-2 py-0.5 rounded border font-bold text-xs ${
                    record.audit_action.action === "ACKNOWLEDGED" 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }`}>
                    {record.audit_action.action}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">PENDING</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Factor Provenance */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
          <span className="h-5 w-1.5 bg-cyan-500 rounded-full"></span>
          Factor Provenance
        </h3>
        <p className="text-sm text-slate-400 max-w-3xl">
          Historical record of the extracted factor values and any manual modifications applied by the reviewing engineer before deterministic evaluation.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {Object.values(record.extracted_factors).map((f) => {
            const meta = FACTOR_METADATA.find(m => m.id === f.factor_id);
            const label = meta?.label || f.factor_id;
            
            const renderVal = (v: any) => {
              if (v === null || v === undefined) return "N/A";
              if (typeof v === "boolean") return v ? "Active" : "Nominal";
              const strVal = String(v);
              return strVal.charAt(0).toUpperCase() + strVal.slice(1).toLowerCase();
            };

            const extractedVal = renderVal(f.extracted_value);
            const finalVal = renderVal(f.value);
            const isModified = f.is_user_modified;

            return (
              <div key={f.factor_id} className={`rounded-xl p-4 border relative ${
                isModified 
                  ? "bg-cyan-950/30 border-cyan-500/40" 
                  : "bg-slate-900/40 border-slate-800/80"
              }`}>
                {isModified && (
                  <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                    <span className="bg-cyan-900 text-cyan-300 border border-cyan-500/50 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shadow">
                      Modified
                    </span>
                  </div>
                )}
                <div className="font-semibold text-sm text-slate-200 mb-3 pr-4">{label}</div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="uppercase text-[9px] tracking-wider">AI Extracted</span>
                    <span>{extractedVal}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="uppercase text-[9px] tracking-wider text-slate-400">Final Evaluated</span>
                    <span className={`font-bold ${isModified ? "text-cyan-400" : "text-slate-300"}`}>
                      {finalVal}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Precedent Analysis Results Replay */}
      {analysisResult ? (
        <div className="pt-8 border-t border-slate-800 relative">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 bg-slate-950 px-4">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest border border-slate-800 bg-slate-900 rounded-full px-3 py-1">
              Historical Analysis Output
            </span>
          </div>
          <PrecedentResultsPanel
            result={analysisResult}
            sessionId={record.session_id}
            factors={record.extracted_factors}
            existingAuditAction={record.audit_action}
          />
        </div>
      ) : (
        <div className="pt-8 border-t border-slate-800">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
            <Activity className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-300">No Analysis Available</h3>
            <p className="text-xs mt-1">This session was created but never evaluated.</p>
          </div>
        </div>
      )}
    </div>
  );
};
