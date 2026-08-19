/** TypeScript interfaces — Review request and response types. */

import type { Citation, KeyDecisionPoint, CaseOutcomeType } from "./case";
import type {
  ExtractedFactorItem,
  FactorCategoryID,
  SchedulePressureLevel,
} from "./factors";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type ReviewStatus = "PRECEDENT_FOUND" | "NO_STRONG_PRECEDENT";

export type AuditActionType = "ACKNOWLEDGED" | "DISMISSED";

export interface SituationInput {
  situation_id?: string;
  title: string;
  mission_context: string;
  raw_description: string;
  initial_factors?: Record<string, boolean | SchedulePressureLevel>;
}

export interface SharedFactorDetail {
  factor_id: string;
  factor_label: string;
  category_id: FactorCategoryID;
  situation_evidence: string;
  historical_case_evidence: string;
}

export interface DifferingFactorDetail {
  factor_id: string;
  factor_label: string;
  category_id: FactorCategoryID;
  situation_value: boolean | SchedulePressureLevel;
  case_value: boolean | SchedulePressureLevel;
  contrast_note: string;
}

export interface PrecedentMatch {
  case_id: string;
  case_name: string;
  mission_program: string;
  incident_date: string;
  outcome_type: CaseOutcomeType;
  verification_status: string;
  situation_summary: string;
  overlap_score: number;
  historical_overmatch: number;
  total_active_situation_factors: number;
  category_overlap: Record<FactorCategoryID, number>;
  shared_factors: SharedFactorDetail[];
  differing_factors: DifferingFactorDetail[];
  key_decision_points: KeyDecisionPoint[];
  documented_contributing_factors: string[];
  documented_safeguards: string[];
  documented_response_actions: string[];
  citation: Citation;
  is_primary: boolean;
  is_tied: boolean;
}

export interface CounterEvidenceMatch {
  case_id: string;
  case_name: string;
  mission_program: string;
  incident_date: string;
  shared_risk_factors: string[];
  divergent_corrective_action: string;
  documented_contributing_factors: string[];
  documented_safeguards: string[];
  documented_response_actions: string[];
  citation: Citation;
}

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  overlap_metric: string;
  matched_critical_factors_count: number;
  total_critical_factors_count: number;
  rationale: string;
}

export interface GroundedExplanation {
  grounded_narrative: string;
  grounded_facts_used: string[];
  model_id: string;
  generated_at: string;
}

export interface AbstentionDetail {
  is_abstaining: true;
  reason_code: "INSUFFICIENT_FACTOR_OVERLAP" | "SPARSE_INPUT_DATA";
  message: string;
  highest_overlap_found: number;
  minimum_threshold_required: number;
  closest_candidate_cases: Array<{
    case_id: string;
    case_name: string;
    overlap_score: number;
  }>;
}

export interface PrecedentAnalysisResult {
  session_id: string;
  status: ReviewStatus;
  matched_cases: PrecedentMatch[];
  counter_evidence: CounterEvidenceMatch[];
  confidence: ConfidenceAssessment;
  grounded_explanation: GroundedExplanation | null;
  abstention_detail: AbstentionDetail | null;
  is_exact_tie: boolean;
  evaluated_at: string;
  disclaimer: string;
}

export interface AuditActionRequest {
  session_id: string;
  action: AuditActionType;
  engineer_notes?: string;
}

export interface AuditActionResponse {
  session_id: string;
  action: AuditActionType;
  recorded_at: string;
  status: "SUCCESS";
}

export interface ReviewSessionSummary {
  session_id: string;
  created_at: string;
  title: string;
  mission_context: string;
  status: ReviewStatus;
  top_matched_case_names: string[];
  overlap_score: number | null;
  category_breadth: number | null;
  audit_action: AuditActionType | "PENDING";
}

export type { ExtractedFactorItem };
