import { describe, expect, it } from 'vitest';

import { getSkillProfile, skillProfiles } from './registry';

describe('skill registry', () => {
  it('exposes the expected first-wave skill profiles', () => {
    expect(skillProfiles.map((skill) => skill.id)).toEqual([
      'negotiation',
      'sales-follow-up',
      'de-escalation',
      'information-collection',
      'scheduling',
    ]);
  });

  it('returns a profile by id', () => {
    expect(getSkillProfile('negotiation')?.name).toBe('Negotiation');
  });

  it('returns undefined for unknown ids', () => {
    expect(getSkillProfile('unknown-skill')).toBeUndefined();
  });
});
