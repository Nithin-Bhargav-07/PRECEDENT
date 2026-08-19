import React from "react";
import { Sparkles, FileText, RotateCcw, ArrowRight } from "lucide-react";
import { SCENARIO_PRESETS, type ScenarioPreset } from "../../lib/constants";

interface SituationInputPanelProps {
  title: string;
  missionContext: string;
  rawDescription: string;
  isExtracting: boolean;
  onTitleChange: (val: string) => void;
  onMissionContextChange: (val: string) => void;
  onRawDescriptionChange: (val: string) => void;
  onExtractFactors: () => void;
  onApplyPreset: (preset: ScenarioPreset) => void;
  onReset: () => void;
}

export const SituationInputPanel: React.FC<SituationInputPanelProps> = ({
  title,
  missionContext,
  rawDescription,
  isExtracting,
  onTitleChange,
  onMissionContextChange,
  onRawDescriptionChange,
  onExtractFactors,
  onApplyPreset,
  onReset,
}) => {
  const isInputValid =
    title.trim().length >= 3 &&
    missionContext.trim().length >= 2 &&
    rawDescription.trim().length >= 10;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg backdrop-blur">
      {/* Header & Preset Toolbar */}
      <div className="space-y-3 border-b border-slate-800/80 pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <h2 className="font-semibold text-base text-slate-100">
              1. Flight Review Situation Input
            </h2>
          </div>

          <button
            type="button"
            onClick={onReset}
            title="Reset form"
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            Enter mission notes, teleconference transcripts, or telemetry.
          </p>

          {/* Demo Scenario Presets */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 font-semibold">PRESET:</span>
            <select
              defaultValue=""
              onChange={(e) => {
                const selected = SCENARIO_PRESETS.find((p) => p.id === e.target.value);
                if (selected) onApplyPreset(selected);
                e.target.value = "";
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="" disabled>
                Load Aerospace Scenario...
              </option>
              {SCENARIO_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Review Title <span className="text-cyan-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. Solid Rocket Booster Joint Low-Temperature Launch Review"
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Mission Context / Review Board <span className="text-cyan-400">*</span>
          </label>
          <input
            type="text"
            value={missionContext}
            onChange={(e) => onMissionContextChange(e.target.value)}
            placeholder="e.g. Flight Readiness Review (FRR) — Level III Joint Review"
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 shrink-0">
            Unstructured Situation Description <span className="text-cyan-400">*</span>
          </label>
          <textarea
            rows={12}
            value={rawDescription}
            onChange={(e) => onRawDescriptionChange(e.target.value)}
            placeholder={`Describe the actual situation and include relevant evidence when available.
Helpful evidence: Technical conditions · Safety margins · Unresolved issues ·
Engineering concerns · Decisions · Schedule pressure · Missing evidence ·
Review actions`}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-sm font-sans text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed resize-none"
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 shrink-0">
            <span>Minimum 10 characters required</span>
            <span>{rawDescription.length} chars</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2 shrink-0">
        <button
          type="button"
          disabled={!isInputValid || isExtracting}
          onClick={onExtractFactors}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all shadow-md ${
            isInputValid && !isExtracting
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isExtracting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
              <span>Extracting Factors with IBM Granite (temperature=0.0)...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <span>Extract 8 Factors with IBM Granite</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          IBM Granite performs structured NLP extraction only. Precedent matching and scoring remain 100% deterministic.
        </p>
      </div>
    </div>
  );
};
