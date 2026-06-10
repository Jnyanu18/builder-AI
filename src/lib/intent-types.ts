// Shared schemas/types for IntentOS — safe to import from client and server.
import { z } from "zod";

export const PersonaSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(""),
});

export const FeatureSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(""),
  priority: z.enum(["must", "should", "could"]).optional().default("must"),
});

export const NonFuncSchema = z.object({
  category: z.string(),
  requirement: z.string(),
});

export const ArchitectureSchema = z.object({
  frontend: z.string().optional().default(""),
  backend: z.string().optional().default(""),
  database: z.string().optional().default(""),
  infrastructure: z.string().optional().default(""),
  pattern: z.string().optional().default(""),
});

export const ConstraintSchema = z.object({
  rule: z.string(),
  rationale: z.string().optional().default(""),
});

export const MilestoneSchema = z.object({
  name: z.string(),
  target_date: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

export const MetricSchema = z.object({
  name: z.string(),
  target: z.string().optional().default(""),
});

export const BlueprintDraftSchema = z.object({
  vision: z.string(),
  personas: z.array(PersonaSchema),
  functional_reqs: z.array(FeatureSchema),
  nonfunctional_reqs: z.array(NonFuncSchema),
  architecture: ArchitectureSchema,
  constraints: z.array(ConstraintSchema),
  milestones: z.array(MilestoneSchema),
  success_metrics: z.array(MetricSchema),
});

export type BlueprintDraft = z.infer<typeof BlueprintDraftSchema>;

export const RealityModelSchema = z.object({
  frontend: z.string(),
  backend: z.string(),
  database: z.string(),
  infrastructure: z.array(z.string()),
  dependencies: z.array(z.string()),
  services: z.array(z.string()),
  api_routes: z.array(z.string()),
  features: z.array(z.string()),
  summary: z.string(),
});

export type RealityModel = z.infer<typeof RealityModelSchema>;

export const SeverityEnum = z.enum(["low", "medium", "high", "critical"]);
export const CategoryEnum = z.enum(["feature", "architecture", "technology", "scope"]);
export const FindingTypeEnum = z.enum(["missing", "unexpected", "partial", "violation"]);

export const FindingSchema = z.object({
  category: CategoryEnum,
  type: FindingTypeEnum,
  title: z.string(),
  description: z.string(),
  severity: SeverityEnum,
  evidence: z.string(),
});

export type Finding = z.infer<typeof FindingSchema>;

export const DriftReportSchema = z.object({
  alignment_score: z.number().min(0).max(100),
  drift_score: z.number().min(0).max(100),
  feature_coverage: z.object({
    implemented: z.number(),
    total: z.number(),
  }),
  findings: z.array(FindingSchema),
  summary: z.string(),
});

export type DriftReport = z.infer<typeof DriftReportSchema>;

export const EMPTY_BLUEPRINT: BlueprintDraft = {
  vision: "",
  personas: [],
  functional_reqs: [],
  nonfunctional_reqs: [],
  architecture: { frontend: "", backend: "", database: "", infrastructure: "", pattern: "" },
  constraints: [],
  milestones: [],
  success_metrics: [],
};
