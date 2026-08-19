/** API Client for PRECEDENT backend services. */

import type { HistoricalCase } from "../types/case";
import type { ExtractedFactorItem } from "../types/factors";
import type {
  AuditActionRequest,
  AuditActionResponse,
  PrecedentAnalysisResult,
  ReviewSessionSummary,
} from "../types/review";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export interface ExtractFactorsPayload {
  title: string;
  mission_context: string;
  raw_description: string;
  session_id?: string;
}

export interface ExtractFactorsResponse {
  session_id: string;
  factors: Record<string, ExtractedFactorItem>;
  model_id: string;
  provider: string;
  extracted_at: string;
}

export interface EvaluatePrecedentPayload {
  session_id: string;
  title: string;
  mission_context: string;
  raw_description: string;
  confirmed_factors: Record<string, ExtractedFactorItem>;
}

export async function extractFactors(
  payload: ExtractFactorsPayload
): Promise<ExtractFactorsResponse> {
  const response = await fetch(`${API_BASE_URL}/extract-factors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to extract factors (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function evaluatePrecedent(
  payload: EvaluatePrecedentPayload
): Promise<PrecedentAnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/evaluate-precedent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to evaluate precedent (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function fetchHistoricalCases(): Promise<HistoricalCase[]> {
  const response = await fetch(`${API_BASE_URL}/cases`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cases (${response.status})`);
  }
  return response.json();
}

export async function fetchHistoricalCase(caseId: string): Promise<HistoricalCase> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch case ${caseId} (${response.status})`);
  }
  return response.json();
}

export async function createHistoricalCase(payload: HistoricalCase): Promise<HistoricalCase> {
  const response = await fetch(`${API_BASE_URL}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create case (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function createReviewSession(payload: {
  title: string;
  mission_context: string;
  raw_description: string;
  submitter_role?: string;
  review_board?: string;
  extracted_factors?: Record<string, ExtractedFactorItem>;
}) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create session (${response.status})`);
  }
  return response.json();
}

export async function listSessions(): Promise<ReviewSessionSummary[]> {
  const response = await fetch(`${API_BASE_URL}/sessions`);
  if (!response.ok) {
    throw new Error(`Failed to list sessions (${response.status})`);
  }
  return response.json();
}

export async function recordAuditAction(
  sessionId: string,
  payload: AuditActionRequest
): Promise<AuditActionResponse> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to record audit action (${response.status})`);
  }
  return response.json();
}

import type { DocumentExtractionResult } from "../types/case";

export async function extractPdf(file: File): Promise<DocumentExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/ingestion/extract-pdf`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to extract PDF (${response.status}): ${errorText}`);
  }

  return response.json();
}
export async function admitCase(payload: import("../types/case").AdmitCaseRequest): Promise<HistoricalCase> {
  const response = await fetch(`${API_BASE_URL}/ingestion/admit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to admit case (${response.status}): ${errorText}`);
  }

  return response.json();
}
