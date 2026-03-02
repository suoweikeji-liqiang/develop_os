-- Add citations column to Requirement to track which KB chunks informed model generation
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]';
