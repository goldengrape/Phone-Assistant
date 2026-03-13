import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('useAppStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('hydrates the target language from localStorage', async () => {
    localStorage.setItem('target_language', 'French');

    const { useAppStore } = await import('./useAppStore');

    expect(useAppStore.getState().language).toBe('French');
  });

  it('persists the target language when it changes', async () => {
    const { useAppStore } = await import('./useAppStore');

    useAppStore.getState().setLanguage('Spanish');

    expect(localStorage.getItem('target_language')).toBe('Spanish');
    expect(useAppStore.getState().language).toBe('Spanish');
  });

  it('hydrates the selected skill from localStorage', async () => {
    localStorage.setItem('selected_skill_id', 'negotiation');

    const { useAppStore } = await import('./useAppStore');

    expect(useAppStore.getState().selectedSkillId).toBe('negotiation');
  });

  it('persists the selected skill when it changes', async () => {
    const { useAppStore } = await import('./useAppStore');

    useAppStore.getState().setSelectedSkillId('scheduling');

    expect(localStorage.getItem('selected_skill_id')).toBe('scheduling');
    expect(useAppStore.getState().selectedSkillId).toBe('scheduling');
  });

  it('persists the call purpose when it changes', async () => {
    const { useAppStore } = await import('./useAppStore');

    useAppStore.getState().setCallPurpose('Collect contact details');

    expect(localStorage.getItem('call_purpose')).toBe('Collect contact details');
  });
});
