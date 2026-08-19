import { useState, useEffect } from "react";
import { Header, type AppView } from "./components/layout/Header";
import { LandingPage } from "./components/landing/LandingPage";
import { SituationInputPanel } from "./components/workspace/SituationInputPanel";
import { FactorReviewPanel } from "./components/workspace/FactorReviewPanel";
import { AnalysisReportView } from "./components/results/AnalysisReportView";
import { CaseLibraryView } from "./components/cases/CaseLibraryView";
import { AuditLogView } from "./components/sessions/AuditLogView";
import { extractFactors, evaluatePrecedent, createReviewSession } from "./lib/api";
import { FACTOR_METADATA, type ScenarioPreset } from "./lib/constants";
import type { ExtractedFactorItem, SchedulePressureLevel } from "./types/factors";
import type { PrecedentAnalysisResult } from "./types/review";
import { Activity, Cpu, ShieldCheck } from "lucide-react";
import { PageContainer } from "./components/layout/PageContainer";

export type ExtendedView = AppView | "analysis";

function getViewFromPath(pathname: string): ExtendedView {
  if (pathname === "/workspace") return "workspace";
  if (pathname === "/analysis") return "analysis";
  if (pathname === "/cases") return "cases";
  if (pathname === "/sessions") return "sessions";
  return "landing";
}

function getPathFromView(view: ExtendedView): string {
  switch (view) {
    case "workspace":
      return "/workspace";
    case "analysis":
      return "/analysis";
    case "cases":
      return "/cases";
    case "sessions":
      return "/sessions";
    default:
      return "/";
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState<ExtendedView>(() => {
    if (typeof window !== "undefined") {
      return getViewFromPath(window.location.pathname);
    }
    return "landing";
  });

  const [sessionId, setSessionId] = useState<string | null>(null);

  // Sync route with browser history
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getViewFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = (view: ExtendedView) => {
    setCurrentView(view);
    const targetPath = getPathFromView(view);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Form State

  const [title, setTitle] = useState("");
  const [missionContext, setMissionContext] = useState("");
  const [rawDescription, setRawDescription] = useState("");

  // Initial Factors populated from default preset
  const initialFactorMap: Record<string, ExtractedFactorItem> = {};
  FACTOR_METADATA.forEach((meta) => {
    initialFactorMap[meta.id] = {
      factor_id: meta.id,
      value: meta.isEnum ? "LOW" : false,
      extracted_value: null,
      confidence: null,
      evidence_quote: null,
      is_user_modified: false,
      modification_reason: null,
    };
  });

  const [factors, setFactors] = useState<Record<string, ExtractedFactorItem>>(initialFactorMap);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PrecedentAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  // Apply Demo Scenario Preset
  const handleApplyPreset = (preset: ScenarioPreset) => {
    setTitle(preset.title);
    setMissionContext(preset.missionContext);
    setRawDescription(preset.description);
    setAnalysisResult(null);
    setErrorMessage(null);

    const updatedFactors: Record<string, ExtractedFactorItem> = {};
    FACTOR_METADATA.forEach((meta) => {
      const val = preset.defaultFactors[meta.id];
      updatedFactors[meta.id] = {
        factor_id: meta.id,
        value: val ?? (meta.isEnum ? "LOW" : false),
        extracted_value: val ?? (meta.isEnum ? "LOW" : false),
        confidence: null,
        evidence_quote: `Directly derived from ${preset.name} scenario profile.`,
        is_user_modified: false,
        modification_reason: null,
      };
    });
    setFactors(updatedFactors);
  };

  const handleReset = () => {
    setTitle("");
    setMissionContext("");
    setRawDescription("");
    setAnalysisResult(null);
    setErrorMessage(null);
    const blankFactors: Record<string, ExtractedFactorItem> = {};
    FACTOR_METADATA.forEach((meta) => {
      blankFactors[meta.id] = {
        factor_id: meta.id,
        value: meta.isEnum ? "LOW" : false,
        extracted_value: null,
        confidence: null,
        evidence_quote: null,
        is_user_modified: false,
        modification_reason: null,
      };
    });
    setFactors(blankFactors);
  };

  // 1. Trigger IBM Granite Factor Extraction
  const handleExtractFactors = async () => {
    setIsExtracting(true);
    setErrorMessage(null);
    setAnalysisResult(null);
    try {
      const response = await extractFactors({
        title,
        mission_context: missionContext,
        raw_description: rawDescription,
        session_id: sessionId || undefined,
      });

      if (response.session_id) {
        setSessionId(response.session_id);
      }
      setFactors(response.factors);
      setProvider(response.provider);
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorMessage(`Factor extraction failed: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // 2. Engineer manually modifies factor value
  const handleFactorValueChange = (
    factorId: string,
    newValue: boolean | SchedulePressureLevel,
    reason?: string
  ) => {
    setFactors((prev) => {
      const existing = prev[factorId];
      if (!existing) return prev;
      return {
        ...prev,
        [factorId]: {
          ...existing,
          value: newValue,
          is_user_modified: newValue !== existing.extracted_value,
          modification_reason: reason || "Manually adjusted by reviewing engineer.",
        },
      };
    });
  };

  // 3. Trigger Pure Deterministic Precedent Evaluation & Navigate to Dedicated Analysis View
  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setErrorMessage(null);
    try {
      const confirmedMap: Record<string, ExtractedFactorItem> = {};
      Object.entries(factors).forEach(([k, item]) => {
        confirmedMap[k] = item;
      });

      let currentSessId = sessionId;
      if (!currentSessId) {
        const newSession = await createReviewSession({
          title,
          mission_context: missionContext,
          raw_description: rawDescription,
          extracted_factors: factors,
        });
        currentSessId = newSession.session_id;
        setSessionId(currentSessId);
      }

      const [result] = await Promise.all([
        evaluatePrecedent({
          session_id: currentSessId!,
          title,
          mission_context: missionContext,
          raw_description: rawDescription,
          confirmed_factors: confirmedMap,
        }),
        // Ensure deliberate, smooth 1.2s transition for report synthesis
        new Promise((resolve) => setTimeout(resolve, 1100)),
      ]);

      setAnalysisResult(result);
      handleNavigate("analysis");
    } catch (err: any) {
      console.error("Evaluation error:", err);
      setErrorMessage(`Precedent evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAuditActionSuccess = () => {
    // Audit action saved
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Header Navigation */}
      <Header
        currentView={currentView === "analysis" ? "workspace" : currentView}
        onViewChange={(v) => handleNavigate(v)}
        activeSessionId={sessionId}
      />

      {/* View Router */}
      {currentView === "landing" && (
        <LandingPage
          onStartReview={() => handleNavigate("workspace")}
          onExploreCases={() => handleNavigate("cases")}
        />
      )}

      {currentView !== "landing" && (
        <main className="py-8 pb-20">
          {/* Error Notification */}
          {errorMessage && (
            <PageContainer variant="wide" className="mb-6">
              <div className="rounded-xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200 shadow-md">
                <strong>System Error:</strong> {errorMessage}
              </div>
            </PageContainer>
          )}

          {/* Loading Transition Overlay when executing analysis */}
          {isEvaluating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl max-w-md text-center">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
                  <Cpu className="h-6 w-6 text-amber-400 absolute inset-0 m-auto" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-mono">
                    Executing Deterministic Precedent Engine
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Matching factor overlap matrix across historical aerospace investigation library...
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 border border-slate-800 text-[10px] font-mono text-cyan-400">
                  <ShieldCheck className="h-3 w-3" />
                  <span>100% Deterministic • Zero LLM Hallucination</span>
                </div>
              </div>
            </div>
          )}

          {/* Review Workspace View (Inputs + Compact Factors) */}
          {currentView === "workspace" && (
            <PageContainer variant="workspace" className="space-y-8 animate-in fade-in duration-200">
              {/* Step Workflow Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
                    <Activity className="h-5 w-5 text-cyan-400" />
                    Flight Readiness Precedent Review Workspace
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    1. Input Situation Description → 2. Review Granite Factor Extractions → 3. Open Precedent Investigation Report
                  </p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1 text-cyan-400 font-semibold">
                    Active FRR Session: {sessionId || "Draft Review"}
                  </span>
                </div>
              </div>

              {/* Split Screen Workspace Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-[calc(100vh-12rem)]">
                {/* Left Panel: Situation Input (5 cols) */}
                <div className="lg:col-span-5">
                  <SituationInputPanel
                    title={title}
                    missionContext={missionContext}
                    rawDescription={rawDescription}
                    isExtracting={isExtracting}
                    onTitleChange={setTitle}
                    onMissionContextChange={setMissionContext}
                    onRawDescriptionChange={setRawDescription}
                    onExtractFactors={handleExtractFactors}
                    onApplyPreset={handleApplyPreset}
                    onReset={handleReset}
                  />
                </div>

                {/* Right Panel: Factor Confirmation Grid (7 cols) */}
                <div className="lg:col-span-7 min-h-0 h-full">
                  <FactorReviewPanel
                    factors={factors}
                    isEvaluating={isEvaluating}
                    provider={provider}
                    onFactorValueChange={handleFactorValueChange}
                    onRunEvaluation={handleRunEvaluation}
                  />
                </div>
              </div>
            </PageContainer>
          )}

          {/* Dedicated Precedent Investigation Report View */}
          {currentView === "analysis" && analysisResult && (
            <PageContainer variant="wide">
              <AnalysisReportView
                title={title}
                missionContext={missionContext}
                factors={factors}
                sessionId={sessionId || "SESS-CURRENT"}
                analysisResult={analysisResult}
                onBackToReview={() => handleNavigate("workspace")}
                onAuditActionSuccess={handleAuditActionSuccess}
              />
            </PageContainer>
          )}

          {/* Fallback if directly navigated to /analysis with no result yet */}
          {currentView === "analysis" && !analysisResult && (
            <PageContainer variant="reading">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4">
                <Activity className="h-10 w-10 text-cyan-400 mx-auto" />
                <h2 className="text-lg font-bold text-slate-100">No Active Analysis Report</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Please enter situation details and execute precedent evaluation from the Review Workspace.
                </p>
                <button
                  onClick={() => handleNavigate("workspace")}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors shadow-md"
                >
                  Go to Review Workspace
                </button>
              </div>
            </PageContainer>
          )}

          {currentView === "cases" && (
            <PageContainer variant="wide">
              <CaseLibraryView />
            </PageContainer>
          )}

          {currentView === "sessions" && (
            <PageContainer variant="wide">
              <AuditLogView />
            </PageContainer>
          )}
        </main>
      )}
    </div>
  );
}
