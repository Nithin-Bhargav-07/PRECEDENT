/** TypeScript interfaces — 8-factor schema and category types. */

export type FactorCategoryID = "CAT_TECH" | "CAT_ENV" | "CAT_HUMAN" | "CAT_PROCESS";

export type SchedulePressureLevel = "LOW" | "MEDIUM" | "HIGH";

export type FactorID =
  | "known_unresolved_issue"
  | "safety_margin_degraded"
  | "schedule_pressure"
  | "external_conditions_marginal"
  | "dissent_raised_and_overridden"
  | "missing_evidence_acknowledged"
  | "prior_normalization_of_risk"
  | "independent_review_skipped";

export interface FactorDefinition {
  id: FactorID;
  category_id: FactorCategoryID;
  category_name: string;
  label: string;
  description: string;
  diagnostic_question: string;
  value_type: "boolean" | "enum_schedule";
}

export interface ExtractedFactorItem {
  factor_id: string;
  value: boolean | SchedulePressureLevel;
  extracted_value: boolean | SchedulePressureLevel | null;
  confidence: number | null;
  evidence_quote: string | null;
  is_user_modified: boolean;
  modification_reason: string | null;
}

export interface ExtractedFactorSet {
  factors: Record<string, ExtractedFactorItem>;
  extraction_model?: string;
  extracted_at: string;
}
