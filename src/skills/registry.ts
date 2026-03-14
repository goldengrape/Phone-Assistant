import negotiationSkill from '../../skills/negotiation/SKILL.md?raw';
import salesFollowUpSkill from '../../skills/sales-follow-up/SKILL.md?raw';
import deEscalationSkill from '../../skills/de-escalation/SKILL.md?raw';
import informationCollectionSkill from '../../skills/information-collection/SKILL.md?raw';
import schedulingSkill from '../../skills/scheduling/SKILL.md?raw';
import { parseSkillDocument } from './parseSkillDocument';
import type { SkillProfile } from './types';

export const skillProfiles = [
  parseSkillDocument('negotiation', negotiationSkill),
  parseSkillDocument('sales-follow-up', salesFollowUpSkill),
  parseSkillDocument('de-escalation', deEscalationSkill),
  parseSkillDocument('information-collection', informationCollectionSkill),
  parseSkillDocument('scheduling', schedulingSkill),
];

export function getSkillProfile(skillId: string): SkillProfile | undefined {
  return skillProfiles.find((skill) => skill.id === skillId);
}
