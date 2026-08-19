import React, { useState } from "react";
import {
  AlertOctagon,
  Clock,
  ExternalLink,
  Info,
  FileCheck2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { FACTOR_CATEGORIES, FACTOR_METADATA } from "../../lib/constants";
import type { PrecedentAnalysisResult } from "../../types/review";
import type { ExtractedFactorItem } from "../../types/factors";
import { AuditSignOffPanel } from "./AuditSignOffPanel";

interface PrecedentResultsPanelProps {
  result: PrecedentAnalysisResult;
  sessionId: string;
  factors: Record<string, ExtractedFactorItem>;
  onAuditActionSuccess: (action: string, notes?: string) => void;
}

export const PrecedentResultsPanel: React.FC<PrecedentResultsPanelProps> = ({
  result,
  sessionId,
  factors,
  onAuditActionSuccess,
}) => {
  const [expandedFactors, setExpandedFactors] = useState<Set<string>>(new Set());

  const toggleFactor = (factorId: string) => {
    setExpandedFactors(prev => {
      const next = new Set(prev);
      if (next.has(factorId)) next.delete(factorId);
      else next.add(factorId);
      return next;
    });
  };

  const isPrecedentFound = result.status === "PRECEDENT_FOUND";
  const topMatch = result.matched_cases && result.matched_cases.length > 0 ? result.matched_cases[0] : null;
  
  const topTiedMatches = result.matched_cases?.filter(m => m.is_primary) || [];
  const additionalMatches = result.matched_cases?.filter(m => !m.is_primary) || [];

  // Confidence Level badge styling
  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case "HIGH":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold";
      case "MEDIUM":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold";
      case "LOW":
        return "bg-slate-800 text-slate-300 border-slate-700";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const confidenceLevel = result.confidence?.level ?? "NONE";

  const getCategoryName = (id: string) =>
    FACTOR_CATEGORIES.find((c) => c.id === id)?.name || id;

  return (
    <div className="space-y-16 animate-in fade-in-50 duration-500 max-w-[1400px] w-full mx-auto">
      {/* 1. Abstention State */}
      {!isPrecedentFound && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-xl p-4 shadow-inner bg-slate-800 text-slate-400 border border-slate-700">
                <Info className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
                  No Strong Precedent Identified
                </h2>
                {result.abstention_detail && (
                  <div className="text-sm text-slate-300">
                    <strong className="text-slate-100 font-mono block mb-1">
                      Abstention Reason: {result.abstention_detail.reason_code}
                    </strong>
                    <p className="text-slate-400 leading-relaxed max-w-2xl">
                      {result.abstention_detail.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{new Date(result.evaluated_at).toLocaleTimeString()} UTC</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Result Layout */}
      {isPrecedentFound && topMatch && (
        <div className="space-y-12">
          
          {/* LEVEL 1: PRIMARY PRECEDENT */}
          <div className="border-b-2 border-slate-800 pb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="rounded bg-amber-500/20 border border-amber-500/30 px-4 py-1.5 text-sm font-mono text-amber-400 font-bold tracking-widest uppercase shadow-sm">
                  Historical Precedent Identified
                </span>
                <span className="text-sm text-slate-400 font-mono">
                  {topMatch.incident_date} • {topMatch.mission_program}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(result.evaluated_at).toLocaleTimeString()} UTC</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div>
                {topTiedMatches.length > 1 && <div className="text-amber-400 font-bold mb-2 tracking-widest text-sm uppercase">Tied Primary Precedents</div>}
                <h2 className="text-4xl md:text-5xl font-bold text-slate-50 tracking-tight mb-4 leading-tight">
                  {topTiedMatches.map(m => m.case_name).join(" & ")}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center text-sm font-medium text-slate-400 font-mono">
                    Historical Outcome: <span className="ml-2 text-slate-200 font-bold">{topMatch.outcome_type}</span>
                  </span>
                  {topMatch.verification_status !== "VERIFIED" && (
                    <span className="inline-flex font-mono text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded font-bold">
                      {topMatch.verification_status}
                    </span>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-mono tracking-wide ${getConfidenceBadge(confidenceLevel)}`}>
                  HISTORICAL FACTOR OVERLAP: {confidenceLevel}
                </div>
                <div className="mt-2 text-[13px] font-mono font-semibold text-slate-400">
                  {topMatch.shared_factors.length} shared factors · {Object.values(topMatch.category_overlap || {}).filter((c) => c > 0).length} categories · {topMatch.differing_factors.length} differing factor{topMatch.differing_factors.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            

            
            {/* Primary Reference Box (Moved directly under primary result header) */}
            <div className="mt-6 inline-flex items-center gap-4 rounded-lg bg-slate-900/40 px-4 py-2 border border-slate-800/60">
              <FileCheck2 className="h-4 w-4 text-slate-500" />
              <div className="text-xs font-mono text-slate-400">
                <span className="text-slate-500 mr-2">Ref: {topMatch.citation.id}</span>
                <span className="text-slate-300">{topMatch.citation.report_title}</span>
                <span className="ml-2">({topMatch.citation.publication_year})</span>
              </div>
              {topMatch.citation.document_path || topMatch.citation.public_url ? (
                <a
                  href={
                    topMatch.citation.document_path
                      ? `http://127.0.0.1:8000${topMatch.citation.document_path}`
                      : topMatch.citation.public_url!
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="ml-4 flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 tracking-wider transition-colors"
                >
                  View Source <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </div>

          {/* LEVEL 2: FACTOR COMPARISON */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
              <span className="h-5 w-1.5 bg-amber-500 rounded-full"></span>
              Factor Comparison
            </h3>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">
                <div className="col-span-12 md:col-span-5">Factor</div>
                <div className="col-span-4 md:col-span-2 text-left md:text-center">Current</div>
                <div className="col-span-4 md:col-span-2 text-left md:text-center">Historical</div>
                <div className="col-span-4 md:col-span-3 text-right">Result</div>
              </div>
              
              <div className="divide-y divide-slate-800/60">
                {FACTOR_METADATA.map((meta) => {
                  const isShared = topMatch.shared_factors.some(sf => sf.factor_id === meta.id);
                  const differingMatch = topMatch.differing_factors.find(df => df.factor_id === meta.id);
                  
                  // Use the factor values from the current situation if passed
                  const currentValRaw = factors[meta.id]?.value;
                  const isCurrentActive = meta.isEnum 
                    ? (currentValRaw === "HIGH" || currentValRaw === "MEDIUM") 
                    : currentValRaw === true;

                  // Infer historical value
                  let isHistoricalActive = false;
                  let historicalRawValue: string | boolean | undefined;
                  
                  if (isShared) {
                    isHistoricalActive = isCurrentActive; // They matched
                    historicalRawValue = currentValRaw;
                  } else if (differingMatch) {
                    historicalRawValue = differingMatch.case_value;
                    isHistoricalActive = meta.isEnum
                      ? (historicalRawValue === "HIGH" || historicalRawValue === "MEDIUM")
                      : historicalRawValue === true;
                  }

                  const formatVal = (rawVal: any, isActive: boolean, isEnum?: boolean) => {
                    if (isEnum) {
                      const strVal = String(rawVal || "LOW");
                      // Title case
                      const display = strVal.charAt(0).toUpperCase() + strVal.slice(1).toLowerCase();
                      return <span className={isActive ? "text-amber-400 font-bold" : "text-slate-500"}>{display}</span>;
                    }
                    return isActive 
                      ? <span className="text-amber-400 font-bold">Active</span> 
                      : <span className="text-slate-500">Nominal</span>;
                  };

                  const isMatched = isShared || (!isCurrentActive && !isHistoricalActive);

                  return (
                    <div key={meta.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm transition-colors hover:bg-slate-800/30">
                      <div className="col-span-12 md:col-span-5">
                        <div className="font-semibold text-slate-200">{meta.label}</div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">{getCategoryName(meta.categoryId)}</div>
                      </div>
                      <div className="col-span-4 md:col-span-2 text-left md:text-center font-mono">
                        {formatVal(currentValRaw, isCurrentActive, meta.isEnum)}
                      </div>
                      <div className="col-span-4 md:col-span-2 text-left md:text-center font-mono">
                        {formatVal(historicalRawValue, isHistoricalActive, meta.isEnum)}
                      </div>
                      <div className="col-span-4 md:col-span-3 text-right">
                        {isMatched ? (
                          <span className="inline-block px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase font-bold tracking-widest border border-slate-700">MATCH</span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded bg-slate-900 text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest border border-slate-800">DIFFER</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EXPANDABLE EVIDENCE ROWS */}
            <div className="mt-6 space-y-3">
              {topMatch.shared_factors.map((sf) => {
                const isExpanded = expandedFactors.has(sf.factor_id);
                return (
                  <div key={sf.factor_id} className="rounded-lg border border-slate-800 bg-slate-900/30 overflow-hidden">
                    <button 
                      onClick={() => toggleFactor(sf.factor_id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors focus:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        <span className="font-semibold text-slate-200 text-sm">
                          <span className="text-amber-400 font-mono mr-2">[✓]</span>
                          {sf.factor_label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 hidden sm:block">
                        {getCategoryName(sf.category_id)}
                      </span>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-5 pt-2 border-t border-slate-800/50 bg-slate-900/20 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="text-[10px] font-mono uppercase text-slate-500 mb-1.5">Current Situation</div>
                            <div className="text-[13px] text-slate-300 italic">"{sf.situation_evidence}"</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-mono uppercase text-amber-500/70 mb-1.5">Historical Evidence</div>
                            <div className="text-[13px] text-slate-300 italic">"{sf.historical_case_evidence}"</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/30">
                          Source: {topMatch.citation.id} — {topMatch.citation.report_title}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* LEVEL 3 & 4: HISTORICAL CASE INFO (2-COLUMN) */}
          <div className="pt-10 border-t border-slate-800/60">
            <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3 mb-6">
              <span className="h-5 w-1.5 bg-cyan-500 rounded-full"></span>
              Historical Case Information
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
              <div className="space-y-4">
                <h4 className="font-mono text-[12px] font-bold uppercase tracking-wider text-slate-400">What Happened</h4>
                <p className="text-[15px] text-slate-300 leading-relaxed font-serif">
                  {topMatch.situation_summary}
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Source: {topMatch.citation.id}
                </div>
              </div>

              <div className="space-y-6">
                {topMatch.documented_contributing_factors.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-mono text-[12px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <AlertOctagon className="h-4 w-4" />
                      Documented Contributing Factors
                    </h4>
                    <ul className="space-y-2 pl-5 list-disc text-[14px] text-slate-300">
                      {topMatch.documented_contributing_factors.map((takeaway, idx) => (
                        <li key={idx} className="leading-relaxed marker:text-slate-600">{takeaway}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {topMatch.documented_safeguards.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-mono text-[12px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Documented Safeguards
                    </h4>
                    <ul className="space-y-2 pl-5 list-disc text-[14px] text-slate-300">
                      {topMatch.documented_safeguards.map((takeaway, idx) => (
                        <li key={idx} className="leading-relaxed marker:text-slate-600">{takeaway}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {topMatch.key_decision_points.length > 0 && (
              <div className="mt-10 space-y-5">
                <h4 className="font-mono text-[12px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Historical Sequence
                </h4>
                <div className="space-y-6 pl-4 border-l border-slate-700/50">
                  {topMatch.key_decision_points.map((kdp, idx) => (
                    <div key={idx} className="pl-6 relative">
                      <div className="absolute w-2 h-2 bg-slate-600 rounded-full -left-[4.5px] top-1.5"></div>
                      <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-1">
                        <span className="font-mono text-[11px] text-cyan-400 uppercase font-bold tracking-wide shrink-0">
                          {kdp.timestamp_or_phase}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Roles: {kdp.participating_roles.join(", ")}
                        </span>
                      </div>
                      <p className="text-[14px] text-slate-200 leading-relaxed">{kdp.decision_description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Matches */}
      {additionalMatches.length > 0 && (
        <div className="pt-10 border-t border-slate-800/60 max-w-[1000px] space-y-4">
          <h4 className="font-mono text-[12px] font-bold uppercase tracking-wider text-slate-500">
            Additional Precedents ({additionalMatches.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {additionalMatches.map((m) => (
              <div key={m.case_id} className="rounded-lg bg-slate-900/30 p-5 border border-slate-800/50">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-bold text-[16px] text-slate-300">{m.case_name}</h5>
                  <span className="font-mono text-xs text-slate-400">{m.shared_factors.length}/8</span>
                </div>
                <p className="text-[12px] text-slate-500 font-mono mb-2">{m.citation.report_title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEVEL 5: COUNTER-EVIDENCE */}
      <div className="pt-10 border-t border-slate-800/60">
        <h3 className="text-[24px] md:text-[28px] font-bold text-slate-200 flex items-center gap-3 mb-3">
          <span className="h-6 w-1.5 bg-emerald-500 rounded-full"></span>
          Counter-Evidence
        </h3>
        <p className="text-[15px] md:text-[16px] text-slate-400 mb-8 max-w-3xl">
          Historical missions that encountered similar initial factors but recovered safely via divergent safeguards.
        </p>

        {result.counter_evidence && result.counter_evidence.length > 0 ? (
          <div className="space-y-6 max-w-[1000px]">
            {result.counter_evidence.map((ce) => (
              <div key={ce.case_id} className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="font-bold text-[18px] text-slate-100">{ce.case_name}</h4>
                    <div className="flex items-center gap-2 text-[12px] text-slate-400 font-mono mt-1">
                      <span>{ce.mission_program}</span>
                      <span>•</span>
                      <span>{ce.incident_date}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[11px] font-mono font-bold tracking-widest text-emerald-400 border border-emerald-500/30 uppercase shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    Safe Recovery
                  </span>
                </div>
                
                <div className="rounded-lg bg-slate-900/60 p-4 border border-slate-800/60 mt-4">
                  <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-wider block mb-2 font-bold">
                    Divergent Corrective Action
                  </span>
                  <p className="text-[14px] text-slate-300 leading-relaxed font-serif italic">
                    "{ce.divergent_corrective_action}"
                  </p>
                </div>
                
                <div className="text-[11px] text-slate-500 font-mono mt-4 pt-4 border-t border-slate-800/40">
                  Source: {ce.citation.id} — {ce.citation.report_title}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-[1000px] bg-slate-900/30 rounded-lg border border-slate-800/50 p-8 text-center">
            <p className="text-[16px] font-semibold text-slate-400">NO SUITABLE COUNTER-EVIDENCE IDENTIFIED</p>
            <p className="text-[14px] text-slate-500 mt-2">
              No historical precedents match this specific combination of active factors while achieving a safe recovery.
            </p>
          </div>
        )}
      </div>

      {/* LEVEL 6: GROUNDED SYNTHESIS */}
      {result.grounded_explanation && (
        <div className="pt-10 border-t border-slate-800/60 max-w-[1000px]">
          <h3 className="text-[24px] md:text-[28px] font-bold text-slate-200 flex items-center gap-3 mb-2">
            <span className="h-6 w-1.5 bg-purple-500 rounded-full"></span>
            Grounded Narrative Synthesis
          </h3>
          <p className="text-[12px] font-mono text-slate-500 mb-8 flex items-center gap-2">
            Generated from deterministic match results and cited historical evidence
            <span className="text-[11px] bg-slate-800/50 px-2 py-1 rounded text-slate-500">IBM Granite</span>
          </p>

          <div className="space-y-6">
            {(() => {
              let narrative = result.grounded_explanation.grounded_narrative || "";
              
              // Handle escaped newlines and clean up
              narrative = String(narrative).replace(/\\n/g, '\n').trim();

              // Try to parse out the structured sections
              const keyFindingMatch = narrative.match(/KEY FINDING\s*\n([\s\S]*?)(?=DIVERGENCE \/ COUNTER-EVIDENCE|$)/i);
              const divergenceMatch = narrative.match(/DIVERGENCE \/ COUNTER-EVIDENCE\s*\n([\s\S]*?)$/i);

              if (keyFindingMatch || divergenceMatch) {
                return (
                  <div className="space-y-8 max-w-[1000px] text-left">
                    {keyFindingMatch && keyFindingMatch[1].trim() && (
                      <div className="space-y-2">
                        <h4 className="font-mono text-[12px] font-bold uppercase tracking-wider text-purple-400">Key Finding</h4>
                        <p className="text-[15px] md:text-[16px] text-slate-300 leading-relaxed font-serif">
                          {keyFindingMatch[1].trim()}
                        </p>
                      </div>
                    )}
                    {divergenceMatch && divergenceMatch[1].trim() && (
                      <div className="space-y-2">
                        <h4 className="font-mono text-[12px] font-bold uppercase tracking-wider text-emerald-400">Divergence / Counter-Evidence</h4>
                        <p className="text-[15px] md:text-[16px] text-slate-300 leading-relaxed font-serif">
                          {divergenceMatch[1].trim()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              }

              // Fallback to plain paragraphs if the structure wasn't exactly followed
              const paragraphs = narrative.split('\n').map(p => p.trim()).filter(Boolean);
              return (
                <div className="space-y-6 text-[15px] md:text-[16px] text-slate-300 leading-[1.7] font-serif max-w-[1000px] text-left">
                  {paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              );
            })()}

            <div className="mt-10 pt-8 border-t border-slate-800/50">
              <span className="font-mono text-[12px] text-slate-500 uppercase tracking-wider block mb-4">
                Grounded Citation Anchors Used:
              </span>
              <ul className="list-none space-y-3 text-[13px] font-mono text-slate-400">
                {result.grounded_explanation.grounded_facts_used.map((fact, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-600 mt-0.5">•</span>
                    <span className="leading-relaxed">{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 7: ENGINEERING JUDGMENT */}
      <div className="pt-12">
        <AuditSignOffPanel
          sessionId={sessionId}
          result={result}
          onAuditActionSuccess={onAuditActionSuccess}
        />
      </div>
    </div>
  );
};
