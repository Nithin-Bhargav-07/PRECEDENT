import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, User, Clock } from "lucide-react";
import { recordAuditAction } from "../../lib/api";
import type { AuditActionType, PrecedentAnalysisResult } from "../../types/review";

interface AuditSignOffPanelProps {
  sessionId: string;
  result: PrecedentAnalysisResult;
  onAuditActionSuccess: (action: string, notes?: string) => void;
}

export const AuditSignOffPanel: React.FC<AuditSignOffPanelProps> = ({
  sessionId,
  result,
  onAuditActionSuccess,
}) => {
  const [selectedAction, setSelectedAction] = useState<AuditActionType | null>(null);
  const [engineerNotes, setEngineerNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAction, setSubmittedAction] = useState<AuditActionType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submissionTime, setSubmissionTime] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) {
      setErrorMsg("Please select a disposition.");
      return;
    }
    if (!engineerNotes.trim()) {
      setErrorMsg("Engineer rationale is required.");
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await recordAuditAction(sessionId, {
        session_id: sessionId,
        action: selectedAction,
        engineer_notes: engineerNotes.trim() || undefined,
      });

      setIsSubmitted(true);
      setSubmittedAction(selectedAction);
      setSubmissionTime(response.recorded_at);
      onAuditActionSuccess(selectedAction, engineerNotes);
    } catch (err: any) {
      console.error("Failed to record audit action:", err);
      setErrorMsg(`Failed to record audit action: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPrecedentFound = result.status === "PRECEDENT_FOUND";
  const topMatch = result.matched_cases && result.matched_cases.length > 0 ? result.matched_cases[0] : null;
  const tiedMatches = result.matched_cases?.filter(m => m.is_primary) || [];
  const hasCounterEvidence = result.counter_evidence && result.counter_evidence.length > 0;

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-800/60 pb-4">
          <div className="flex-1 border-t border-slate-800/60"></div>
          <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest px-2 flex items-center gap-2">
            <ShieldCheck className="h-3 w-3" />
            DECISION RECORDED
          </span>
          <div className="flex-1 border-t border-slate-800/60"></div>
        </div>
        
        <div className="rounded-2xl border border-emerald-900/50 bg-slate-900/60 p-8 shadow-xl backdrop-blur max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
          
          <div className="mb-6 flex justify-between items-start border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-100 uppercase mb-1">
                AUDIT RECORD
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-400 font-mono">
                <span>Session / Review ID:</span>
                <span className="text-slate-200">{sessionId}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-2 py-1 text-[10px] font-mono font-bold text-slate-400 uppercase border border-slate-800">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                STATUS: LOCKED / IMMUTABLE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <span className="block text-[10px] font-mono text-emerald-500/70 uppercase tracking-wider mb-1.5">ENGINEER DISPOSITION</span>
                <div className="flex items-center gap-2">
                  {submittedAction === "ACKNOWLEDGED" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-slate-400" />
                  )}
                  <span className={`font-bold uppercase tracking-wide text-lg ${submittedAction === "ACKNOWLEDGED" ? "text-emerald-400" : "text-slate-300"}`}>
                    {submittedAction}
                  </span>
                </div>
              </div>
              
              <div>
                <span className="block text-[10px] font-mono text-emerald-500/70 uppercase tracking-wider mb-1.5">RECORDED BY</span>
                <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                  <User className="h-4 w-4 text-emerald-500/70" />
                  Reviewing Engineer
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-mono text-emerald-500/70 uppercase tracking-wider mb-1.5">RECORDED AT</span>
                <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                  <Clock className="h-4 w-4 text-emerald-500/70" />
                  {submissionTime ? new Date(submissionTime).toLocaleString() : "Unknown"}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {topMatch && (
                <div className="space-y-6">
                  <div>
                    <span className="block text-[10px] font-mono text-emerald-500/70 uppercase tracking-wider mb-1.5">DETERMINISTIC SUMMARY</span>
                    {tiedMatches.length > 1 ? (
                      <>
                        <div className="text-[10px] font-bold text-amber-400 mb-0.5">TIED PRIMARY PRECEDENTS</div>
                        <div className="text-sm text-slate-200 font-semibold">{tiedMatches.map(m => m.case_name).join(" & ")}</div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-200 font-semibold">{topMatch.case_name}</div>
                    )}
                    <div className="text-[12px] font-mono text-slate-400 mt-1">
                      {topMatch.shared_factors.length}/8 overlap · {Object.values(topMatch.category_overlap || {}).filter(c => c > 0).length}/4 categories
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-emerald-500/70 uppercase tracking-wider mb-1.5">PRIMARY REFERENCE</span>
                    {tiedMatches.map(m => (
                      <div key={m.case_id} className="text-[12px] font-mono text-slate-400">
                        {m.citation.id} — {m.citation.report_title}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 h-full">
                <span className="block text-[10px] font-mono text-emerald-500/70 uppercase tracking-wider mb-2">ENGINEER RATIONALE</span>
                <div className="rounded-xl bg-slate-950/80 p-5 border border-slate-800 min-h-[100px]">
                  <p className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                    {engineerNotes || <span className="text-slate-600 italic">No rationale provided.</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* DECISION BOUNDARY */}
      <div className="flex flex-col items-center justify-center space-y-3 opacity-90 pt-8">
        <div className="w-full flex items-center gap-4">
          <div className="flex-1 border-t border-slate-700/60"></div>
          <span className="font-mono text-xs text-slate-400 font-bold uppercase tracking-widest text-center">
            SYSTEM ANALYSIS COMPLETE
          </span>
          <div className="flex-1 border-t border-slate-700/60"></div>
        </div>
        <p className="text-[11px] text-slate-500 text-center font-mono uppercase tracking-wide">
          Historical precedent and counter-evidence reviewed.<br/>
          Final disposition belongs to the engineer.
        </p>
        <div className="w-full max-w-md border-t border-slate-800/60 mt-1"></div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-8 shadow-2xl max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 uppercase">
            ENGINEERING JUDGMENT
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            PRECEDENT provides historical evidence and deterministic analysis. Final disposition remains with the reviewing engineer.
          </p>
        </div>

        {/* DETERMINISTIC ASSESSMENT SUMMARY */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 mb-4">
            DETERMINISTIC ASSESSMENT
          </h3>
          {isPrecedentFound && topMatch ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 md:col-span-1">
                <span className="block text-[10px] uppercase text-slate-500 font-mono mb-1">
                  {tiedMatches.length > 1 ? "Tied Primary Precedents" : "Primary Precedent"}
                </span>
                <span className="text-sm font-bold text-slate-200">
                  {tiedMatches.map(m => m.case_name).join(" & ")}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-slate-500 font-mono mb-1">Factor Overlap</span>
                <span className="text-sm font-mono text-slate-300">{topMatch.shared_factors.length} / 8</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-slate-500 font-mono mb-1">Category Breadth</span>
                <span className="text-sm font-mono text-slate-300">
                  {Object.values(topMatch.category_overlap || {}).filter(c => c > 0).length} / 4
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-slate-500 font-mono mb-1">Counter-Evidence</span>
                <span className="text-sm font-mono text-slate-300">
                  {hasCounterEvidence ? "Available" : "None"}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-300 font-mono">No strong historical precedent was identified.</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 pt-2">
          
          {/* DISPOSITION CONTROLS */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200">
                Does this historical precedent materially inform your engineering judgment?
              </h3>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedAction("ACKNOWLEDGED")}
                className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all ${
                  selectedAction === "ACKNOWLEDGED"
                    ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400 shadow-md"
                    : "border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:bg-slate-900/50"
                }`}
              >
                <CheckCircle2 className={`h-6 w-6 mb-2 ${selectedAction === "ACKNOWLEDGED" ? "text-emerald-400" : "text-slate-500"}`} />
                <strong className="text-sm tracking-wide font-bold uppercase">ACKNOWLEDGE PRECEDENT</strong>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("DISMISSED")}
                className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all ${
                  selectedAction === "DISMISSED"
                    ? "border-slate-400/50 bg-slate-800/50 text-slate-200 shadow-md"
                    : "border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:bg-slate-900/50"
                }`}
              >
                <XCircle className={`h-6 w-6 mb-2 ${selectedAction === "DISMISSED" ? "text-slate-200" : "text-slate-500"}`} />
                <strong className="text-sm tracking-wide font-bold uppercase">DISMISS PRECEDENT</strong>
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mt-4 text-center">
              Record the engineering reasoning supporting this disposition.
            </p>
          </div>

          {/* RATIONALE */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-widest text-slate-200 mb-2">
              ENGINEER RATIONALE
            </label>
            <textarea
              rows={3}
              value={engineerNotes}
              onChange={(e) => setEngineerNotes(e.target.value)}
              placeholder="Record the reasoning behind your disposition..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed font-sans"
            />
          </div>

          {/* SUBMIT */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !selectedAction || !engineerNotes.trim()}
              className={`flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-bold font-mono uppercase tracking-wider transition-all ${
                isSubmitting || !selectedAction || !engineerNotes.trim()
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  : "bg-emerald-600/90 text-white hover:bg-emerald-500 border border-emerald-500/50 shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
              }`}
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Record Engineering Judgment</span>
                </>
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-500 font-mono uppercase tracking-wide mt-4">
            Decision will be recorded as an immutable audit record.
          </p>

        </form>
      </div>
    </div>
  );
};
