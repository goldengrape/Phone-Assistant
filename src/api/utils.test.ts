import { describe, expect, it } from 'vitest';

import { base64ToInt16, int16ToBase64 } from './utils';

describe('audio base64 helpers', () => {
  it('round-trips a full Int16Array payload', () => {
    const original = new Int16Array([0, 1, -1, 1234, -2345, 32767, -32768]);

    const encoded = int16ToBase64(original);
    const decoded = base64ToInt16(encoded);

    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('only encodes the selected view when given a subarray', () => {
    const source = new Int16Array([100, 200, 300, 400]);
    const view = source.subarray(1, 3);

    const encoded = int16ToBase64(view);
    const decoded = base64ToInt16(encoded);

    expect(Array.from(decoded)).toEqual([200, 300]);
  });
});
