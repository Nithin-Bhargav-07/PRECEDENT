import React, { useState } from "react";
import { Edit3, ChevronDown, ChevronUp, Quote, HelpCircle } from "lucide-react";
import type { FactorMeta } from "../../lib/constants";
import type { ExtractedFactorItem, SchedulePressureLevel } from "../../types/factors";

interface FactorCardProps {
  meta: FactorMeta;
  item: ExtractedFactorItem | undefined;
  provider: string | null;
  onChangeValue: (factorId: string, newValue: boolean | SchedulePressureLevel, reason?: string) => void;
}

export const FactorCard: React.FC<FactorCardProps> = ({
  meta,
  item,
  provider: _provider,
  onChangeValue,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentValue = item?.value ?? (meta.isEnum ? "LOW" : false);
  const confidence = item?.confidence ?? null;
  const confidencePct = confidence !== null ? Math.round(confidence * 100) : null;
  const isOverridden = item?.is_user_modified ?? false;
  const quote = item?.evidence_quote;

  const isRiskActive = meta.isEnum
    ? currentValue === "HIGH" || currentValue === "MEDIUM"
    : currentValue === true;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isRiskActive
          ? "border-amber-500/50 bg-slate-900/90 shadow-sm"
          : "border-slate-800/90 bg-slate-900/40 hover:border-slate-700/80"
      }`}
    >
      {/* Primary Compact Row: Status + Label + Badges + Action Buttons */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left Side: Indicator + Label + Confidence Badge */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              isRiskActive ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "bg-slate-600"
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className={`text-base font-semibold truncate ${
                isRiskActive ? "text-amber-100" : "text-slate-200"
              }`}>
                {meta.label}
              </h4>

              {/* Extraction Confidence or Override Pill */}
              {isOverridden ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400 border border-emerald-500/30 shrink-0">
                  <Edit3 className="h-2.5 w-2.5" />
                  ENGINEER OVERRIDE
                </span>
              ) : confidencePct !== null ? (
                <span
                  title="Extraction Confidence"
                  className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700/80 shrink-0"
                >
                  <span>{confidencePct}%</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Side: Tactile User Actions + Expand Toggle */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {meta.isEnum ? (
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800" onClick={(e) => e.stopPropagation()}>
              {(["LOW", "MEDIUM", "HIGH"] as SchedulePressureLevel[]).map((lvl) => {
                const selected = currentValue === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChangeValue(meta.id, lvl)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                      selected
                        ? lvl === "HIGH"
                          ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                          : lvl === "MEDIUM"
                          ? "bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold shadow-sm"
                          : "bg-slate-700 text-slate-100 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onChangeValue(meta.id, false)}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all ${
                  currentValue === false
                    ? "bg-slate-700 text-slate-100 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                Nominal
              </button>
              <button
                type="button"
                onClick={() => onChangeValue(meta.id, true)}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all ${
                  currentValue === true
                    ? "bg-amber-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                    : "text-slate-400 hover:text-amber-300 hover:bg-amber-950/30"
                }`}
              >
                Active Risk
              </button>
            </div>
          )}

          {/* Details / Evidence Disclosure Chevron (Clickable area covers the whole card row) */}
          <div className="flex items-center justify-center h-6 w-6 text-slate-500 transition-transform">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Expandable Secondary Details: Diagnostic Question & Evidence Quote */}
      {isExpanded && (
        <div 
          className="border-t border-slate-800/70 bg-slate-950/70 p-4 space-y-4 rounded-b-xl text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2.5 text-slate-400">
            <HelpCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-mono text-[11px] text-slate-500 uppercase tracking-wider block mb-1">
                Diagnostic Question
              </span>
              <p className="italic text-slate-300 text-sm leading-relaxed">
                "{meta.diagnosticQuestion}"
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-slate-900/90 p-3.5 border border-slate-800">
            <Quote className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-mono text-[11px] text-cyan-400 uppercase tracking-wider block mb-1">
                Evidence Quote
              </span>
              {quote ? (
                <p className="font-mono text-sm text-slate-200 leading-relaxed">
                  "{quote}"
                </p>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  No direct quote detected in review text (evaluates to baseline nominal)
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
