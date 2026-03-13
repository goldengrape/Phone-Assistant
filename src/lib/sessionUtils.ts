const APPROX_CHARS_PER_TOKEN = 4;

export function mergeTranscriptText(previousText: string, incomingText: string): string {
  const previous = previousText.trim();
  const incoming = incomingText.trim();

  if (!incoming) return previous;
  if (!previous) return incoming;
  if (previous === incoming) return previous;
  if (incoming.startsWith(previous)) return incoming;
  if (previous.startsWith(incoming)) return previous;
  if (previous.includes(incoming)) return previous;

  let overlap = 0;
  const maxOverlap = Math.min(previous.length, incoming.length);
  for (let i = maxOverlap; i > 0; i--) {
    if (previous.slice(-i) === incoming.slice(0, i)) {
      overlap = i;
      break;
    }
  }

  if (overlap > 0) {
    return `${previous}${incoming.slice(overlap)}`;
  }

  const needsSpace = !previous.endsWith(' ') && !incoming.startsWith(' ');
  return `${previous}${needsSpace ? ' ' : ''}${incoming}`;
}

export function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / APPROX_CHARS_PER_TOKEN));
}

export function getPcmLevel(samples: Int16Array): number {
  if (!samples.length) return 0;

  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const normalized = samples[i] / 32768;
    sumSquares += normalized * normalized;
  }

  return Math.min(1, Math.sqrt(sumSquares / samples.length) * 6);
}
