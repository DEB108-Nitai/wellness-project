/**
 * Wellness 16 Personality Factors Platform - Type Definitions
 * Based on IPIP 16-Factor Model & PRD v1.0
 */

export type FactorCode =
  | 'A' | 'B' | 'C' | 'E' | 'F' | 'G' | 'H' | 'I'
  | 'L' | 'M' | 'N' | 'O' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface FactorDefinition {
  code: FactorCode;
  name: string;
  lowLabel: string;
  highLabel: string;
  shortDesc: string;
  detailedDesc: string;
  category: 'Interpersonal' | 'Emotional' | 'Cognitive' | 'Self-Regulation';
  lowPoleDesc: string;
  highPoleDesc: string;
  averagePoleDesc: string;
  workplaceImpact: string;
  sortOrder: number;
}
