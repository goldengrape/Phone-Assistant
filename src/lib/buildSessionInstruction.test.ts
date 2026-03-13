import { describe, expect, it } from 'vitest';

import { buildSessionInstruction, buildSkillInstruction } from './buildSessionInstruction';
import { getSkillProfile } from '../skills/registry';

describe('buildSkillInstruction', () => {
  it('returns an empty string when no skill is selected', () => {
    expect(buildSkillInstruction()).toBe('');
  });

  it('formats a structured prompt section for a skill profile', () => {
    const skill = getSkillProfile('negotiation');
    expect(skill).toBeTruthy();

    const instruction = buildSkillInstruction(skill);

    expect(instruction).toContain('ACTIVE SKILL PROFILE: Negotiation');
    expect(instruction).toContain('SKILL OBJECTIVE: Improve pricing, terms, or concessions');
    expect(instruction).toContain('FORBIDDEN BEHAVIORS:');
    expect(instruction).toContain('OPERATING STRATEGIES:');
    expect(instruction).toContain('OPENING STYLE:');
    expect(instruction).toContain('CLOSING STYLE:');
  });
});

describe('buildSessionInstruction', () => {
  it('builds the base phone policy with call purpose and language constraint', () => {
    const instruction = buildSessionInstruction({
      callPurpose: 'Collect account information',
      targetLanguage: 'Spanish',
    });

    expect(instruction).toContain('You are an intelligent AI Phone Assistant engaged in a continuous voice call');
    expect(instruction).toContain('CALL PURPOSE: Your main goal and role for this call is: Collect account information');
    expect(instruction).toContain('OUTPUT LANGUAGE CONSTRAINT: You MUST ALWAYS speak in Spanish.');
  });

  it('inserts the skill profile between the base policy and the call purpose', () => {
    const skill = getSkillProfile('information-collection');
    expect(skill).toBeTruthy();

    const instruction = buildSessionInstruction({
      skill,
      callPurpose: 'Confirm the caller name, account number, and address',
      targetLanguage: 'Auto',
    });

    const skillIndex = instruction.indexOf('ACTIVE SKILL PROFILE: Information Collection');
    const purposeIndex = instruction.indexOf('CALL PURPOSE: Your main goal and role for this call is: Confirm the caller name, account number, and address');

    expect(skillIndex).toBeGreaterThan(0);
    expect(purposeIndex).toBeGreaterThan(skillIndex);
    expect(instruction).not.toContain('OUTPUT LANGUAGE CONSTRAINT');
  });

  it('trims user-provided call purpose text', () => {
    const instruction = buildSessionInstruction({
      callPurpose: '   Reschedule the appointment politely.   ',
    });

    expect(instruction).toContain('CALL PURPOSE: Your main goal and role for this call is: Reschedule the appointment politely.');
  });
});
