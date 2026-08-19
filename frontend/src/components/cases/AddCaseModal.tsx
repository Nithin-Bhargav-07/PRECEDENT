import React, { useState } from "react";
import { X, Save, FileText, AlertCircle } from "lucide-react";
import type { HistoricalCase } from "../../types/case";
import { createHistoricalCase } from "../../lib/api";

interface AddCaseModalProps {
  onClose: () => void;
  onSuccess: (newCase: HistoricalCase) => void;
}

export const AddCaseModal: React.FC<AddCaseModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<HistoricalCase>>({
    id: `CASE-USER-${Date.now()}`,
    case_name: "",
    mission_program: "",
    incident_date: new Date().toISOString().split('T')[0],
    outcome_type: "ADVERSE_EVENT_RECOVERED",
    verification_status: "USER_SUBMITTED",
    situation_summary: "",
    factors: {
      "known_unresolved_issue": { value: false, evidence_summary: "", source_quote: "" },
      "safety_margin_degraded": { value: false, evidence_summary: "", source_quote: "" },
      "schedule_pressure": { value: "LOW" as any, evidence_summary: "", source_quote: "" },
      "external_conditions_marginal": { value: false, evidence_summary: "", source_quote: "" },
      "dissent_raised_and_overridden": { value: false, evidence_summary: "", source_quote: "" },
      "missing_evidence_acknowledged": { value: false, evidence_summary: "", source_quote: "" },
      "prior_normalization_of_risk": { value: false, evidence_summary: "", source_quote: "" },
      "independent_review_skipped": { value: false, evidence_summary: "", source_quote: "" }
    },
    key_decision_points: [],
    documented_contributing_factors: [],
    documented_safeguards: [],
    documented_response_actions: [],
    citation: {
      id: `CIT-USER-${Date.now()}`,
      report_title: "",
      issuing_body: "",
      publication_year: new Date().getFullYear(),
      key_excerpts: []
    },
    secondary_citations: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const saved = await createHistoricalCase(formData as HistoricalCase);
      onSuccess(saved);
    } catch (err: any) {
      setError(err.message || "Failed to create case");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCitation = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, citation: { ...prev.citation!, [key]: value } }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 sticky top-0 bg-slate-900 z-10 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            Add Historical Case
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200/90 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
            <p>
              Cases submitted here will be marked as <strong className="font-mono text-amber-400">USER_SUBMITTED</strong>. 
              They will not be considered part of the verified official corpus until they undergo engineering review.
            </p>
          </div>

          <form id="add-case-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Case Title</label>
                <input required minLength={3} value={formData.case_name} onChange={e => setFormData({ ...formData, case_name: e.target.value })} className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Mission/Program</label>
                <input required value={formData.mission_program} onChange={e => setFormData({ ...formData, mission_program: e.target.value })} className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Incident Date</label>
                <input type="date" required value={formData.incident_date} onChange={e => setFormData({ ...formData, incident_date: e.target.value })} className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Outcome</label>
                <select value={formData.outcome_type} onChange={e => setFormData({ ...formData, outcome_type: e.target.value as any })} className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none">
                  <option value="CATASTROPHIC_FAILURE">CATASTROPHIC_FAILURE</option>
                  <option value="MISSION_LOSS">MISSION_LOSS</option>
                  <option value="ADVERSE_EVENT_RECOVERED">ADVERSE_EVENT_RECOVERED</option>
                  <option value="NEAR_MISS_RECOVERED">NEAR_MISS_RECOVERED</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Situation Summary (Min 20 chars)</label>
              <textarea required minLength={20} value={formData.situation_summary} onChange={e => setFormData({ ...formData, situation_summary: e.target.value })} className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none h-24" />
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Investigation Source (Citation)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Report Title</label>
                  <input required minLength={5} value={formData.citation?.report_title} onChange={e => updateCitation("report_title", e.target.value)} className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Issuing Body</label>
                  <input required minLength={2} value={formData.citation?.issuing_body} onChange={e => updateCitation("issuing_body", e.target.value)} className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Publication Year</label>
                  <input type="number" required min={1950} max={2030} value={formData.citation?.publication_year} onChange={e => updateCitation("publication_year", parseInt(e.target.value))} className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Public URL / Document Path (Optional)</label>
                  <input value={formData.citation?.public_url || ""} onChange={e => updateCitation("public_url", e.target.value)} placeholder="https://..." className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="border-t border-slate-800 p-4 flex justify-end gap-3 sticky bottom-0 bg-slate-900 rounded-b-xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-slate-100 transition-colors">
            Cancel
          </button>
          <button type="submit" form="add-case-form" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors">
            {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" /> : <Save className="h-4 w-4" />}
            Save Draft Case
          </button>
        </div>
      </div>
    </div>
  );
};
