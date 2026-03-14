import { skillProfiles } from './skills/registry';

export const CUSTOM_SKILL_ID = 'custom' as const;

export type SkillPreset = {
  id: string;
  label: string;
  summary: string;
  prompt: string;
};

export const skillPresets: SkillPreset[] = skillProfiles.map((profile) => ({
  id: profile.id,
  label: profile.name,
  summary: profile.description,
  prompt: profile.recommendedCallPurposeHint?.trim() || profile.objective.trim() || profile.description.trim(),
}));

export type SkillPresetId = typeof CUSTOM_SKILL_ID | string;

export const DEFAULT_SKILL_PRESET_ID: SkillPresetId = skillPresets[0]?.id || CUSTOM_SKILL_ID;
export const DEFAULT_CUSTOM_SKILL = '';

export function getSkillPresetById(id: string): SkillPreset | undefined {
  return skillPresets.find((preset) => preset.id === id);
}

export function isSkillPresetId(value: string | null): value is SkillPresetId {
  if (!value) {
    return false;
  }

  return value === CUSTOM_SKILL_ID || skillPresets.some((preset) => preset.id === value);
}
