export interface SkillProfile {
  id: string;
  name: string;
  description: string;
  objective: string;
  tone: string;
  forbiddenBehaviors: string[];
  strategies: string[];
  openingStyle: string;
  closingStyle: string;
  recommendedCallPurposeHint?: string;
}
