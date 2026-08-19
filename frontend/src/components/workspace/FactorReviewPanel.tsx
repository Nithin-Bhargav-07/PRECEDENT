import React from "react";
import { ShieldCheck, Zap, Info, Cpu } from "lucide-react";
import { FACTOR_CATEGORIES, FACTOR_METADATA } from "../../lib/constants";
import { FactorCard } from "./FactorCard";
import type { ExtractedFactorItem, SchedulePressureLevel } from "../../types/factors";

interface FactorReviewPanelProps {
  factors: Record<string, ExtractedFactorItem>;
  isEvaluating: boolean;
  provider: string | null;
  onFactorValueChange: (factorId: string, newValue: boolean | SchedulePressureLevel, reason?: string) => void;
  onRunEvaluation: () => void;
}

export const FactorReviewPanel: React.FC<FactorReviewPanelProps> = ({
  factors,
  isEvaluating,
  provider,
  onFactorValueChange,
  onRunEvaluation,
}) => {
  // Count active risk factors
  const activeCount = Object.values(factors).filter((item) => {
    if (typeof item.value === "boolean") return item.value;
    if (typeof item.value === "string") return item.value === "HIGH" || item.value === "MEDIUM";
    return false;
  }).length;

  return (
    <div className="flex flex-col h-full gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg backdrop-blur overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <h2 className="font-semibold text-xl sm:text-2xl text-slate-100">
              2. Factor Review & Human Confirmation
            </h2>
          </div>
          <span className={`rounded-full px-3 py-1 font-mono text-xs font-semibold border transition-all ${
            activeCount > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}>
            {activeCount} of 8 Factors Active
          </span>
        </div>

        {/* Compact Permanent Distinction Info */}
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 text-cyan-200/90">
          <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-mono font-medium text-cyan-300 text-[10px] tracking-widest uppercase">
              Extraction Certainty vs. Precedent Confidence
            </p>
            <p className="text-[11px] text-cyan-200/80 leading-relaxed">
              The extraction certainty badge reflects AI text-parsing confidence. <strong>Deterministic Match Confidence</strong> is calculated separately based strictly on confirmed factor overlap.
            </p>
          </div>
        </div>
      </div>

      {/* Categorical Factor Grid */}
      <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
        {FACTOR_CATEGORIES.map((category) => {
          const categoryFactors = FACTOR_METADATA.filter(
            (m) => m.categoryId === category.id
          );

          return (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1 mt-4">
                <h3 className="font-sans text-sm font-bold tracking-wider text-slate-400">
                  {category.name}
                </h3>
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">{category.description}</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {categoryFactors.map((meta) => (
                  <FactorCard
                    key={meta.id}
                    meta={meta}
                    item={factors[meta.id]}
                    provider={provider}
                    onChangeValue={onFactorValueChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Evaluation Execution Bar */}
      <div className="sticky bottom-0 z-10 shrink-0 -mx-5 -mb-5 mt-2 rounded-b-2xl border-t border-slate-800 bg-slate-950/95 p-4 backdrop-blur shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 border border-slate-800">
               <Cpu className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-200">
                Ready to evaluate {activeCount} active factors
              </span>
              <span className="text-[11px] text-slate-400">
                Analysis uses only the engineer-confirmed factor values.
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isEvaluating}
            onClick={onRunEvaluation}
            className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-md ${
              !isEvaluating
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 font-bold active:scale-[0.99] shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isEvaluating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                <span>Running Deterministic Reasoning Engine...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-slate-950 fill-current" />
                <span>Run Deterministic Precedent Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
