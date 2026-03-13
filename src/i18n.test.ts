import { describe, expect, it } from 'vitest';

import { resolveLocale } from './i18n';

describe('resolveLocale', () => {
  it('returns the explicit UI language when auto is not selected', () => {
    expect(resolveLocale('ja', 'en-US')).toBe('ja');
  });

  it('maps browser Chinese locales to zh', () => {
    expect(resolveLocale('auto', 'zh-TW')).toBe('zh');
  });

  it('maps browser French locales to fr', () => {
    expect(resolveLocale('auto', 'fr-CA')).toBe('fr');
  });

  it('falls back to English for unsupported browser locales', () => {
    expect(resolveLocale('auto', 'pt-BR')).toBe('en');
  });
});
