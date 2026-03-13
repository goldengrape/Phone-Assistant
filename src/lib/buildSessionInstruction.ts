import { DEFAULT_BASE_SESSION_PROMPT } from '../api/AIClient';
import type { SkillProfile } from '../skills/types';

type BuildSessionInstructionOptions = {
  callPurpose?: string;
  targetLanguage?: string;
  skill?: SkillProfile;
};

function formatBulletSection(title: string, items: string[]): string | null {
  const normalizedItems = items
    .map((item) => item.trim())
    .filter(Boolean);

  if (!normalizedItems.length) return null;
  return `${title}:\n- ${normalizedItems.join('\n- ')}`;
}

export function buildSkillInstruction(skill?: SkillProfile): string {
  if (!skill) return '';

  const sections = [
    `ACTIVE SKILL PROFILE: ${skill.name}`,
    `SKILL DESCRIPTION: ${skill.description.trim()}`,
    `SKILL OBJECTIVE: ${skill.objective.trim()}`,
    `SKILL TONE: ${skill.tone.trim()}`,
    formatBulletSection('FORBIDDEN BEHAVIORS', skill.forbiddenBehaviors),
    formatBulletSection('OPERATING STRATEGIES', skill.strategies),
    `OPENING STYLE: ${skill.openingStyle.trim()}`,
    `CLOSING STYLE: ${skill.closingStyle.trim()}`,
  ].filter(Boolean);

  return sections.join('\n\n');
}

export function buildSessionInstruction(options: BuildSessionInstructionOptions): string {
  const sections = [
    DEFAULT_BASE_SESSION_PROMPT,
    buildSkillInstruction(options.skill),
    options.callPurpose?.trim()
      ? `CALL PURPOSE: Your main goal and role for this call is: ${options.callPurpose.trim()}`
      : '',
    options.targetLanguage && options.targetLanguage !== 'Auto'
      ? `OUTPUT LANGUAGE CONSTRAINT: You MUST ALWAYS speak in ${options.targetLanguage}. Even if the user speaks another language, you must reply in ${options.targetLanguage}.`
      : '',
  ].filter(Boolean);

  return sections.join('\n\n');
}
