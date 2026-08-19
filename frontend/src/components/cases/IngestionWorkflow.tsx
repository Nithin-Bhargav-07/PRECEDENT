import React, { useState } from "react";
import { X, Save, UploadCloud, AlertCircle, ChevronRight, FileText } from "lucide-react";
import type { HistoricalCase, DocumentExtractionResult, IngestedFactorItem } from "../../types/case";
import { admitCase, extractPdf } from "../../lib/api";
import { FACTOR_METADATA, FACTOR_CATEGORIES } from "../../lib/constants";

interface IngestionWorkflowProps {
  onClose: () => void;
  onSuccess: (newCase: HistoricalCase) => void;
}

type Step = "UPLOAD" | "EXTRACTING" | "MANUAL_ENTRY" | "REVIEW";

export const IngestionWorkflow: React.FC<IngestionWorkflowProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [extractedData, setExtractedData] = useState<DocumentExtractionResult | null>(null);
  
  // Track manually resolved factors during review
  const [resolvedFactors, setResolvedFactors] = useState<Record<string, IngestedFactorItem>>({});

  // Manual entry state
  const [manualData, setManualData] = useState({
    title: "",
    incident_date: "",
    mission_program: "",
    outcome_type: "MISSION_LOSS",
    situation_summary: ""
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setStep("EXTRACTING");
    setError(null);
    try {
      const data = await extractPdf(file);
      setExtractedData(data);
      // Initialize resolved factors with what was extracted
      setResolvedFactors(data.factors);
      setStep("REVIEW");
    } catch (err: any) {
      setError(err.message || "Failed to extract case from PDF");
      setStep("UPLOAD");
    }
  };

  const handleManualEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualData.title || !manualData.incident_date || !manualData.mission_program || !manualData.situation_summary) {
      setError("Please fill out all required fields.");
      return;
    }

    const syntheticData: DocumentExtractionResult = {
      ...manualData,
      outcome_type: manualData.outcome_type as any,
      key_decision_points: [],
      documented_contributing_factors: [],
      documented_safeguards: [],
      documented_response_actions: [],
      citation_title: manualData.title + " (Manual Entry)",
      issuing_body: "User Internal",
      publication_year: parseInt(manualData.incident_date.substring(0, 4)) || new Date().getFullYear(),
      factors: {}
    };

    setExtractedData(syntheticData);

    // Initialize all factors as unresolved for manual entry
    const initialFactors: Record<string, IngestedFactorItem> = {};
    FACTOR_METADATA.forEach(meta => {
      initialFactors[meta.id] = {
        factor_id: meta.id,
        candidate_value: null,
        evidence: null
      };
    });
    setResolvedFactors(initialFactors);
    setStep("REVIEW");
  };

  const updateResolvedFactor = (factorId: string, value: any) => {
    setResolvedFactors(prev => ({
      ...prev,
      [factorId]: {
        ...prev[factorId],
        candidate_value: value,
        // If they manually resolve it, we ensure there's at least an evidence object
        evidence: prev[factorId]?.evidence || { quote: "Manually asserted during review", source_page: null }
      }
    }));
  };

  const isFormValid = () => {
    if (!extractedData) return false;
    // All 8 factors must have a non-null candidate_value
    return FACTOR_METADATA.every(meta => {
      const val = resolvedFactors[meta.id]?.candidate_value;
      return val !== null && val !== undefined;
    });
  };

  const handleSubmit = async () => {
    if (!extractedData || !isFormValid()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Delegate final construction and validation to the backend
      const saved = await admitCase({
        extraction_result: extractedData,
        resolved_factors: resolvedFactors
      });
      onSuccess(saved);
    } catch (err: any) {
      setError(err.message || "Failed to save historical case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl my-8 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 shrink-0 bg-slate-900 rounded-t-xl">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              Historical Case Ingestion
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono hidden sm:flex">
              <span className={step === "UPLOAD" ? "text-cyan-400" : "text-slate-500"}>1. SOURCE</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className={step === "EXTRACTING" || step === "MANUAL_ENTRY" ? "text-cyan-400" : "text-slate-500"}>2. DATA PREP</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className={step === "REVIEW" ? "text-cyan-400" : "text-slate-500"}>3. ENGINEER REVIEW</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 rounded bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {step === "UPLOAD" && (
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-800 rounded-xl bg-slate-950">
                <UploadCloud className="h-12 w-12 text-cyan-500/50 mb-4" />
                <h3 className="text-lg font-bold text-slate-200 mb-2">Upload Investigation Report</h3>
                <p className="text-sm text-slate-400 mb-6 text-center max-w-[250px]">
                  Upload an official aerospace incident report (PDF). IBM Granite will extract the canonical factors for review.
                </p>
                <label className="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 px-6 rounded-lg transition-colors">
                  Select PDF File
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              
              <div className="flex items-center justify-center">
                <span className="text-slate-500 font-mono text-sm">OR</span>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center py-16 border-2 border-slate-800 rounded-xl bg-slate-950/50">
                <FileText className="h-12 w-12 text-slate-500/50 mb-4" />
                <h3 className="text-lg font-bold text-slate-200 mb-2">Enter Manually</h3>
                <p className="text-sm text-slate-400 mb-6 text-center max-w-[250px]">
                  Manually define the case metadata and perform your own classification of the canonical factors.
                </p>
                <button 
                  onClick={() => { setError(null); setStep("MANUAL_ENTRY"); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-6 rounded-lg transition-colors border border-slate-700"
                >
                  Enter Details
                </button>
              </div>
            </div>
          )}

          {step === "MANUAL_ENTRY" && (
            <form onSubmit={handleManualEntrySubmit} className="space-y-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Case Metadata</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</label>
                    <input required type="text" value={manualData.title} onChange={e => setManualData({...manualData, title: e.target.value})} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" placeholder="e.g. STS-51-L Challenger" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mission / Program</label>
                    <input required type="text" value={manualData.mission_program} onChange={e => setManualData({...manualData, mission_program: e.target.value})} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" placeholder="e.g. Space Shuttle Program" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Incident Date</label>
                    <input required type="text" value={manualData.incident_date} onChange={e => setManualData({...manualData, incident_date: e.target.value})} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none" placeholder="YYYY-MM-DD" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outcome Type</label>
                    <select value={manualData.outcome_type} onChange={e => setManualData({...manualData, outcome_type: e.target.value})} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none">
                      <option value="CATASTROPHIC_FAILURE">CATASTROPHIC_FAILURE</option>
                      <option value="MISSION_LOSS">MISSION_LOSS</option>
                      <option value="NEAR_MISS_RECOVERED">NEAR_MISS_RECOVERED</option>
                      <option value="ADVERSE_EVENT_RECOVERED">ADVERSE_EVENT_RECOVERED</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Situation Summary</label>
                  <textarea required rows={4} value={manualData.situation_summary} onChange={e => setManualData({...manualData, situation_summary: e.target.value})} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none resize-none" placeholder="Provide a detailed summary of the incident..." />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setStep("UPLOAD")} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200">Back</button>
                <button type="submit" className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors">Continue to Review</button>
              </div>
            </form>
          )}

          {step === "EXTRACTING" && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-500 mb-6" />
              <h3 className="text-lg font-bold text-slate-200 mb-2 animate-pulse">Extracting Factors via IBM Granite...</h3>
              <p className="text-sm text-slate-400">Parsing document structure and identifying the 8 canonical safety vectors.</p>
            </div>
          )}

          {step === "REVIEW" && extractedData && (
            <div className="space-y-8">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider">Extracted Case Metadata</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500 block text-xs">Title</span><span className="text-slate-200 font-semibold">{extractedData.title}</span></div>
                  <div><span className="text-slate-500 block text-xs">Mission/Program</span><span className="text-slate-200">{extractedData.mission_program}</span></div>
                  <div><span className="text-slate-500 block text-xs">Incident Date</span><span className="text-slate-200">{extractedData.incident_date}</span></div>
                  <div><span className="text-slate-500 block text-xs">Outcome</span><span className="text-slate-200">{extractedData.outcome_type}</span></div>
                </div>
                <div className="mt-4">
                  <span className="text-slate-500 block text-xs mb-1">Situation Summary</span>
                  <p className="text-slate-300 text-sm leading-relaxed">{extractedData.situation_summary}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider flex items-center justify-between">
                  <span>Factor Review & Confirmation</span>
                  {!isFormValid() && <span className="text-amber-400 text-xs flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded"><AlertCircle className="h-3.5 w-3.5" /> Pending manual resolution</span>}
                </h3>
                
                <div className="space-y-6">
                  {FACTOR_CATEGORIES.map(category => {
                    const categoryFactors = FACTOR_METADATA.filter(m => m.categoryId === category.id);
                    if (categoryFactors.length === 0) return null;

                    return (
                      <div key={category.id} className="space-y-3">
                        <h4 className="font-mono text-xs font-bold text-slate-500 border-b border-slate-800 pb-1">{category.name}</h4>
                        <div className="space-y-3">
                          {categoryFactors.map(meta => {
                            const item = resolvedFactors[meta.id];
                            const isNull = item?.candidate_value === null || item?.candidate_value === undefined;
                            
                            return (
                              <div key={meta.id} className={`p-4 rounded-lg border ${isNull ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800 bg-slate-900/50'}`}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold text-slate-200 text-sm">{meta.label}</span>
                                      {isNull && <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase">Unresolved</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">{meta.diagnosticQuestion}</p>
                                    
                                    {!isNull && item?.evidence && (
                                      <div className="bg-slate-950 rounded p-2 text-xs border border-slate-800/50">
                                        <p className="text-slate-400 italic font-serif">"{item.evidence.quote}"</p>
                                        {item.evidence.source_page && <p className="text-[10px] text-cyan-500 font-mono mt-1 text-right">Page {item.evidence.source_page}</p>}
                                      </div>
                                    )}
                                    {isNull && (
                                      <p className="text-xs text-amber-300/80 bg-amber-500/10 p-2 rounded">
                                        The AI could not conclusively determine this factor from the text. Manual engineer review is required to assert a value.
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="w-40 shrink-0 flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assert Value</label>
                                    {meta.isEnum ? (
                                      <select 
                                        value={item?.candidate_value as string || ""}
                                        onChange={e => updateResolvedFactor(meta.id, e.target.value)}
                                        className={`w-full rounded bg-slate-950 border px-2 py-1.5 text-xs focus:outline-none ${isNull ? 'border-amber-500/50 text-amber-100' : 'border-slate-700 text-slate-200 focus:border-cyan-500'}`}
                                      >
                                        <option value="" disabled>Select level...</option>
                                        <option value="LOW">LOW</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH</option>
                                      </select>
                                    ) : (
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => updateResolvedFactor(meta.id, true)}
                                          className={`flex-1 py-1.5 text-xs font-bold rounded border ${item?.candidate_value === true ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                                        >
                                          YES
                                        </button>
                                        <button 
                                          onClick={() => updateResolvedFactor(meta.id, false)}
                                          className={`flex-1 py-1.5 text-xs font-bold rounded border ${item?.candidate_value === false ? 'bg-slate-700 border-slate-500 text-slate-200' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                                        >
                                          NO
                                        </button>
                                      </div>
                                    )}
                                  </div>
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
            </div>
          )}
        </div>

        {step === "REVIEW" && (
          <div className="border-t border-slate-800 p-4 shrink-0 bg-slate-900 rounded-b-xl flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Admitted cases require full structured consensus
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("UPLOAD")} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-slate-100 transition-colors">
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={!isFormValid() || isSubmitting} 
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                CONFIRM & ADD CASE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
