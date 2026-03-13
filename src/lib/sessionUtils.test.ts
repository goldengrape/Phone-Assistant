import { describe, expect, it } from 'vitest';

import { estimateTokens, getPcmLevel, mergeTranscriptText } from './sessionUtils';

describe('mergeTranscriptText', () => {
  it('returns the incoming text when the previous text is empty', () => {
    expect(mergeTranscriptText('', 'hello there')).toBe('hello there');
  });

  it('keeps the longer text when the incoming text extends the preview', () => {
    expect(mergeTranscriptText('hello', 'hello there')).toBe('hello there');
  });

  it('merges overlapping transcript fragments without duplication', () => {
    expect(mergeTranscriptText('hello wor', 'world again')).toBe('hello world again');
  });

  it('adds a space when two unrelated fragments are concatenated', () => {
    expect(mergeTranscriptText('hello', 'again')).toBe('hello again');
  });
});

describe('estimateTokens', () => {
  it('returns zero for blank text', () => {
    expect(estimateTokens('   ')).toBe(0);
  });

  it('returns at least one token for non-empty text', () => {
    expect(estimateTokens('abc')).toBe(1);
  });

  it('rounds up based on the approximate chars-per-token heuristic', () => {
    expect(estimateTokens('123456789')).toBe(3);
  });
});

describe('getPcmLevel', () => {
  it('returns zero for an empty audio chunk', () => {
    expect(getPcmLevel(new Int16Array())).toBe(0);
  });

  it('returns a normalized level for non-silent audio', () => {
    const level = getPcmLevel(new Int16Array([16384, -16384]));
    expect(level).toBeGreaterThan(0);
    expect(level).toBeLessThanOrEqual(1);
  });

  it('clamps loud audio to one', () => {
    expect(getPcmLevel(new Int16Array([32767, -32768]))).toBe(1);
  });
});
