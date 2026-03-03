import { z } from 'zod'

export const ConflictStatusSchema = z.enum(['OPEN', 'DISMISSED', 'RESOLVED'])
export const ConflictScopeSchema = z.enum(['INTERNAL', 'CROSS_REQUIREMENT'])
export const ConflictSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH'])

export const DetectedConflictSchema = z.object({
  scope: ConflictScopeSchema.describe('Whether this conflict is internal or cross-requirement'),
  severity: ConflictSeveritySchema.describe('Impact level if the conflict is left unresolved'),
  title: z.string().min(1).describe('Short conflict title'),
  summary: z.string().min(1).describe('One-paragraph explanation of the contradiction'),
  rationale: z.string().min(1).describe('Why these statements cannot both hold'),
  evidence: z.array(z.string().min(1)).min(1).max(4).describe('Concrete statements that demonstrate the conflict'),
  relatedRequirementId: z.string().optional().describe('Related requirement id for cross-requirement conflicts'),
  relatedRequirementTitle: z.string().optional().describe('Related requirement title for cross-requirement conflicts'),
  recommendedAction: z.string().min(1).describe('Pragmatic next step to resolve the conflict'),
})

export const ConflictDetectionResultSchema = z.object({
  conflicts: z.array(DetectedConflictSchema).describe('Material contradictions that should be reviewed'),
})

export type ConflictStatus = z.infer<typeof ConflictStatusSchema>
export type ConflictScope = z.infer<typeof ConflictScopeSchema>
export type ConflictSeverity = z.infer<typeof ConflictSeveritySchema>
export type DetectedConflict = z.infer<typeof DetectedConflictSchema>
export type ConflictDetectionResult = z.infer<typeof ConflictDetectionResultSchema>
