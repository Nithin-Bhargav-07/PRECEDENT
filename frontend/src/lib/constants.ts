/** Canonical ontology definitions and demo preset scenarios. */

import type { FactorCategoryID, FactorID, SchedulePressureLevel } from "../types/factors";

export interface CategoryInfo {
  id: FactorCategoryID;
  name: string;
  description: string;
}

export const FACTOR_CATEGORIES: CategoryInfo[] = [
  {
    id: "CAT_TECH",
    name: "Technical State",
    description: "Hardware, software, structural, and thermal margins",
  },
  {
    id: "CAT_ENV",
    name: "Decision Environment",
    description: "Launch window deadlines, weather, and operational pressure",
  },
  {
    id: "CAT_HUMAN",
    name: "Human Factors",
    description: "Communication hierarchy, dissent suppression, and unverified data",
  },
  {
    id: "CAT_PROCESS",
    name: "Process Quality",
    description: "Normalization of deviance and independent safety oversight",
  },
];

export interface FactorMeta {
  id: FactorID;
  categoryId: FactorCategoryID;
  label: string;
  diagnosticQuestion: string;
  description: string;
  isEnum?: boolean;
}

export const FACTOR_METADATA: FactorMeta[] = [
  {
    id: "known_unresolved_issue",
    categoryId: "CAT_TECH",
    label: "Known Unresolved Issue",
    diagnosticQuestion: "Is there a known, recurring, or unresolved hardware/software anomaly present in the system?",
    description: "Recurring defect with incomplete root cause resolution.",
  },
  {
    id: "safety_margin_degraded",
    categoryId: "CAT_TECH",
    label: "Safety Margin Degraded",
    diagnosticQuestion: "Is the system operating outside tested thermal, structural, or environmental safety margins?",
    description: "Operating envelope reduced or uncharacterized under current conditions.",
  },
  {
    id: "schedule_pressure",
    categoryId: "CAT_ENV",
    label: "Schedule Pressure",
    diagnosticQuestion: "Is there external launch window, commercial, or public schedule pressure influencing the review?",
    description: "External timeline urgency driving review tempo.",
    isEnum: true,
  },
  {
    id: "external_conditions_marginal",
    categoryId: "CAT_ENV",
    label: "External Conditions Marginal",
    diagnosticQuestion: "Are environmental conditions (ambient temp, sea state, space weather) near or outside design limits?",
    description: "Adverse environmental parameters near operational redlines.",
  },
  {
    id: "dissent_raised_and_overridden",
    categoryId: "CAT_HUMAN",
    label: "Dissent Raised and Overridden",
    diagnosticQuestion: "Did an engineering team, subsystem lead, or contractor raise formal or informal dissent that was overruled?",
    description: "Subsystem engineering concerns overruled by operational leadership.",
  },
  {
    id: "missing_evidence_acknowledged",
    categoryId: "CAT_HUMAN",
    label: "Missing Evidence Acknowledged",
    diagnosticQuestion: "Did the board acknowledge missing telemetry, inconclusive test data, or unproven assumptions but proceed anyway?",
    description: "Decisions made despite unverified engineering models or missing data.",
  },
  {
    id: "prior_normalization_of_risk",
    categoryId: "CAT_PROCESS",
    label: "Prior Normalization of Risk",
    diagnosticQuestion: "Has this identical or similar anomaly occurred on prior flights and been accepted as 'acceptable risk'?",
    description: "Previous anomaly survivability cited as proof of design margin.",
  },
  {
    id: "independent_review_skipped",
    categoryId: "CAT_PROCESS",
    label: "Independent Review Skipped",
    diagnosticQuestion: "Was an independent technical review, peer verification, or mandatory safety escalation bypassed or accelerated?",
    description: "Safety board escalation or peer verification bypassed.",
  },
];

export interface ScenarioPreset {
  id: string;
  name: string;
  missionContext: string;
  title: string;
  description: string;
  defaultFactors: Record<FactorID, boolean | SchedulePressureLevel>;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "challenger-analog",
    name: "SRB Joint Low-Temperature Launch Review",
    missionContext: "STS Flight Readiness Review (FRR) — Level III / Level IV",
    title: "Solid Rocket Booster O-Ring Low Temperature Launch Clearance",
    description:
      "During the pre-launch teleconference at Launch Complex 39B, forecasted overnight ambient temperature is 29°F, far below the demonstrated test limit of 53°F. Propulsion contractor engineers formally recommend NO LAUNCH due to primary O-ring resiliency data and documented blow-by on STS-51-C. NASA project managers contest the recommendation, demanding engineers prove the joint will fail. In an offline caucus, contractor management overrules engineering dissent to meet tight planetary launch windows, proceeding without low-temperature qualification data.",
    defaultFactors: {
      known_unresolved_issue: true,
      safety_margin_degraded: true,
      schedule_pressure: "HIGH",
      external_conditions_marginal: true,
      dissent_raised_and_overridden: true,
      missing_evidence_acknowledged: true,
      prior_normalization_of_risk: true,
      independent_review_skipped: true,
    },
  },
  {
    id: "columbia-analog",
    name: "On-Orbit Ascent Debris Damage Review",
    missionContext: "Mission Management Team (MMT) — Flight Day 5 Review",
    title: "External Tank Foam Strike Left Wing Leading Edge Assessment",
    description:
      "Review of high-speed launch video reveals a 1.7-pound block of External Tank bipod ramp foam struck the left wing leading edge Reinforced Carbon-Carbon (RCC) panel at ~500 mph. The Debris Assessment Team requested high-resolution Department of Defense satellite imagery to inspect the wing underside. Mission Management Team leadership dismissed the imagery request as unnecessary, relying solely on Crater simulation algorithm outputs known to be uncalibrated for large foam projectiles, citing schedule urgency for ISS Node 2 launch milestones.",
    defaultFactors: {
      known_unresolved_issue: true,
      safety_margin_degraded: true,
      schedule_pressure: "HIGH",
      external_conditions_marginal: false,
      dissent_raised_and_overridden: true,
      missing_evidence_acknowledged: true,
      prior_normalization_of_risk: true,
      independent_review_skipped: true,
    },
  },
  {
    id: "sts27-analog",
    name: "On-Orbit Thermal Tile Gouge Assessment",
    missionContext: "Orbiter Mission Control Flight Operations",
    title: "Thermal Protection Tile Damage On-Orbit Inspection",
    description:
      "Robotic arm survey reveals severe thermal tile damage across the right wing from SRB nose cone ablator shedding. Over 700 tiles sustained gouges, with one antenna mounting plate tile completely missing. The crew and ground flight directors engaged in open communication without hierarchy friction. Independent Air Force photo-analysts were brought in to verify steel plate structural thickness, enabling a conservative reentry trajectory profile and successful crew landing.",
    defaultFactors: {
      known_unresolved_issue: true,
      safety_margin_degraded: true,
      schedule_pressure: "LOW",
      external_conditions_marginal: false,
      dissent_raised_and_overridden: false,
      missing_evidence_acknowledged: true,
      prior_normalization_of_risk: true,
      independent_review_skipped: false,
    },
  },
  {
    id: "nominal-review",
    name: "Nominal Flight Readiness Checkout",
    missionContext: "Flight Readiness Review (FRR) — Subsystem Sign-Off",
    title: "Nominal Pre-Launch Subsystem Verification",
    description:
      "All propulsion, avionics, thermal protection, and life support systems report nominal telemetry during wet dress rehearsal. Operating margins are well within verified envelope, environmental conditions are within limits (68°F, 5 kt wind), and all independent safety verification checklists are complete with unanimous engineering concurrence.",
    defaultFactors: {
      known_unresolved_issue: false,
      safety_margin_degraded: false,
      schedule_pressure: "LOW",
      external_conditions_marginal: false,
      dissent_raised_and_overridden: false,
      missing_evidence_acknowledged: false,
      prior_normalization_of_risk: false,
      independent_review_skipped: false,
    },
  },
];
