/** TypeScript interfaces — Historical case domain types. */

import type { SchedulePressureLevel } from "./factors";

export type CaseOutcomeType =
  | "CATASTROPHIC_FAILURE"
  | "MISSION_LOSS"
  | "ADVERSE_EVENT_RECOVERED"
  | "NEAR_MISS_RECOVERED";

export type CaseVerificationStatus =
  | "VERIFIED"
  | "PENDING_VERIFICATION"
  | "USER_SUBMITTED";

export interface Citation {
  id: string;
  report_title: string;
  issuing_body: string;
  publication_year: number;
  document_number?: string | null;
  public_url?: string | null;
  document_path?: string | null;
  key_excerpts: string[];
}

export interface FactorCaseEvidence {
  value: boolean | SchedulePressureLevel;
  evidence_summary: string;
  source_quote?: string;
  source_page?: number | null;
}

export interface IngestedFactorEvidence {
  quote: string;
  source_page: number | null;
}

export interface IngestedFactorItem {
  factor_id: string;
  candidate_value: boolean | SchedulePressureLevel | null;
  evidence: IngestedFactorEvidence | null;
}

export interface DocumentExtractionResult {
  title: string;
  incident_date: string;
  mission_program: string;
  outcome_type: CaseOutcomeType;
  situation_summary: string;
  key_decision_points: KeyDecisionPoint[];
  documented_contributing_factors: string[];
  documented_safeguards: string[];
  documented_response_actions: string[];
  citation_title: string;
  issuing_body: string;
  publication_year: number;
  factors: Record<string, IngestedFactorItem>;
}

export interface AdmitCaseRequest {
  extraction_result: DocumentExtractionResult;
  resolved_factors: Record<string, IngestedFactorItem>;
}

export interface KeyDecisionPoint {
  order: number;
  timestamp_or_phase: string;
  decision_description: string;
  participating_roles: string[];
  outcome_impact: string;
}

export interface HistoricalCase {
  id: string;
  case_name: string;
  mission_program: string;
  incident_date: string;
  outcome_type: CaseOutcomeType;
  verification_status: CaseVerificationStatus;
  situation_summary: string;
  factors: Record<string, FactorCaseEvidence>;
  key_decision_points: KeyDecisionPoint[];
  documented_contributing_factors: string[];
  documented_safeguards: string[];
  documented_response_actions: string[];
  citation: Citation;
  secondary_citations: Citation[];
}
