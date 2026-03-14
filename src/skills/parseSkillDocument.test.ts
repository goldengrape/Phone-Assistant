import { describe, expect, it } from 'vitest';

import negotiationSkill from '../../skills/negotiation/SKILL.md?raw';
import { parseSkillDocument } from './parseSkillDocument';

describe('parseSkillDocument', () => {
  it('parses a SKILL.md file into a runtime skill profile', () => {
    const skill = parseSkillDocument('negotiation', negotiationSkill);

    expect(skill.id).toBe('negotiation');
    expect(skill.name).toBe('Negotiation');
    expect(skill.description).toContain('improve pricing, terms, or concessions');
    expect(skill.objective).toContain('Improve pricing, terms, or concessions');
    expect(skill.tone).toContain('Calm, commercially aware');
    expect(skill.forbiddenBehaviors).toHaveLength(3);
    expect(skill.strategies).toHaveLength(4);
    expect(skill.recommendedCallPurposeHint).toContain('Negotiate a better price');
  });
});
